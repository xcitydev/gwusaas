import { ConvexHttpClient } from "convex/browser";
import type {
  CallOutcome,
  Campaign,
  CampaignLead,
  CallLog,
  QualSignals,
  TranscriptLine,
  VoiceClone,
} from "@/types/voiceCaller";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;

function getClient(): ConvexHttpClient {
  if (!convexClient) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return convexClient;
}

async function runMutation<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const client = getClient();
  return (await client.mutation(name as never, args as never)) as T;
}

async function runQuery<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const client = getClient();
  return (await client.query(name as never, args as never)) as T;
}

// ───── Voice clones ─────

export async function createVoiceCloneRecord(args: {
  clientId: string;
  voiceId: string;
  voiceName: string;
  sampleUrl: string;
}): Promise<string> {
  return runMutation<string>("voiceCaller:createVoiceClone", args);
}

export async function getLatestVoiceClone(clientId: string): Promise<VoiceClone | null> {
  return runQuery<VoiceClone | null>("voiceCaller:getVoiceClone", { clientId });
}

// ───── Campaigns ─────

export async function createCampaignRecord(args: {
  clientId: string;
  voiceId: string;
  scriptText: string;
  callType: "live" | "voicemail";
  leads: CampaignLead[];
  audioUrl?: string;
  provider?: "internal" | "vapi";
}): Promise<string> {
  return runMutation<string>("voiceCaller:createCampaign", args);
}

export async function updateCampaignStatus(
  campaignId: string,
  status: "draft" | "running" | "complete",
): Promise<void> {
  await runMutation("voiceCaller:updateCampaignStatus", { campaignId, status });
}

export async function updateCampaignAudio(
  campaignId: string,
  audioUrl: string,
): Promise<void> {
  await runMutation("voiceCaller:updateCampaignAudio", { campaignId, audioUrl });
}

export async function getCampaign(campaignId: string): Promise<Campaign | null> {
  return runQuery<Campaign | null>("voiceCaller:getCampaign", { campaignId });
}

export async function listCampaigns(clientId: string): Promise<Campaign[]> {
  return runQuery<Campaign[]>("voiceCaller:getCampaigns", { clientId });
}

// ───── Call logs ─────

export async function logCallRecord(args: {
  campaignId: string;
  clientId: string;
  leadPhone: string;
  leadName: string;
  outcome: CallOutcome;
  qualScore: number;
  signals: QualSignals;
  transcript: TranscriptLine[];
  summary?: string;
  duration?: string;
  callSid?: string;
}): Promise<string> {
  return runMutation<string>("voiceCaller:logCall", args);
}

export async function getCallLog(callLogId: string): Promise<CallLog | null> {
  return runQuery<CallLog | null>("voiceCaller:getCallLog", { callLogId });
}

export async function getCallLogBySid(callSid: string): Promise<CallLog | null> {
  return runQuery<CallLog | null>("voiceCaller:getCallLogBySid", { callSid });
}

export async function getCallLogByVapiId(vapiCallId: string): Promise<CallLog | null> {
  return runQuery<CallLog | null>("voiceCaller:getCallLogByVapiId", { vapiCallId });
}

export async function upsertVapiCallLog(args: {
  campaignId: string;
  clientId: string;
  leadPhone: string;
  leadName: string;
  vapiCallId: string;
  outcome?: CallOutcome;
  qualScore?: number;
  signals?: QualSignals;
  transcript?: TranscriptLine[];
  summary?: string;
  duration?: string;
  recordingUrl?: string;
}): Promise<string> {
  return runMutation<string>("voiceCaller:upsertVapiCallLog", args);
}

export async function getCampaignCallLogs(campaignId: string): Promise<CallLog[]> {
  return runQuery<CallLog[]>("voiceCaller:getCampaignCallLogs", { campaignId });
}
