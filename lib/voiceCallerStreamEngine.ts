/**
 * Voice-caller live stream engine.
 *
 * This module is deliberately transport-agnostic: it doesn't depend on Next.js,
 * ws, or any specific WebSocket library. You plug it into any WebSocket server
 * (custom Node process, dedicated service, etc.) by wiring `handleTwilioSocket`
 * to the server's connection events.
 *
 * Why a standalone engine?
 *   Next.js App Router routes cannot terminate WebSocket upgrades. The expected
 *   runtime for this engine is a tiny Node process alongside the Next.js app
 *   (e.g. `node server.js`) that exposes `/api/voice-caller/live-call/stream`
 *   and delegates to this module.
 *
 * Flow:
 *   1. Twilio Media Stream opens a WS.
 *   2. `start` event delivers streamSid + customParameters (campaignId,
 *      voiceId, leadName).
 *   3. Inbound `media` events carry raw mulaw/8k audio → forward to Deepgram.
 *   4. Deepgram `is_final` transcripts → pass to Claude → parse [SIGNAL] tags.
 *   5. Claude response text → ElevenLabs TTS → stream mulaw frames back to
 *      Twilio in base64 `media` events.
 *   6. `stop` event → summarize via Claude, log to Convex, fire automations.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  appendTranscript,
  computeQualScore,
  getCall,
  getCallByCampaign,
  registerCall,
  removeCall,
  updateCall,
  type LiveCallState,
} from "@/lib/voiceCallerCallRegistry";
import { logCallRecord, getCampaign } from "@/lib/voiceCallerConvex";
import { triggerPostCallAutomations } from "@/lib/voiceCallerAutomations";
import type {
  CallOutcome,
  QualSignals,
  ScriptStage,
  TranscriptLine,
} from "@/types/voiceCaller";

// Minimal duck-typed WS interface — compatible with `ws` and browser WebSocket.
export type WSLike = {
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  close(): void;
  on?(event: "message", listener: (data: unknown) => void): void;
  on?(event: "close", listener: () => void): void;
  addEventListener?(event: "message", listener: (e: { data: unknown }) => void): void;
  addEventListener?(event: "close", listener: () => void): void;
};

type TwilioInbound =
  | { event: "connected" }
  | {
      event: "start";
      start: {
        streamSid: string;
        callSid: string;
        customParameters?: Record<string, string>;
      };
    }
  | { event: "media"; media: { payload: string; timestamp: string } }
  | { event: "mark"; mark: { name: string } }
  | { event: "stop" };

const STAGE_ORDER: ScriptStage[] = [
  "opener",
  "pain",
  "budget",
  "authority",
  "cta",
  "done",
];

const CLAUDE_SYSTEM = (state: LiveCallState) =>
  `You are a sales qualifier AI named Jordan, calling on behalf of a digital marketing agency. You are speaking using a cloned voice — sound natural, conversational, and human.

Your goal is to qualify this lead using this script progression:
STAGE 1 (opener): Greet by first name, ask for 90 seconds
STAGE 2 (pain): Ask if inconsistent lead gen is a problem for them
STAGE 3 (budget): Ask ballpark monthly software spend
STAGE 4 (authority): Confirm they make the buying decision
STAGE 5 (cta): Offer Thursday 2pm or Friday 10am for a 20-min demo

RULES:
- Always move through stages in order — but respond naturally to anything said before advancing
- If they object: handle it warmly and pivot back to the script
- Keep every response under 2 sentences
- Never break character
- Detect and tag these signals in your response using brackets:
  [BUDGET_CONFIRMED] — if they confirm a budget of $300+/mo
  [DECISION_MAKER] — if they confirm buying authority
  [PROBLEM_CONFIRMED] — if they confirm the pain point
  [BOOKED] — if they agree to a specific meeting time
- After tagging, respond with only the clean spoken text — no brackets in the audio

Current lead name: ${state.leadName}
Current script stage: ${state.scriptStage}
Signals so far: ${JSON.stringify(state.signals)}`;

function parseSignalsFromReply(raw: string): { cleanText: string; newSignals: Partial<QualSignals> } {
  const newSignals: Partial<QualSignals> = {};
  if (/\[BUDGET_CONFIRMED\]/i.test(raw)) newSignals.budget = true;
  if (/\[DECISION_MAKER\]/i.test(raw)) newSignals.decision = true;
  if (/\[PROBLEM_CONFIRMED\]/i.test(raw)) newSignals.problem = true;
  if (/\[BOOKED\]/i.test(raw)) newSignals.booked = true;
  const cleanText = raw.replace(/\[[A-Z_]+\]/g, "").trim();
  return { cleanText, newSignals };
}

function advanceStage(current: ScriptStage, signals: QualSignals): ScriptStage {
  if (current === "done") return "done";
  if (current === "opener") return "pain";
  if (current === "pain" && signals.problem) return "budget";
  if (current === "budget" && signals.budget) return "authority";
  if (current === "authority" && signals.decision) return "cta";
  if (current === "cta" && signals.booked) return "done";
  return current;
}

async function callClaude(state: LiveCallState, userTurn: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const client = new Anthropic({ apiKey });

  const messages = state.transcript.map<{ role: "user" | "assistant"; content: string }>(
    (line) => ({
      role: line.role === "lead" ? "user" : "assistant",
      content: line.text,
    }),
  );
  messages.push({ role: "user", content: userTurn });

  const res = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL?.split(",")[0]?.trim() || "claude-3-5-sonnet-latest",
    max_tokens: 180,
    system: CLAUDE_SYSTEM(state),
    messages,
  });
  return res.content
    .map((block) => ("text" in block ? block.text : ""))
    .join("")
    .trim();
}

async function summarizeCall(state: LiveCallState): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "";
  const client = new Anthropic({ apiKey });
  const transcriptText = state.transcript
    .map((l) => `${l.role.toUpperCase()}: ${l.text}`)
    .join("\n");
  try {
    const res = await client.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 300,
      system:
        "Summarize this sales qualification call in 3-4 sentences. Extract: pain point confirmed, stated budget, decision-maker status, booked time (if any), objections raised.",
      messages: [{ role: "user", content: transcriptText }],
    });
    return res.content
      .map((block) => ("text" in block ? block.text : ""))
      .join("")
      .trim();
  } catch {
    return "";
  }
}

async function synthesizeMulaw(voiceId: string, text: string): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=ulaw_8000`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/basic",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.85 },
        }),
      },
    );
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf;
  } catch {
    return null;
  }
}

function sendMulawToTwilio(ws: WSLike, streamSid: string, mulaw: Buffer): void {
  // Chunk into 160-byte frames (20ms at 8kHz mulaw) for smooth playback.
  const frameSize = 160;
  for (let i = 0; i < mulaw.length; i += frameSize) {
    const chunk = mulaw.subarray(i, Math.min(i + frameSize, mulaw.length));
    ws.send(
      JSON.stringify({
        event: "media",
        streamSid,
        media: { payload: chunk.toString("base64") },
      }),
    );
  }
  ws.send(JSON.stringify({ event: "mark", streamSid, mark: { name: "agent-turn-end" } }));
}

// ───────── Deepgram connection (managed as a side-channel per call) ─────────

type DeepgramConn = {
  sendAudio: (mulawB64: string) => void;
  close: () => void;
};

async function openDeepgram(
  onFinalTranscript: (text: string) => void,
): Promise<DeepgramConn | null> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return null;

  // Dynamic import so this file loads in environments where ws isn't installed.
  let WebSocketImpl: { new (url: string, opts?: Record<string, unknown>): unknown };
  try {
    WebSocketImpl = (await import("ws")).default as typeof WebSocketImpl;
  } catch {
    return null;
  }

  const url =
    "wss://api.deepgram.com/v1/listen?encoding=mulaw&sample_rate=8000&channels=1&interim_results=false&smart_format=true&punctuate=true";
  const ws = new WebSocketImpl(url, { headers: { Authorization: `Token ${key}` } }) as unknown as {
    on: (event: string, cb: (data: unknown) => void) => void;
    send: (data: Buffer | string) => void;
    close: () => void;
    readyState: number;
  };

  ws.on("message", (data: unknown) => {
    try {
      const text = typeof data === "string" ? data : (data as Buffer).toString("utf8");
      const json = JSON.parse(text) as {
        is_final?: boolean;
        channel?: { alternatives?: Array<{ transcript?: string }> };
      };
      if (json.is_final) {
        const t = json.channel?.alternatives?.[0]?.transcript?.trim();
        if (t) onFinalTranscript(t);
      }
    } catch {
      /* noop */
    }
  });

  return {
    sendAudio: (mulawB64: string) => {
      try {
        ws.send(Buffer.from(mulawB64, "base64"));
      } catch {
        /* noop */
      }
    },
    close: () => {
      try {
        ws.close();
      } catch {
        /* noop */
      }
    },
  };
}

// ───────── Main Twilio socket handler ─────────

export type HandlerDeps = {
  campaignId: string;
  voiceId: string;
  leadName: string;
};

export async function handleTwilioSocket(ws: WSLike, params: HandlerDeps): Promise<void> {
  let streamSid = "";
  let callSid = "";
  let state: LiveCallState | undefined;
  let deepgram: DeepgramConn | null = null;
  let finalizing = false;

  async function processLeadUtterance(leadText: string): Promise<void> {
    if (!state) return;
    const now = new Date().toISOString();
    const leadLine: TranscriptLine = { role: "lead", text: leadText, ts: now };
    state = appendTranscript(state.callSid, leadLine) ?? state;

    let reply: string;
    try {
      reply = await callClaude(state, leadText);
    } catch (error) {
      console.error("[voiceCallerStreamEngine] claude failure", error);
      return;
    }
    const { cleanText, newSignals } = parseSignalsFromReply(reply);
    const mergedSignals: QualSignals = { ...state.signals, ...newSignals };
    const qualScore = computeQualScore(mergedSignals);
    const nextStage = advanceStage(state.scriptStage, mergedSignals);

    state =
      updateCall(state.callSid, {
        signals: mergedSignals,
        qualScore,
        scriptStage: nextStage,
      }) ?? state;

    const agentLine: TranscriptLine = {
      role: "agent",
      text: cleanText,
      ts: new Date().toISOString(),
      signal: Object.keys(newSignals)[0],
    };
    state = appendTranscript(state.callSid, agentLine) ?? state;

    // Synthesize TTS and stream back.
    const mulaw = await synthesizeMulaw(state.voiceId, cleanText);
    if (mulaw && streamSid) {
      sendMulawToTwilio(ws, streamSid, mulaw);
    }
  }

  async function finalize(): Promise<void> {
    if (finalizing || !state) return;
    finalizing = true;
    try {
      const summary = await summarizeCall(state);
      const outcome: CallOutcome = state.qualScore >= 4 ? "qualified" : "not_qualified";
      const duration = `${Math.round((Date.now() - state.startedAt) / 1000)}s`;

      await logCallRecord({
        campaignId: state.campaignId,
        clientId: state.clientId,
        leadPhone: state.leadPhone,
        leadName: state.leadName,
        outcome,
        qualScore: state.qualScore,
        signals: state.signals,
        transcript: state.transcript,
        summary,
        duration,
        callSid: state.callSid,
      });

      if (outcome === "qualified") {
        let leadEmail: string | undefined;
        try {
          const campaign = await getCampaign(state.campaignId);
          leadEmail = campaign?.leads.find((l) => l.phone === state!.leadPhone)?.email;
        } catch {
          /* noop */
        }

        await triggerPostCallAutomations(
          {
            _id: state.callSid,
            campaignId: state.campaignId,
            clientId: state.clientId,
            leadPhone: state.leadPhone,
            leadName: state.leadName,
            outcome,
            qualScore: state.qualScore,
            signals: state.signals,
            transcript: state.transcript,
            summary,
            duration,
            callSid: state.callSid,
            createdAt: Date.now(),
          },
          leadEmail,
        ).catch((error) => {
          console.error("[voiceCallerStreamEngine] automations failed", error);
        });
      }

      updateCall(state.callSid, { finalized: true });
    } catch (error) {
      console.error("[voiceCallerStreamEngine] finalize failed", error);
    } finally {
      try {
        deepgram?.close();
      } catch {
        /* noop */
      }
      try {
        ws.close();
      } catch {
        /* noop */
      }
    }
  }

  const onMessage = async (raw: unknown): Promise<void> => {
    try {
      const text = typeof raw === "string" ? raw : (raw as Buffer).toString("utf8");
      const evt = JSON.parse(text) as TwilioInbound;

      if (evt.event === "start") {
        streamSid = evt.start.streamSid;
        callSid = evt.start.callSid;

        // Prefer an already-registered call (initiated via /initiate), fall
        // back to creating one inline using the query params passed in TwiML.
        state = getCall(callSid) || getCallByCampaign(params.campaignId);
        if (!state) {
          state = registerCall({
            callSid,
            campaignId: params.campaignId,
            clientId: "unknown",
            voiceId: params.voiceId,
            leadName: params.leadName,
            leadPhone: "unknown",
            scriptText: "",
          });
        } else if (state.callSid !== callSid) {
          // Re-key by the real Twilio callSid.
          removeCall(state.callSid);
          state = registerCall({
            callSid,
            campaignId: state.campaignId,
            clientId: state.clientId,
            voiceId: state.voiceId,
            leadName: state.leadName,
            leadPhone: state.leadPhone,
            scriptText: state.scriptText,
          });
        }

        deepgram = await openDeepgram((transcript) => {
          void processLeadUtterance(transcript);
        });
      } else if (evt.event === "media") {
        if (deepgram) deepgram.sendAudio(evt.media.payload);
      } else if (evt.event === "stop") {
        await finalize();
      }
    } catch (error) {
      console.error("[voiceCallerStreamEngine] onMessage error", error);
    }
  };

  if (typeof ws.on === "function") {
    ws.on("message", onMessage);
    ws.on("close", () => {
      void finalize();
    });
  } else if (typeof ws.addEventListener === "function") {
    ws.addEventListener("message", (e) => {
      void onMessage(e.data);
    });
    ws.addEventListener("close", () => {
      void finalize();
    });
  }
}
