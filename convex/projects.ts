import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyUserAccess, getCurrentUserProfile, verifyProjectAccess } from "./lib/spec";

/**
 * Create a new project
 */
export const create = mutation({
  args: {
    name: v.string(),
    instagramHandle: v.string(),
    websiteUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const access = await verifyUserAccess(ctx);
    const profile = await getCurrentUserProfile(ctx);
    
    if (!profile) {
      throw new Error("User profile not found");
    }

    const now = Date.now();
    const projectId = await ctx.db.insert("project", {
      clerkUserId: access.profile.clerkUserId,
      name: args.name,
      instagramHandle: args.instagramHandle,
      websiteUrl: args.websiteUrl,
      status: "active",
      createdBy: profile._id,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, projectId };
  },
});

/**
 * List projects for the current user
 */
export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized: No user session");
    }

    let query = ctx.db
      .query("project")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId.subject));

    const projects = await query.collect();

    // Filter by status if provided
    if (args.status) {
      return projects.filter((p) => p.status === args.status);
    }

    return projects;
  },
});

/**
 * Get a single project
 */
export const get = query({
  args: {
    projectId: v.id("project"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return null;
    }

    // Verify access
    await verifyProjectAccess(ctx, args.projectId);

    return project;
  },
});

/**
 * Update project
 */
export const update = mutation({
  args: {
    projectId: v.id("project"),
    name: v.optional(v.string()),
    instagramHandle: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify access
    await verifyProjectAccess(ctx, args.projectId);

    await ctx.db.patch(args.projectId, {
      ...(args.name && { name: args.name }),
      ...(args.instagramHandle && { instagramHandle: args.instagramHandle }),
      ...(args.websiteUrl !== undefined && { websiteUrl: args.websiteUrl }),
      ...(args.status && { status: args.status }),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

