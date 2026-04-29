import { NextResponse } from "next/server";
import { z } from "zod";
import twilio from "twilio";
import { requireVoiceCallerAccess } from "@/lib/voiceCallerGate";
import { registerCall } from "@/lib/voiceCallerCallRegistry";
import { getCampaign } from "@/lib/voiceCallerConvex";
import { launchVapiCampaign } from "@/lib/voiceCallerVapiLauncher";
import type { VapiCallType } from "@/lib/vapiClient";

export const runtime = "nodejs";

const bodySchema = z.object({
  leadPhone: z.string().min(1),
  leadName: z.string().min(1),
  campaignId: z.string().min(1),
  clientId: z.string().min(1),
  voiceId: z.string().min(1),
  scriptText: z.string().min(1),
});

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

  // Look up the campaign so we can route to the right calling engine.
  const campaign = await getCampaign(body.campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.clientId !== guard.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const provider = campaign.provider ?? "internal";

  // ─── Vapi single-lead dial ───
  if (provider === "vapi") {
    const outcome = await launchVapiCampaign({
      campaignId: body.campaignId,
      clientId: guard.userId,
      voiceId: body.voiceId,
      scriptText: body.scriptText,
      callType: (campaign.callType as VapiCallType) ?? "live",
      leads: [{ phone: body.leadPhone, name: body.leadName }],
    });

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }
    const first = outcome.results[0];
    if (!first?.ok || !first.vapiCallId) {
      return NextResponse.json(
        { error: first?.error || "Vapi call failed" },
        { status: 502 },
      );
    }

    // Reuse the callSid field on the response so the dashboard's existing
    // toast ("Live call dialing: …") still has something useful to show.
    return NextResponse.json({ callSid: first.vapiCallId, provider: "vapi" });
  }

  // ─── Internal Twilio path ───
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!sid || !token || !from || !baseUrl) {
    return NextResponse.json(
      {
        error:
          "Twilio is not fully configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, NEXT_PUBLIC_BASE_URL)",
      },
      { status: 500 },
    );
  }

  const client = twilio(sid, token);

  const twimlUrl = new URL(`${baseUrl}/api/voice-caller/live-call/twiml`);
  twimlUrl.searchParams.set("campaignId", body.campaignId);
  twimlUrl.searchParams.set("voiceId", body.voiceId);
  twimlUrl.searchParams.set("leadName", body.leadName);

  try {
    const call = await client.calls.create({
      to: body.leadPhone,
      from,
      url: twimlUrl.toString(),
      statusCallback: `${baseUrl}/api/voice-caller/webhook`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    });

    registerCall({
      callSid: call.sid,
      campaignId: body.campaignId,
      clientId: body.clientId,
      voiceId: body.voiceId,
      leadName: body.leadName,
      leadPhone: body.leadPhone,
      scriptText: body.scriptText,
    });

    return NextResponse.json({ callSid: call.sid, provider: "internal" });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Twilio call failed: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 502 },
    );
  }
}
