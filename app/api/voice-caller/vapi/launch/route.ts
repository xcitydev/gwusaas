import { NextResponse } from "next/server";
import { z } from "zod";
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
  /** Optional override; otherwise we use the campaign's saved leads. */
  leads: z.array(leadSchema).optional(),
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

  const campaign = await getCampaign(body.campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.clientId !== guard.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const outcome = await launchVapiCampaign({
    campaignId: body.campaignId,
    clientId: guard.userId,
    voiceId: campaign.voiceId,
    scriptText: campaign.scriptText,
    callType: campaign.callType as VapiCallType,
    leads: body.leads ?? campaign.leads,
  });

  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  try {
    await updateCampaignStatus(body.campaignId, "running");
  } catch (error) {
    console.warn("[voice-caller/vapi/launch] updateCampaignStatus failed", {
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
