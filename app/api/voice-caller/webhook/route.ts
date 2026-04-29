import { NextResponse } from "next/server";
import {
  getCall,
  removeCall,
  updateCall,
} from "@/lib/voiceCallerCallRegistry";
import {
  getCallLogBySid,
  logCallRecord,
} from "@/lib/voiceCallerConvex";

export const runtime = "nodejs";

/**
 * Twilio call status webhook. Receives transitions (ringing, answered,
 * completed, etc). For `completed`, we ensure a CallLog exists and that
 * finalization happened (mostly it does inside the stream engine).
 */
export async function POST(req: Request) {
  let params: Record<string, string> = {};
  try {
    const form = await req.formData();
    form.forEach((value, key) => {
      params[key] = typeof value === "string" ? value : "";
    });
  } catch {
    try {
      const json = (await req.json()) as Record<string, string>;
      params = json;
    } catch {
      /* ignore */
    }
  }

  const callSid = params.CallSid || "";
  const callStatus = params.CallStatus || "";

  if (!callSid) return NextResponse.json({ ok: true });

  if (callStatus === "completed" || callStatus === "failed" || callStatus === "no-answer") {
    const state = getCall(callSid);
    if (state && !state.finalized) {
      try {
        const existing = await getCallLogBySid(callSid);
        if (!existing) {
          const outcome =
            callStatus === "failed"
              ? "failed"
              : callStatus === "no-answer"
                ? "no_answer"
                : state.qualScore >= 4
                  ? "qualified"
                  : "not_qualified";
          await logCallRecord({
            campaignId: state.campaignId,
            clientId: state.clientId,
            leadPhone: state.leadPhone,
            leadName: state.leadName,
            outcome,
            qualScore: state.qualScore,
            signals: state.signals,
            transcript: state.transcript,
            callSid,
          });
        }
        updateCall(callSid, { finalized: true });
      } catch (error) {
        console.error("[voice-caller/webhook] finalize fallback failed", error);
      }
    }

    // Keep finalized entries around briefly so UI polling can still read them.
    setTimeout(() => removeCall(callSid), 60_000);
  }

  return NextResponse.json({ ok: true });
}

// Twilio sometimes sends GET for URL validation.
export const GET = POST;
