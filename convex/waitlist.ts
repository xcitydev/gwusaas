import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.email.trim().toLowerCase();
    return ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .first();
  },
});

export const createSignup = mutation({
  args: {
    email: v.string(),
    userType: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalized = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .first();
    if (existing) {
      return { status: "exists" as const, id: existing._id };
    }

    const id = await ctx.db.insert("waitlistSignups", {
      email: normalized,
      userType: args.userType,
      source: args.source || "ai-studio-page",
      createdAt: Date.now(),
    });
    return { status: "created" as const, id };
  },
});

export const getCount = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("waitlistSignups").collect();
    return rows.length;
  },
});
