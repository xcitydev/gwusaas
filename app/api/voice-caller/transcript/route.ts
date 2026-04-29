import { NextResponse } from "next/server";
import { requireVoiceCallerAccess } from "@/lib/voiceCallerGate";
import {
  getCall,
  getCallByCampaign,
} from "@/lib/voiceCallerCallRegistry";
import { getCampaignCallLogs } from "@/lib/voiceCallerConvex";

export const runtime = "nodejs";

/**
 * Live transcript polling endpoint.
 *
 * Query params (one of):
 *   - callSid: returns the in-memory live state for that call
 *   - campaignId: returns the latest live call state for the campaign,
 *                 falling back to the most recent CallLog if no live call
 *                 is in progress.
 */
export async function GET(req: Request) {
  const guard = await requireVoiceCallerAccess();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const callSid = url.searchParams.get("callSid");
  const campaignId = url.searchParams.get("campaignId");

  if (callSid) {
    const state = getCall(callSid);
    if (!state) return NextResponse.json({ live: false, state: null });
    if (state.clientId !== "unknown" && state.clientId !== guard.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ live: !state.finalized, state });
  }

  if (campaignId) {
    const liveState = getCallByCampaign(campaignId);
    if (liveState) {
      if (liveState.clientId !== "unknown" && liveState.clientId !== guard.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ live: true, state: liveState });
    }
    try {
      const logs = await getCampaignCallLogs(campaignId);
      const latest = logs[0] ?? null;
      if (latest && latest.clientId !== guard.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ live: false, state: latest });
    } catch (error) {
      return NextResponse.json(
        {
          error: `Failed to load call log: ${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Provide callSid or campaignId" }, { status: 400 });
}
