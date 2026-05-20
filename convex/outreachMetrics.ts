import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const incrementMetric = mutation({
  args: {
    clerkUserId: v.string(),
    templateId: v.id("outreachTemplates"),
    field: v.string(), // "sent" | "opened" | "replied" | "booked"
    delta: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const delta = args.delta ?? 1;
    const existing = await ctx.db
      .query("outreachTemplateMetrics")
      .withIndex("by_template_id", (q) => q.eq("templateId", args.templateId))
      .first();

    const now = Date.now();
    if (!existing) {
      const base = { sent: 0, opened: 0, replied: 0, booked: 0 };
      const initial = { ...base, [args.field]: delta };
      return ctx.db.insert("outreachTemplateMetrics", {
        clerkUserId: args.clerkUserId,
        templateId: args.templateId,
        sent: initial.sent,
        opened: initial.opened,
        replied: initial.replied,
        booked: initial.booked,
        updatedAt: now,
      });
    }

    if (existing.clerkUserId !== args.clerkUserId) throw new Error("Unauthorized");

    const current = existing[args.field as "sent" | "opened" | "replied" | "booked"] ?? 0;
    await ctx.db.patch(existing._id, {
      [args.field]: current + delta,
      updatedAt: now,
    });
    return { success: true };
  },
});

export const listMetrics = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query("outreachTemplateMetrics")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();

    const enriched = await Promise.all(
      metrics.map(async (m) => {
        const template = await ctx.db.get(m.templateId);
        return {
          ...m,
          templateName: template?.name ?? "(deleted)",
          channel: template?.channel ?? "unknown",
        };
      }),
    );

    return enriched.sort((a, b) => b.replied - a.replied);
  },
});

export const summary = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query("outreachTemplateMetrics")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();

    const totals = metrics.reduce(
      (acc, m) => ({
        sent: acc.sent + m.sent,
        opened: acc.opened + m.opened,
        replied: acc.replied + m.replied,
        booked: acc.booked + m.booked,
      }),
      { sent: 0, opened: 0, replied: 0, booked: 0 },
    );

    const openRate = totals.sent > 0 ? totals.opened / totals.sent : 0;
    const replyRate = totals.sent > 0 ? totals.replied / totals.sent : 0;
    const bookRate = totals.replied > 0 ? totals.booked / totals.replied : 0;

    return { ...totals, openRate, replyRate, bookRate, templates: metrics.length };
  },
});
