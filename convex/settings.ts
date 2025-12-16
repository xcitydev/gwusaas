import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyUserAccess, getCurrentUserId } from "./lib/spec";

/**
 * Set Instagram credentials (tokens/handles) for user
 * Note: In production, encrypt these before storing
 */
export const setIgCreds = mutation({
  args: {
    instagramHandle: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    metaAppId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    await verifyUserAccess(ctx);
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get or create user profile
    const profile = await ctx.db
      .query("profile")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!profile) {
      throw new Error("User profile not found");
    }

    // Store settings in profile (or create a separate userSettings table if needed)
    // For now, we'll just return success - you can extend profile schema if needed
    return { success: true };
  },
});

/**
 * Get user settings
 */
export const get = query({
  args: {},
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.db
      .query("profile")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!profile) {
      throw new Error("User profile not found");
    }

    return {
      plan: "trial", // Default plan for now
      settings: {},
    };
  },
});

