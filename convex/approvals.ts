import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserProfile, verifyOrgAccess } from "./lib/spec";

/**
 * List all approvals for an organization
 */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyOrgAccess(ctx, args.organizationId);
    
    let q = ctx.db
      .query("approvals")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId));
    
    if (args.status) {
      // Manual filter since we don't have a combined index yet
      const results = await q.collect();
      return results.filter(r => r.status === args.status);
    }

    return await q.collect();
  },
});

/**
 * Update approval status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("approvals"),
    status: v.string(), // "Approved" | "Rejected" | "Pending Review"
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentUserProfile(ctx);
    if (!profile) throw new Error("Unauthorized");

    const approval = await ctx.db.get(args.id);
    if (!approval) throw new Error("Approval not found");

    await ctx.db.patch(args.id, {
      status: args.status,
      feedback: args.feedback,
      approvedBy: profile.fullName,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Create a new approval item
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    type: v.string(),
    description: v.optional(v.string()),
    priority: v.string(),
    submittedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("approvals", {
      organizationId: args.organizationId,
      title: args.title,
      type: args.type,
      description: args.description,
      priority: args.priority,
      status: "Pending Review",
      submittedBy: args.submittedBy,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});
