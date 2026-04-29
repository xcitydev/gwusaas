import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVoiceCallerAccess } from "@/lib/voiceCallerGate";
import {
  createCampaignRecord,
  listCampaigns,
} from "@/lib/voiceCallerConvex";

export const runtime = "nodejs";

const leadSchema = z.object({
  phone: z.string().min(1),
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().optional(),
});

const bodySchema = z.object({
  voiceId: z.string().min(1),
  scriptText: z.string().min(1),
  callType: z.enum(["live", "voicemail"]),
  leads: z.array(leadSchema).min(1),
  provider: z.enum(["internal", "vapi"]).optional(),
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

  try {
    const campaignId = await createCampaignRecord({
      clientId: guard.userId,
      voiceId: body.voiceId,
      scriptText: body.scriptText,
      callType: body.callType,
      leads: body.leads,
      provider: body.provider,
    });
    return NextResponse.json({ campaignId });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to create campaign: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const guard = await requireVoiceCallerAccess();
  if (!guard.ok) return guard.response;

  try {
    const campaigns = await listCampaigns(guard.userId);
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to list campaigns: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
}
