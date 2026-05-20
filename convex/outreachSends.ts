import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type MetricField = "sent" | "opened" | "replied" | "booked";

async function bumpMetric(
  ctx: MutationCtx,
  templateId: Id<"outreachTemplates">,
  clerkUserId: string,
  field: MetricField,
) {
  const existing = await ctx.db
    .query("outreachTemplateMetrics")
    .withIndex("by_template_id", (q) => q.eq("templateId", templateId))
    .first();
  const now = Date.now();
  if (!existing) {
    const base = { sent: 0, opened: 0, replied: 0, booked: 0 };
    await ctx.db.insert("outreachTemplateMetrics", {
      clerkUserId,
      templateId,
      sent: base.sent,
      opened: base.opened,
      replied: base.replied,
      booked: base.booked,
      [field]: 1,
      updatedAt: now,
    });
    return;
  }
  await ctx.db.patch(existing._id, {
    [field]: (existing[field] ?? 0) + 1,
    updatedAt: now,
  });
}

export const recordSend = mutation({
  args: {
    clerkUserId: v.string(),
    templateId: v.optional(v.id("outreachTemplates")),
    channel: v.string(),
    provider: v.string(),
    providerId: v.string(),
    to: v.string(),
    subject: v.optional(v.string()),
    status: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("outreachSends", {
      clerkUserId: args.clerkUserId,
      templateId: args.templateId,
      channel: args.channel,
      provider: args.provider,
      providerId: args.providerId,
      to: args.to,
      subject: args.subject,
      status: args.status ?? "queued",
      sentAt: now,
      updatedAt: now,
      error: args.error,
    });
    if (args.templateId && (args.status ?? "queued") !== "failed") {
      await bumpMetric(ctx, args.templateId, args.clerkUserId, "sent");
    }
    return id;
  },
});

export const updateStatus = mutation({
  args: {
    provider: v.string(),
    providerId: v.string(),
    status: v.string(),
    lastEvent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("outreachSends")
      .withIndex("by_provider_id", (q) =>
        q.eq("provider", args.provider).eq("providerId", args.providerId),
      )
      .first();
    if (!row) return { matched: false };

    const previousStatus = row.status;
    const now = Date.now();
    await ctx.db.patch(row._id, {
      status: args.status,
      lastEvent: args.lastEvent ?? args.status,
      updatedAt: now,
    });

    // Increment template metric counters when a status transitions for the first time.
    // Only count each event once per send.
    if (row.templateId && previousStatus !== args.status) {
      if (args.status === "opened" && previousStatus !== "opened") {
        await bumpMetric(ctx, row.templateId, row.clerkUserId, "opened");
      }
      if (args.status === "replied" && previousStatus !== "replied") {
        await bumpMetric(ctx, row.templateId, row.clerkUserId, "replied");
      }
    }

    return { matched: true };
  },
});

export const listSends = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("outreachSends")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();
    return rows.sort((a, b) => b.sentAt - a.sentAt).slice(0, 100);
  },
});
