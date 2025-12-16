import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyOrgAccess, getCurrentUserProfile } from "./lib/spec";

/**
 * Create a new project
 */
export const create = mutation({
  args: {
    organizationId: v.id("organization"),
    name: v.string(),
    instagramHandle: v.string(),
    websiteUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify access
    const access = await verifyOrgAccess(ctx, args.organizationId);
    const profile = await getCurrentUserProfile(ctx);
    
    if (!profile) {
      throw new Error("User profile not found");
    }

    const now = Date.now();
    const projectId = await ctx.db.insert("project", {
      organizationId: args.organizationId,
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
 * List projects for an organization
 */
export const list = query({
  args: {
    organizationId: v.id("organization"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify access
    await verifyOrgAccess(ctx, args.organizationId);

    let query = ctx.db
      .query("project")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId));

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
    await verifyOrgAccess(ctx, project.organizationId);

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
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Verify access
    await verifyOrgAccess(ctx, project.organizationId);

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

