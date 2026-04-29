import { NextResponse } from "next/server";
import {
  getCallLogByVapiId,
  upsertVapiCallLog,
} from "@/lib/voiceCallerConvex";
import { verifyVapiWebhook } from "@/lib/vapiClient";
import type {
  CallOutcome,
  QualSignals,
  TranscriptLine,
} from "@/types/voiceCaller";

export const runtime = "nodejs";

/**
 * Vapi server webhook.
 *
 * Configure in the Vapi dashboard (Phone Numbers → your number → Server URL,
 * or per-assistant Server URL) to point at:
 *   https://<your-domain>/api/voice-caller/vapi/webhook
 *
 * We handle these message types:
 *   - "status-update"        : call lifecycle (ringing / in-progress / ended)
 *   - "transcript"           : streamed transcript lines (final only)
 *   - "end-of-call-report"   : final summary + recording + ended reason
 */

type VapiMessage = {
  type?: string;
  status?: string;
  endedReason?: string;
  transcript?: string;
  transcriptType?: "partial" | "final";
  role?: "user" | "assistant" | "system" | "bot";
  summary?: string;
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  duration?: number;
  durationSeconds?: number;
  durationMs?: number;
  messages?: Array<{
    role?: string;
    message?: string;
    content?: string;
    time?: number;
  }>;
  artifact?: {
    transcript?: string;
    messages?: Array<{ role?: string; message?: string; content?: string; time?: number }>;
    recordingUrl?: string;
  };
  analysis?: {
    summary?: string;
    successEvaluation?: string | boolean | number;
  };
  call?: {
    id?: string;
    phoneCallProviderId?: string;
    metadata?: Record<string, unknown>;
    customer?: { number?: string; name?: string };
  };
  metadata?: Record<string, unknown>;
};

type VapiWebhookBody = {
  message?: VapiMessage;
};

const KEYWORD_SIGNALS: Array<{ key: keyof QualSignals; pattern: RegExp }> = [
  { key: "budget", pattern: /\b(budget|invest|invest(ed|ing)?|spend|spending|cost|price|\$|usd)\b/i },
  { key: "decision", pattern: /\b(owner|founder|ceo|cmo|director|head of|decision|i decide|i'?m the)\b/i },
  { key: "problem", pattern: /\b(struggle|struggling|problem|pain|hurt|need|stuck|inconsistent|bleeding|losing)\b/i },
  { key: "booked", pattern: /\b(book(ed|ing)?|schedule|calendar|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|invite|zoom|meeting)\b/i },
];

function scoreFromText(text: string): { signals: QualSignals; qualScore: number } {
  const signals: QualSignals = {
    budget: false,
    decision: false,
    problem: false,
    booked: false,
  };
  for (const { key, pattern } of KEYWORD_SIGNALS) {
    if (pattern.test(text)) signals[key] = true;
  }
  const qualScore = Object.values(signals).filter(Boolean).length;
  return { signals, qualScore };
}

function outcomeFromEndedReason(
  endedReason: string | undefined,
  qualScore: number,
): CallOutcome {
  if (!endedReason) return qualScore >= 3 ? "qualified" : "not_qualified";
  const reason = endedReason.toLowerCase();
  if (reason.includes("did-not-answer") || reason.includes("no-answer")) {
    return "no_answer";
  }
  if (reason.includes("voicemail")) return "no_answer";
  if (
    reason.includes("failed") ||
    reason.includes("error") ||
    reason.includes("rejected") ||
    reason.includes("busy")
  ) {
    return "failed";
  }
  return qualScore >= 3 ? "qualified" : "not_qualified";
}

function roleToTranscriptRole(role: string | undefined): "agent" | "lead" {
  const r = (role || "").toLowerCase();
  if (r === "user" || r === "customer" || r === "lead") return "lead";
  return "agent";
}

function buildTranscriptLines(message: VapiMessage): TranscriptLine[] {
  const arr =
    message.messages ??
    message.artifact?.messages ??
    [];
  return arr
    .map((m) => {
      const text = (m.message ?? m.content ?? "").trim();
      if (!text) return null;
      return {
        role: roleToTranscriptRole(m.role),
        text,
        ts: m.time ? new Date(m.time).toISOString() : new Date().toISOString(),
      } as TranscriptLine;
    })
    .filter((l): l is TranscriptLine => Boolean(l));
}

function readMetadata(message: VapiMessage): {
  campaignId?: string;
  clientId?: string;
  leadName?: string;
  leadPhone?: string;
} {
  const meta = (message.call?.metadata ?? message.metadata ?? {}) as Record<string, unknown>;
  return {
    campaignId: typeof meta.campaignId === "string" ? meta.campaignId : undefined,
    clientId: typeof meta.clientId === "string" ? meta.clientId : undefined,
    leadName: typeof meta.leadName === "string" ? meta.leadName : undefined,
    leadPhone:
      typeof meta.leadPhone === "string"
        ? meta.leadPhone
        : message.call?.customer?.number,
  };
}

function formatDuration(message: VapiMessage): string | undefined {
  const seconds =
    message.durationSeconds ??
    message.duration ??
    (message.durationMs ? Math.round(message.durationMs / 1000) : undefined);
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return undefined;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function POST(req: Request) {
  if (!verifyVapiWebhook(req.headers)) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  let body: VapiWebhookBody;
  try {
    body = (await req.json()) as VapiWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = body.message;
  if (!message) return NextResponse.json({ ok: true });

  const vapiCallId = message.call?.id;
  if (!vapiCallId) return NextResponse.json({ ok: true });

  const meta = readMetadata(message);

  // We need at least the campaign + client + phone to write a log.
  // If those are missing, fall back to the existing log seeded at launch.
  const existing = await getCallLogByVapiId(vapiCallId);
  const campaignId = meta.campaignId ?? existing?.campaignId;
  const clientId = meta.clientId ?? existing?.clientId;
  const leadPhone = meta.leadPhone ?? existing?.leadPhone;
  const leadName = meta.leadName ?? existing?.leadName;

  if (!campaignId || !clientId || !leadPhone || !leadName) {
    console.warn("[voice-caller/vapi/webhook] missing metadata", {
      type: message.type,
      vapiCallId,
    });
    return NextResponse.json({ ok: true });
  }

  switch (message.type) {
    case "status-update": {
      const status = (message.status || "").toLowerCase();
      const ended = status === "ended";
      const outcome: CallOutcome | undefined = ended
        ? outcomeFromEndedReason(message.endedReason, existing?.qualScore ?? 0)
        : undefined;
      try {
        await upsertVapiCallLog({
          campaignId,
          clientId,
          leadPhone,
          leadName,
          vapiCallId,
          outcome,
        });
      } catch (error) {
        console.error("[voice-caller/vapi/webhook] status-update upsert failed", error);
      }
      return NextResponse.json({ ok: true });
    }

    case "transcript": {
      // Vapi streams partial + final transcripts; we only persist final lines.
      if (message.transcriptType && message.transcriptType !== "final") {
        return NextResponse.json({ ok: true });
      }
      const text = (message.transcript || "").trim();
      if (!text) return NextResponse.json({ ok: true });

      const newLine: TranscriptLine = {
        role: roleToTranscriptRole(message.role),
        text,
        ts: new Date().toISOString(),
      };
      const transcript = [...(existing?.transcript ?? []), newLine];
      const combined = transcript.map((l) => l.text).join(" ");
      const { signals, qualScore } = scoreFromText(combined);

      try {
        await upsertVapiCallLog({
          campaignId,
          clientId,
          leadPhone,
          leadName,
          vapiCallId,
          transcript,
          signals,
          qualScore,
        });
      } catch (error) {
        console.error("[voice-caller/vapi/webhook] transcript upsert failed", error);
      }
      return NextResponse.json({ ok: true });
    }

    case "end-of-call-report": {
      const built = buildTranscriptLines(message);
      const transcript = built.length > 0 ? built : existing?.transcript ?? [];
      const fullText =
        message.artifact?.transcript ||
        message.transcript ||
        transcript.map((l) => l.text).join(" ");
      const { signals, qualScore } = scoreFromText(fullText || "");
      const outcome = outcomeFromEndedReason(message.endedReason, qualScore);
      const recordingUrl =
        message.artifact?.recordingUrl ||
        message.recordingUrl ||
        message.stereoRecordingUrl;
      const summary = message.analysis?.summary ?? message.summary;
      const duration = formatDuration(message);

      try {
        await upsertVapiCallLog({
          campaignId,
          clientId,
          leadPhone,
          leadName,
          vapiCallId,
          transcript,
          signals,
          qualScore,
          outcome,
          summary,
          duration,
          recordingUrl,
        });
      } catch (error) {
        console.error("[voice-caller/vapi/webhook] end-of-call upsert failed", error);
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ ok: true });
  }
}

// Vapi may issue a GET for URL validation when you set the server URL.
export async function GET() {
  return NextResponse.json({ ok: true });
}
