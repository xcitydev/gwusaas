import { NextResponse } from "next/server";
import { z } from "zod";
import twilio from "twilio";
import { requireVoiceCallerAccess } from "@/lib/voiceCallerGate";
import { getCampaign, updateCampaignStatus } from "@/lib/voiceCallerConvex";
import { launchVapiCampaign } from "@/lib/voiceCallerVapiLauncher";
import type { VapiCallType } from "@/lib/vapiClient";

export const runtime = "nodejs";

const leadSchema = z.object({
  phone: z.string().min(1),
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().optional(),
});

const bodySchema = z.object({
  campaignId: z.string().min(1),
  clientId: z.string().min(1),
  callType: z.enum(["live", "voicemail"]),
  leads: z.array(leadSchema).min(1),
  // audioUrl is required for the legacy voicemail/live-playback flow but
  // not for Vapi (assistant generates audio in real time).
  audioUrl: z.string().url().optional(),
  voiceId: z.string().optional(),
  scriptText: z.string().optional(),
});

type LaunchResult = {
  phone: string;
  name: string;
  ok: boolean;
  sid?: string;
  error?: string;
};

async function launchVoicemail(
  lead: z.infer<typeof leadSchema>,
  audioUrl: string,
): Promise<LaunchResult> {
  const user = process.env.SLYBROADCAST_USER;
  const pass = process.env.SLYBROADCAST_PASS;
  if (!user || !pass) {
    return { phone: lead.phone, name: lead.name, ok: false, error: "Slybroadcast not configured" };
  }

  const body = new URLSearchParams({
    c_uid: user,
    c_password: pass,
    c_phone: lead.phone,
    c_url: audioUrl,
    c_callerID: process.env.TWILIO_PHONE_NUMBER || "",
    c_date: "now",
    mobile_only: "0",
  });

  try {
    const res = await fetch("https://www.slybroadcast.com/gateway/vmsservice.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const text = await res.text();
    if (!res.ok || /ERROR/i.test(text)) {
      return {
        phone: lead.phone,
        name: lead.name,
        ok: false,
        error: `Slybroadcast: ${text.slice(0, 200)}`,
      };
    }
    return { phone: lead.phone, name: lead.name, ok: true };
  } catch (error) {
    return {
      phone: lead.phone,
      name: lead.name,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function launchLivePlayback(
  lead: z.infer<typeof leadSchema>,
  audioUrl: string,
  client: ReturnType<typeof twilio>,
  baseUrl: string,
  from: string,
): Promise<LaunchResult> {
  try {
    const call = await client.calls.create({
      to: lead.phone,
      from,
      url: `${baseUrl}/api/voice-caller/twiml?audioUrl=${encodeURIComponent(audioUrl)}`,
      statusCallback: `${baseUrl}/api/voice-caller/webhook`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    });
    return { phone: lead.phone, name: lead.name, ok: true, sid: call.sid };
  } catch (error) {
    return {
      phone: lead.phone,
      name: lead.name,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function POST(req: Request) {
  const guard = await requireVoiceCallerAccess();
  if (!guard.ok) return guard.response;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid body", details: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }

  if (body.clientId !== guard.userId) {
    return NextResponse.json({ error: "clientId mismatch" }, { status: 403 });
  }

  // Look up the campaign to discover provider + saved script/voice.
  const campaign = await getCampaign(body.campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.clientId !== guard.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const provider = campaign.provider ?? "internal";

  // ─── Vapi path ───
  if (provider === "vapi") {
    const outcome = await launchVapiCampaign({
      campaignId: body.campaignId,
      clientId: guard.userId,
      voiceId: campaign.voiceId,
      scriptText: campaign.scriptText,
      callType: campaign.callType as VapiCallType,
      leads: body.leads,
    });

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }

    try {
      await updateCampaignStatus(body.campaignId, "running");
    } catch (error) {
      console.warn("[voice-caller/launch] updateCampaignStatus failed", {
        campaignId: body.campaignId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const okCount = outcome.results.filter((r) => r.ok).length;
    return NextResponse.json({
      launched: okCount > 0,
      count: okCount,
      total: outcome.results.length,
      provider: "vapi",
      results: outcome.results,
    });
  }

  // ─── Internal (Twilio + Slybroadcast) path ───
  if (!body.audioUrl) {
    return NextResponse.json(
      { error: "audioUrl is required for the internal calling engine" },
      { status: 400 },
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (body.callType === "live" && (!twilioSid || !twilioToken || !twilioFrom || !baseUrl)) {
    return NextResponse.json(
      {
        error:
          "Twilio is not fully configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, NEXT_PUBLIC_BASE_URL)",
      },
      { status: 500 },
    );
  }

  const results: LaunchResult[] = [];

  if (body.callType === "voicemail") {
    for (const lead of body.leads) {
      results.push(await launchVoicemail(lead, body.audioUrl));
    }
  } else {
    const client = twilio(twilioSid!, twilioToken!);
    for (const lead of body.leads) {
      results.push(
        await launchLivePlayback(lead, body.audioUrl, client, baseUrl, twilioFrom!),
      );
    }
  }

  try {
    await updateCampaignStatus(body.campaignId, "running");
  } catch (error) {
    console.warn("[voice-caller/launch] updateCampaignStatus failed", {
      campaignId: body.campaignId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    launched: okCount > 0,
    count: okCount,
    total: results.length,
    provider: "internal",
    results,
  });
}
