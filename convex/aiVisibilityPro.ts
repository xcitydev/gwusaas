import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const STARTER_CREDITS = 3;

async function ensureCreditsRow(ctx: any, clerkUserId: string) {
  const existing = await ctx.db
    .query("aiVisibilityProCredits")
    .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", clerkUserId))
    .unique();
  if (existing) return existing;

  const id = await ctx.db.insert("aiVisibilityProCredits", {
    clerkUserId,
    credits: STARTER_CREDITS,
    updatedAt: Date.now(),
  });
  return await ctx.db.get(id);
}

export const getMyCredits = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const row = await ctx.db
      .query("aiVisibilityProCredits")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (row) return { credits: row.credits };
    return { credits: STARTER_CREDITS };
  },
});

export const initCreditsIfMissing = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const row = await ensureCreditsRow(ctx, identity.subject);
    return { credits: row?.credits ?? STARTER_CREDITS };
  },
});

export const addCredits = mutation({
  args: { amount: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    if (args.amount <= 0) throw new Error("Amount must be positive");

    const row = await ensureCreditsRow(ctx, identity.subject);
    if (!row) throw new Error("Credits row missing");

    await ctx.db.patch(row._id, {
      credits: row.credits + args.amount,
      updatedAt: Date.now(),
    });
    return { credits: row.credits + args.amount };
  },
});

export const consumeCreditAndCreateReport = mutation({
  args: {
    businessName: v.string(),
    industry: v.string(),
    audience: v.string(),
    location: v.optional(v.string()),
    services: v.string(),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const row = await ensureCreditsRow(ctx, identity.subject);
    if (!row) throw new Error("Credits row missing");
    if (row.credits <= 0) throw new Error("INSUFFICIENT_CREDITS");

    const reportId = await ctx.db.insert("aiVisibilityProReports", {
      clerkUserId: identity.subject,
      businessName: args.businessName,
      industry: args.industry,
      audience: args.audience,
      location: args.location,
      services: args.services,
      result: args.result,
      createdAt: Date.now(),
    });

    await ctx.db.patch(row._id, {
      credits: row.credits - 1,
      updatedAt: Date.now(),
    });

    return { reportId, creditsRemaining: row.credits - 1 };
  },
});

export const listMyReports = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const rows = await ctx.db
      .query("aiVisibilityProReports")
      .withIndex("by_clerk_user_id_created_at", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .order("desc")
      .take(args.limit ?? 50);

    return rows.map((r) => ({
      _id: r._id,
      businessName: r.businessName,
      industry: r.industry,
      createdAt: r.createdAt,
    }));
  },
});

export const getReport = query({
  args: { reportId: v.id("aiVisibilityProReports") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const report = await ctx.db.get(args.reportId);
    if (!report) return null;
    if (report.clerkUserId !== identity.subject) return null;

    return report;
  },
});
