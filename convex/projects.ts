import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { verifyUserAccess } from "./lib/spec";

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
    const { profile } = await verifyUserAccess(ctx);

    const now = Date.now();
    const projectId = await ctx.db.insert("project", {
      clerkUserId: profile.clerkUserId,
      name: args.name,
      instagramHandle: args.instagramHandle,
      websiteUrl: args.websiteUrl,
      status: "active",
      createdBy: profile._id as Id<"profile">,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, projectId };
  },
});

/**
 * List projects for an organization
 */
export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { profile } = await verifyUserAccess(ctx);
    const projects = await ctx.db
      .query("project")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", profile.clerkUserId)
      )
      .collect();

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
    const { profile } = await verifyUserAccess(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return null;
    }

    if (project.clerkUserId !== profile.clerkUserId) {
      throw new Error("Unauthorized: You don't have access to this project");
    }

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
    const { profile } = await verifyUserAccess(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.clerkUserId !== profile.clerkUserId) {
      throw new Error("Unauthorized: You don't have access to this project");
    }

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

