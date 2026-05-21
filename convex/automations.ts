import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Validators ──────────────────────────────────────────────────────────────

const channelValidator = v.union(
  v.literal("instagram"),
  v.literal("sms"),
  v.literal("email"),
  v.literal("facebook"),
  v.literal("whatsapp"),
);

const modeValidator = v.union(v.literal("approval"), v.literal("autonomous"));
const goalValidator = v.union(
  v.literal("book-call"),
  v.literal("qualify"),
  v.literal("send-pricing"),
  v.literal("custom"),
);

// ─── Public mutations: CRUD on automations ───────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    mode: modeValidator,
    triggerValue: v.string(),
    channels: v.array(channelValidator),
    persona: v.string(),
    goal: goalValidator,
    maxRepliesPerThread: v.optional(v.number()),
    disclaimerRequired: v.optional(v.boolean()),
    autoCreateDeal: v.optional(v.boolean()),
    defaultDealValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    if (!args.name.trim()) throw new Error("Name is required");
    if (!args.triggerValue.trim()) throw new Error("Trigger value is required");
    if (args.channels.length === 0) {
      throw new Error("Pick at least one channel");
    }

    const now = Date.now();
    return ctx.db.insert("automations", {
      clerkUserId: identity.subject,
      name: args.name.trim(),
      status: "active",
      mode: args.mode,
      triggerType: "keyword",
      triggerValue: args.triggerValue.trim(),
      channels: args.channels,
      persona: args.persona,
      goal: args.goal,
      maxRepliesPerThread: Math.min(
        Math.max(args.maxRepliesPerThread ?? 8, 1),
        50,
      ),
      disclaimerRequired: args.disclaimerRequired ?? true,
      autoCreateDeal: args.autoCreateDeal ?? true,
      defaultDealValue: args.defaultDealValue,
      totalRepliesSent: 0,
      totalRunsStarted: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("automations"),
    name: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"))),
    mode: v.optional(modeValidator),
    triggerValue: v.optional(v.string()),
    channels: v.optional(v.array(channelValidator)),
    persona: v.optional(v.string()),
    goal: v.optional(goalValidator),
    maxRepliesPerThread: v.optional(v.number()),
    disclaimerRequired: v.optional(v.boolean()),
    autoCreateDeal: v.optional(v.boolean()),
    defaultDealValue: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const row = await ctx.db.get(id);
    if (!row || row.clerkUserId !== identity.subject) {
      throw new Error("Not found");
    }

    const defined = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );
    await ctx.db.patch(id, { ...defined, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const remove = mutation({
  args: { id: v.id("automations") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const row = await ctx.db.get(id);
    if (!row || row.clerkUserId !== identity.subject) {
      throw new Error("Not found");
    }

    // Also archive any runs + drafts attached to this rule so the UI
    // doesn't show orphans. We keep them in the DB for history.
    const runs = await ctx.db
      .query("automationRuns")
      .withIndex("by_automation_id", (q) => q.eq("automationId", id))
      .collect();
    for (const run of runs) {
      if (run.status === "running" || run.status === "paused") {
        await ctx.db.patch(run._id, {
          status: "stopped",
          stoppedReason: "rule_deleted",
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.delete(id);
    return { ok: true };
  },
});

// ─── Public queries ─────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query("automations")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("automations") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const row = await ctx.db.get(id);
    if (!row || row.clerkUserId !== identity.subject) return null;
    return row;
  },
});

export const listRuns = query({
  args: { automationId: v.optional(v.id("automations")) },
  handler: async (ctx, { automationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (automationId) {
      const rows = await ctx.db
        .query("automationRuns")
        .withIndex("by_automation_id", (q) =>
          q.eq("automationId", automationId),
        )
        .collect();
      return rows.filter((r) => r.clerkUserId === identity.subject);
    }
    return ctx.db
      .query("automationRuns")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .order("desc")
      .take(200);
  },
});

/**
 * Looks up the run handling a specific conversation (if any). Used by the
 * inbox UI to render the "🤖 Auto-replying" badge + Take Over button.
 */
export const getRunForConversation = query({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const rows = await ctx.db
      .query("automationRuns")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    const mine = rows.filter((r) => r.clerkUserId === identity.subject);
    // Prefer running / paused over completed / stopped.
    return (
      mine.find((r) => r.status === "running" || r.status === "paused") ??
      mine[0] ??
      null
    );
  },
});

export const listPendingDrafts = query({
  args: { conversationId: v.optional(v.string()) },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (conversationId) {
      return ctx.db
        .query("automationDrafts")
        .withIndex("by_conversation_id_status", (q) =>
          q.eq("conversationId", conversationId).eq("status", "pending"),
        )
        .collect();
    }
    const rows = await ctx.db
      .query("automationDrafts")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .order("desc")
      .take(100);
    return rows.filter((r) => r.status === "pending");
  },
});

export const listDeals = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query("automationDeals")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .order("desc")
      .take(200);
  },
});

// ─── Manual control mutations ───────────────────────────────────────────────

export const takeOverRun = mutation({
  args: { runId: v.id("automationRuns") },
  handler: async (ctx, { runId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const run = await ctx.db.get(runId);
    if (!run || run.clerkUserId !== identity.subject) {
      throw new Error("Not found");
    }
    await ctx.db.patch(runId, {
      status: "stopped",
      stoppedReason: "user_takeover",
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const sendDraft = mutation({
  args: { draftId: v.id("automationDrafts") },
  handler: async (ctx, { draftId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const draft = await ctx.db.get(draftId);
    if (!draft || draft.clerkUserId !== identity.subject) {
      throw new Error("Not found");
    }
    if (draft.status !== "pending") {
      throw new Error(`Draft is already ${draft.status}`);
    }
    // The actual outbound send happens server-side via the runAutomation
    // action. Here we just mark intent — the client should follow up by
    // calling the /api/automations/send-draft route.
    await ctx.db.patch(draftId, {
      status: "sent",
      sentAt: Date.now(),
    });
    return { ok: true };
  },
});

export const discardDraft = mutation({
  args: { draftId: v.id("automationDrafts") },
  handler: async (ctx, { draftId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const draft = await ctx.db.get(draftId);
    if (!draft || draft.clerkUserId !== identity.subject) {
      throw new Error("Not found");
    }
    await ctx.db.patch(draftId, { status: "discarded" });
    return { ok: true };
  },
});

export const setDealStage = mutation({
  args: {
    dealId: v.id("automationDeals"),
    stage: v.string(),
    lostReason: v.optional(v.string()),
  },
  handler: async (ctx, { dealId, stage, lostReason }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const deal = await ctx.db.get(dealId);
    if (!deal || deal.clerkUserId !== identity.subject) {
      throw new Error("Not found");
    }
    const now = Date.now();
    const patch: Record<string, unknown> = { stage, updatedAt: now };
    if (stage === "closed-won" || stage === "closed-lost") {
      patch.closedAt = now;
    }
    if (lostReason !== undefined) patch.lostReason = lostReason;
    await ctx.db.patch(dealId, patch);

    // When a deal closes, stop the run too — no more AI replies.
    const run = await ctx.db.get(deal.runId);
    if (run && (stage === "closed-won" || stage === "closed-lost")) {
      await ctx.db.patch(deal.runId, {
        status: "completed",
        stage,
        stoppedReason: `deal_${stage.replace("-", "_")}`,
        updatedAt: now,
      });
    }
    return { ok: true };
  },
});

// ─── Internal helpers — called from runAutomation action ────────────────────

export const findMatchingAutomation = query({
  args: {
    clerkUserId: v.string(),
    channel: v.string(),
    messageBody: v.string(),
  },
  handler: async (ctx, { clerkUserId, channel, messageBody }) => {
    const rules = await ctx.db
      .query("automations")
      .withIndex("by_clerk_user_id_status", (q) =>
        q.eq("clerkUserId", clerkUserId).eq("status", "active"),
      )
      .collect();

    const haystack = messageBody.toLowerCase();
    for (const rule of rules) {
      if (!rule.channels.includes(channel)) continue;
      // Only keyword triggers in MVP.
      if (rule.triggerType !== "keyword") continue;
      const needle = rule.triggerValue.toLowerCase().trim();
      if (!needle) continue;
      if (haystack.includes(needle)) return rule;
    }
    return null;
  },
});

export const upsertRunForConversation = mutation({
  args: {
    clerkUserId: v.string(),
    automationId: v.id("automations"),
    conversationId: v.string(),
    channel: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("automationRuns")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    const live = existing.find(
      (r) =>
        r.clerkUserId === args.clerkUserId &&
        r.automationId === args.automationId &&
        (r.status === "running" || r.status === "paused"),
    );
    if (live) return live._id;

    const now = Date.now();
    const id = await ctx.db.insert("automationRuns", {
      clerkUserId: args.clerkUserId,
      automationId: args.automationId,
      conversationId: args.conversationId,
      channel: args.channel,
      status: "running",
      stage: "contacted",
      replyCount: 0,
      lastInboundAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Bump rule counter.
    const rule = await ctx.db.get(args.automationId);
    if (rule) {
      await ctx.db.patch(args.automationId, {
        totalRunsStarted: rule.totalRunsStarted + 1,
        lastTriggeredAt: now,
      });
    }
    return id;
  },
});

export const recordInbound = mutation({
  args: { runId: v.id("automationRuns") },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run) return;
    const now = Date.now();
    await ctx.db.patch(runId, {
      lastInboundAt: now,
      stage: run.stage === "contacted" ? "replied" : run.stage,
      updatedAt: now,
    });
  },
});

export const createDraft = mutation({
  args: {
    clerkUserId: v.string(),
    runId: v.id("automationRuns"),
    automationId: v.id("automations"),
    conversationId: v.string(),
    channel: v.string(),
    body: v.string(),
    intent: v.optional(v.string()),
    reasoning: v.optional(v.string()),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    status: v.string(), // "pending" for approval mode, "sent" for autonomous
    sentMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const draftId = await ctx.db.insert("automationDrafts", {
      clerkUserId: args.clerkUserId,
      runId: args.runId,
      automationId: args.automationId,
      conversationId: args.conversationId,
      channel: args.channel,
      body: args.body,
      intent: args.intent,
      reasoning: args.reasoning,
      provider: args.provider,
      model: args.model,
      status: args.status,
      sentMessageId: args.sentMessageId,
      sentAt: args.status === "sent" ? now : undefined,
      createdAt: now,
    });

    if (args.status === "pending") {
      await ctx.db.patch(args.runId, {
        pendingDraftId: draftId,
        updatedAt: now,
      });
    } else if (args.status === "sent") {
      const run = await ctx.db.get(args.runId);
      if (run) {
        await ctx.db.patch(args.runId, {
          replyCount: run.replyCount + 1,
          lastReplyAt: now,
          updatedAt: now,
        });
        const rule = await ctx.db.get(args.automationId);
        if (rule) {
          await ctx.db.patch(args.automationId, {
            totalRepliesSent: rule.totalRepliesSent + 1,
          });
        }
      }
    }
    return draftId;
  },
});

export const markDraftSent = mutation({
  args: {
    draftId: v.id("automationDrafts"),
    sentMessageId: v.optional(v.string()),
  },
  handler: async (ctx, { draftId, sentMessageId }) => {
    const draft = await ctx.db.get(draftId);
    if (!draft) return;
    const now = Date.now();
    await ctx.db.patch(draftId, {
      status: "sent",
      sentMessageId,
      sentAt: now,
    });
    await ctx.db.patch(draft.runId, {
      replyCount: (await ctx.db.get(draft.runId))!.replyCount + 1,
      lastReplyAt: now,
      pendingDraftId: undefined,
      updatedAt: now,
    });
    const rule = await ctx.db.get(draft.automationId);
    if (rule) {
      await ctx.db.patch(draft.automationId, {
        totalRepliesSent: rule.totalRepliesSent + 1,
      });
    }
  },
});

export const ensureDeal = mutation({
  args: {
    clerkUserId: v.string(),
    runId: v.id("automationRuns"),
    automationId: v.id("automations"),
    conversationId: v.string(),
    contactLabel: v.string(),
    defaultDealValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("automationDeals")
      .withIndex("by_run_id", (q) => q.eq("runId", args.runId))
      .first();
    if (existing) return existing._id;

    const now = Date.now();
    return ctx.db.insert("automationDeals", {
      clerkUserId: args.clerkUserId,
      automationId: args.automationId,
      runId: args.runId,
      conversationId: args.conversationId,
      contactLabel: args.contactLabel,
      stage: "contacted",
      dealValue: args.defaultDealValue,
      currency: "USD",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getActiveRunForConversationInternal = query({
  args: { conversationId: v.string() },
  handler: async (ctx, { conversationId }) => {
    const rows = await ctx.db
      .query("automationRuns")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    return rows.find((r) => r.status === "running") ?? null;
  },
});

export const getAutomationInternal = query({
  args: { id: v.id("automations") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

/**
 * Webhook helper: given a GHL locationId, return the clerkUserId that owns
 * the matching active connection. Used to map inbound webhooks to a user
 * before dispatching to runAutomation.
 */
export const findUserByLocationId = query({
  args: { locationId: v.string() },
  handler: async (ctx, { locationId }) => {
    const rows = await ctx.db
      .query("ghlConnections")
      .withIndex("by_location_id", (q) => q.eq("locationId", locationId))
      .collect();
    const active = rows.find((r) => r.isActive) ?? rows[0];
    return active?.clerkUserId ?? null;
  },
});
