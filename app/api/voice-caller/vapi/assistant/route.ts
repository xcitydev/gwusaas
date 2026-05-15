import { NextResponse } from "next/server";
import { requireVoiceCallerAccess } from "@/lib/voiceCallerGate";

export const runtime = "nodejs";

/**
 * Pre-flight for the browser Vapi tab. Given an assistantId, fetch it from
 * the Vapi API server-side using the private key and return a sanitized
 * description so the client can confirm the assistant exists and is
 * usable before asking the Web SDK to start a call with it. Catches the
 * "Meeting ended due to ejection" failure mode where the public key is fine
 * but the assistant is broken/missing/permission-blocked.
 *
 * Never returns secret material — only the fields the client needs to
 * understand whether the assistant is healthy.
 */

const VAPI_BASE = "https://api.vapi.ai";

type VapiAssistant = {
  id?: string;
  name?: string;
  model?: { provider?: string; model?: string };
  voice?: { provider?: string; voiceId?: string };
  transcriber?: { provider?: string; model?: string };
  firstMessage?: string;
  orgId?: string;
};

export async function GET(req: Request): Promise<NextResponse> {
  const guard = await requireVoiceCallerAccess();
  if (!guard.ok) return guard.response;

  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "VAPI_API_KEY not configured on the server" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const assistantId = (url.searchParams.get("id") ?? "").trim();
  if (!assistantId) {
    return NextResponse.json(
      { ok: false, error: "Missing assistantId in ?id=" },
      { status: 400 },
    );
  }

  try {
    const r = await fetch(`${VAPI_BASE}/assistant/${assistantId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        {
          ok: false,
          error: `Vapi returned ${r.status} for assistant ${assistantId}`,
          details: text.slice(0, 400),
          hint:
            r.status === 404
              ? "Assistant ID doesn't exist in this org. Re-copy from the top of the assistant page in Vapi dashboard."
              : r.status === 403
                ? "Assistant exists but the server key isn't allowed to read it (permission/role issue)."
                : "Check the assistant in the Vapi dashboard.",
        },
        { status: 200 },
      );
    }
    const a = (await r.json()) as VapiAssistant;
    return NextResponse.json({
      ok: true,
      assistant: {
        id: a.id,
        name: a.name,
        firstMessage: a.firstMessage,
        model: a.model,
        voice: a.voice,
        transcriber: a.transcriber,
        orgId: a.orgId,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 200 },
    );
  }
}
