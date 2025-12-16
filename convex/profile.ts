import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUserId } from "./lib/spec";

/**
 * Get profile by Clerk user ID
 */
export const getByClerkId = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profile")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    return profile;
  },
});

/**
 * Create or update user profile
 */
export const createOrUpdate = mutation({
  args: {
    clerkUserId: v.string(),
    fullName: v.string(),
    email: v.string(),
    role: v.optional(v.string()), // Defaults to "client"
  },
  handler: async (ctx, args) => {
    // Check if profile already exists
    const existing = await ctx.db
      .query("profile")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing profile
      await ctx.db.patch(existing._id, {
        fullName: args.fullName,
        email: args.email,
        role: args.role || existing.role,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new profile
    const profileId = await ctx.db.insert("profile", {
      clerkUserId: args.clerkUserId,
      fullName: args.fullName,
      email: args.email,
      onboardingCompleted: false,
      role: args.role || "client",
      createdAt: now,
      updatedAt: now,
    });

    return profileId;
  },
});

export const completeOnboarding = mutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profile")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }
    await ctx.db.patch(profile._id, {
      onboardingCompleted: true,
    });
  },
});

