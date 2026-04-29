/**
 * In-memory map from Twilio callSid to live call metadata. Used by the
 * stream handler, webhook and transcript polling routes to share state
 * about an in-flight call.
 *
 * NOTE: This only survives within a single Node process. For production
 * multi-node deployments, replace with a shared store (Redis, Convex, etc).
 */

import type { QualSignals, ScriptStage, TranscriptLine } from "@/types/voiceCaller";

export type LiveCallState = {
  callSid: string;
  campaignId: string;
  clientId: string;
  voiceId: string;
  leadName: string;
  leadPhone: string;
  scriptText: string;
  startedAt: number;
  scriptStage: ScriptStage;
  signals: QualSignals;
  qualScore: number;
  transcript: TranscriptLine[];
  lastActiveAt: number;
  finalized?: boolean;
  callLogId?: string;
};

type Registry = Map<string, LiveCallState>;

const globalKey = "__BOOLSPACE_VOICE_CALLER_REGISTRY__";

function getRegistry(): Registry {
  const bag = globalThis as unknown as Record<string, Registry | undefined>;
  if (!bag[globalKey]) {
    bag[globalKey] = new Map<string, LiveCallState>();
  }
  return bag[globalKey]!;
}

export function registerCall(state: Omit<LiveCallState, "startedAt" | "lastActiveAt" | "scriptStage" | "signals" | "qualScore" | "transcript">): LiveCallState {
  const registry = getRegistry();
  const now = Date.now();
  const full: LiveCallState = {
    ...state,
    startedAt: now,
    lastActiveAt: now,
    scriptStage: "opener",
    signals: { budget: false, decision: false, problem: false, booked: false },
    qualScore: 0,
    transcript: [],
  };
  registry.set(state.callSid, full);
  return full;
}

export function getCall(callSid: string): LiveCallState | undefined {
  return getRegistry().get(callSid);
}

export function getCallByCampaign(campaignId: string): LiveCallState | undefined {
  const registry = getRegistry();
  for (const state of registry.values()) {
    if (state.campaignId === campaignId && !state.finalized) return state;
  }
  return undefined;
}

export function updateCall(
  callSid: string,
  patch: Partial<LiveCallState>,
): LiveCallState | undefined {
  const registry = getRegistry();
  const state = registry.get(callSid);
  if (!state) return undefined;
  const next: LiveCallState = { ...state, ...patch, lastActiveAt: Date.now() };
  registry.set(callSid, next);
  return next;
}

export function appendTranscript(callSid: string, line: TranscriptLine): LiveCallState | undefined {
  const state = getCall(callSid);
  if (!state) return undefined;
  return updateCall(callSid, { transcript: [...state.transcript, line] });
}

export function removeCall(callSid: string): void {
  getRegistry().delete(callSid);
}

export function listLiveCalls(): LiveCallState[] {
  return Array.from(getRegistry().values()).filter((c) => !c.finalized);
}

export function computeQualScore(signals: QualSignals): number {
  return (
    (signals.budget ? 1 : 0) +
    (signals.decision ? 1 : 0) +
    (signals.problem ? 1 : 0) +
    (signals.booked ? 1 : 0)
  );
}
