export type QualSignals = {
  budget: boolean;
  decision: boolean;
  problem: boolean;
  booked: boolean;
};

export type TranscriptLine = {
  role: "agent" | "lead";
  text: string;
  ts: string;
  signal?: string;
};

export type CallOutcome = "qualified" | "not_qualified" | "no_answer" | "failed";

export type CallProvider = "internal" | "vapi";

export type CallLog = {
  _id: string;
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
  provider?: CallProvider;
  vapiCallId?: string;
  recordingUrl?: string;
  createdAt: number;
};

export type VoiceClone = {
  _id: string;
  clientId: string;
  voiceId: string;
  voiceName: string;
  sampleUrl: string;
  createdAt: number;
};

export type CampaignLead = {
  phone: string;
  name: string;
  company?: string;
  email?: string;
};

export type Campaign = {
  _id: string;
  clientId: string;
  voiceId: string;
  scriptText: string;
  audioUrl?: string;
  callType: "live" | "voicemail";
  provider?: CallProvider;
  leads: CampaignLead[];
  status: "draft" | "running" | "complete";
  createdAt: number;
};

export type ScriptStage = "opener" | "pain" | "budget" | "authority" | "cta" | "done";
