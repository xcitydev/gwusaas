import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const signalsValidator = v.object({
  budget: v.boolean(),
  decision: v.boolean(),
  problem: v.boolean(),
  booked: v.boolean(),
});

const transcriptLineValidator = v.object({
  role: v.union(v.literal("agent"), v.literal("lead")),
  text: v.string(),
  ts: v.string(),
  signal: v.optional(v.string()),
});

const leadValidator = v.object({
  phone: v.string(),
  name: v.string(),
  company: v.optional(v.string()),
  email: v.optional(v.string()),
});

const outcomeValidator = v.union(
  v.literal("qualified"),
  v.literal("not_qualified"),
  v.literal("no_answer"),
  v.literal("failed"),
);

const callTypeValidator = v.union(v.literal("live"), v.literal("voicemail"));

const providerValidator = v.union(v.literal("internal"), v.literal("vapi"));

const campaignStatusValidator = v.union(
  v.literal("draft"),
  v.literal("running"),
  v.literal("complete"),
);

// ────────────────────────────────────────────────────
// Voice clones
// ────────────────────────────────────────────────────

export const createVoiceClone = mutation({
  args: {
    clientId: v.string(),
    voiceId: v.string(),
    voiceName: v.string(),
    sampleUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("voiceClones", {
      clientId: args.clientId,
      voiceId: args.voiceId,
      voiceName: args.voiceName,
      sampleUrl: args.sampleUrl,
      createdAt: Date.now(),
    });
  },
});

export const getVoiceClone = query({
  args: { clientId: v.string() },
  handler: async (ctx, { clientId }) => {
    const clones = await ctx.db
      .query("voiceClones")
      .withIndex("by_client_id", (q) => q.eq("clientId", clientId))
      .collect();
    if (clones.length === 0) return null;
    return clones.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  },
});

export const listVoiceClones = query({
  args: { clientId: v.string() },
  handler: async (ctx, { clientId }) => {
    const clones = await ctx.db
      .query("voiceClones")
      .withIndex("by_client_id", (q) => q.eq("clientId", clientId))
      .collect();
    return clones.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ────────────────────────────────────────────────────
// Campaigns
// ────────────────────────────────────────────────────

export const createCampaign = mutation({
  args: {
    clientId: v.string(),
    voiceId: v.string(),
    scriptText: v.string(),
    callType: callTypeValidator,
    leads: v.array(leadValidator),
    audioUrl: v.optional(v.string()),
    provider: v.optional(providerValidator),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("callCampaigns", {
      clientId: args.clientId,
      voiceId: args.voiceId,
      scriptText: args.scriptText,
      callType: args.callType,
      leads: args.leads,
      audioUrl: args.audioUrl,
      provider: args.provider ?? "internal",
      status: "draft",
      createdAt: Date.now(),
    });
  },
});

export const updateCampaignStatus = mutation({
  args: {
    campaignId: v.id("callCampaigns"),
    status: campaignStatusValidator,
  },
  handler: async (ctx, { campaignId, status }) => {
    await ctx.db.patch(campaignId, { status });
    return { ok: true };
  },
});

export const updateCampaignAudio = mutation({
  args: {
    campaignId: v.id("callCampaigns"),
    audioUrl: v.string(),
  },
  handler: async (ctx, { campaignId, audioUrl }) => {
    await ctx.db.patch(campaignId, { audioUrl });
    return { ok: true };
  },
});

export const getCampaigns = query({
  args: { clientId: v.string() },
  handler: async (ctx, { clientId }) => {
    const campaigns = await ctx.db
      .query("callCampaigns")
      .withIndex("by_client_id_created_at", (q) => q.eq("clientId", clientId))
      .order("desc")
      .collect();
    return campaigns;
  },
});

export const getCampaign = query({
  args: { campaignId: v.id("callCampaigns") },
  handler: async (ctx, { campaignId }) => {
    return ctx.db.get(campaignId);
  },
});

// ────────────────────────────────────────────────────
// Call logs
// ────────────────────────────────────────────────────

export const logCall = mutation({
  args: {
    campaignId: v.id("callCampaigns"),
    clientId: v.string(),
    leadPhone: v.string(),
    leadName: v.string(),
    outcome: outcomeValidator,
    qualScore: v.number(),
    signals: signalsValidator,
    transcript: v.array(transcriptLineValidator),
    summary: v.optional(v.string()),
    duration: v.optional(v.string()),
    callSid: v.optional(v.string()),
    provider: v.optional(providerValidator),
    vapiCallId: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("callLogs", {
      campaignId: args.campaignId,
      clientId: args.clientId,
      leadPhone: args.leadPhone,
      leadName: args.leadName,
      outcome: args.outcome,
      qualScore: args.qualScore,
      signals: args.signals,
      transcript: args.transcript,
      summary: args.summary,
      duration: args.duration,
      callSid: args.callSid,
      provider: args.provider,
      vapiCallId: args.vapiCallId,
      recordingUrl: args.recordingUrl,
      createdAt: Date.now(),
    });
  },
});

export const appendTranscriptLine = mutation({
  args: {
    callLogId: v.id("callLogs"),
    line: transcriptLineValidator,
    signals: v.optional(signalsValidator),
    qualScore: v.optional(v.number()),
  },
  handler: async (ctx, { callLogId, line, signals, qualScore }) => {
    const existing = await ctx.db.get(callLogId);
    if (!existing) return { ok: false };
    const transcript = [...existing.transcript, line];
    const patch: {
      transcript: typeof transcript;
      signals?: typeof existing.signals;
      qualScore?: number;
    } = { transcript };
    if (signals) patch.signals = signals;
    if (typeof qualScore === "number") patch.qualScore = qualScore;
    await ctx.db.patch(callLogId, patch);
    return { ok: true };
  },
});

export const getCallLogs = query({
  args: { clientId: v.string() },
  handler: async (ctx, { clientId }) => {
    const logs = await ctx.db
      .query("callLogs")
      .withIndex("by_client_id_created_at", (q) => q.eq("clientId", clientId))
      .order("desc")
      .collect();
    return logs;
  },
});

export const getCallLog = query({
  args: { callLogId: v.id("callLogs") },
  handler: async (ctx, { callLogId }) => {
    return ctx.db.get(callLogId);
  },
});

export const getCallLogBySid = query({
  args: { callSid: v.string() },
  handler: async (ctx, { callSid }) => {
    const rows = await ctx.db
      .query("callLogs")
      .withIndex("by_call_sid", (q) => q.eq("callSid", callSid))
      .collect();
    return rows[0] ?? null;
  },
});

export const getCallLogByVapiId = query({
  args: { vapiCallId: v.string() },
  handler: async (ctx, { vapiCallId }) => {
    const rows = await ctx.db
      .query("callLogs")
      .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", vapiCallId))
      .collect();
    return rows[0] ?? null;
  },
});

// Upsert by vapiCallId. We get many events per call (status, transcript,
// end-of-call-report) and want a single row per call, so the webhook
// route reconciles into the same record.
export const upsertVapiCallLog = mutation({
  args: {
    campaignId: v.id("callCampaigns"),
    clientId: v.string(),
    leadPhone: v.string(),
    leadName: v.string(),
    vapiCallId: v.string(),
    outcome: v.optional(outcomeValidator),
    qualScore: v.optional(v.number()),
    signals: v.optional(signalsValidator),
    transcript: v.optional(v.array(transcriptLineValidator)),
    summary: v.optional(v.string()),
    duration: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingRows = await ctx.db
      .query("callLogs")
      .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", args.vapiCallId))
      .collect();
    const existing = existingRows[0];

    const baseSignals = { budget: false, decision: false, problem: false, booked: false };

    if (existing) {
      const patch: Record<string, unknown> = {};
      if (args.outcome !== undefined) patch.outcome = args.outcome;
      if (args.qualScore !== undefined) patch.qualScore = args.qualScore;
      if (args.signals !== undefined) patch.signals = args.signals;
      if (args.transcript !== undefined) patch.transcript = args.transcript;
      if (args.summary !== undefined) patch.summary = args.summary;
      if (args.duration !== undefined) patch.duration = args.duration;
      if (args.recordingUrl !== undefined) patch.recordingUrl = args.recordingUrl;
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return ctx.db.insert("callLogs", {
      campaignId: args.campaignId,
      clientId: args.clientId,
      leadPhone: args.leadPhone,
      leadName: args.leadName,
      outcome: args.outcome ?? "no_answer",
      qualScore: args.qualScore ?? 0,
      signals: args.signals ?? baseSignals,
      transcript: args.transcript ?? [],
      summary: args.summary,
      duration: args.duration,
      provider: "vapi",
      vapiCallId: args.vapiCallId,
      recordingUrl: args.recordingUrl,
      createdAt: Date.now(),
    });
  },
});

export const getCampaignCallLogs = query({
  args: { campaignId: v.id("callCampaigns") },
  handler: async (ctx, { campaignId }) => {
    const logs = await ctx.db
      .query("callLogs")
      .withIndex("by_campaign_id", (q) => q.eq("campaignId", campaignId))
      .collect();
    return logs.sort((a, b) => b.createdAt - a.createdAt);
  },
});
