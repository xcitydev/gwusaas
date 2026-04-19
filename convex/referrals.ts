import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserId } from "./lib/spec";

/**
 * Get referral data for the current user
 */
export const get = query({
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("referralProgram")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();
  },
});

/**
 * Initialize or update referral program for user
 */
export const init = mutation({
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("referralProgram")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (existing) return existing;

    const now = Date.now();
    const id = await ctx.db.insert("referralProgram", {
      clerkUserId: userId,
      referralCode: `ref-${userId.slice(-6)}`,
      totalReferrals: 0,
      totalEarned: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});
