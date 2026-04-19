import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get organization by Clerk Org ID or Clerk User ID
 */
export const getByClerkId = query({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    // In this schema, we don't have a direct clerkOrgId field on organizations yet.
    // However, the organizations table has an ownerId (clerkUserId).
    
    // First, try to find an organization that this user owns
    let org = await ctx.db
      .query("organizations")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.clerkOrgId))
      .first();

    // Fallback: If no org found and the clerkOrgId starts with 'org_', 
    // it's a real Clerk Org ID - we might need to support mapping later.
    
    return org;
  },
});

/**
 * Internal helper to create a default organization for a user
 */
export const createDefault = mutation({
  args: {
    ownerId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("organizations", {
      ownerId: args.ownerId,
      name: args.name,
      plan: "starter",
      settings: {},
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update organization plan
 */
export const updatePlan = mutation({
  args: {
    clerkOrgId: v.string(),
    plan: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.clerkOrgId))
      .first();

    if (!org) {
      throw new Error(`Organization for ${args.clerkOrgId} not found`);
    }

    await ctx.db.patch(org._id, {
      plan: args.plan,
    });

    return { success: true };
  },
});

/**
 * List all organizations (admin/debug)
 */
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("organizations").collect();
  },
});
