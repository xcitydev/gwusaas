import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyOrgAccess, getCurrentUserProfile } from "./lib/spec";

/**
 * Create a new website project
 */
export const create = mutation({
  args: {
    organizationId: v.id("organization"),
    title: v.string(),
    features: v.optional(v.string()),
    brandElements: v.optional(v.string()),
    aboutUsSummary: v.optional(v.string()),
    googleDriveLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify access
    const access = await verifyOrgAccess(ctx, args.organizationId);
    const profile = await getCurrentUserProfile(ctx);
    
    if (!profile) {
      throw new Error("User profile not found");
    }

    const now = Date.now();
    const projectId = await ctx.db.insert("websiteProject", {
      organizationId: args.organizationId,
      title: args.title,
      status: "planning",
      progress: 0,
      features: args.features,
      brandElements: args.brandElements,
      aboutUsSummary: args.aboutUsSummary,
      googleDriveLink: args.googleDriveLink,
      createdBy: profile._id,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, projectId };
  },
});

/**
 * List website projects for an organization
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
      .query("websiteProject")
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
 * Get a single website project
 */
export const get = query({
  args: {
    projectId: v.id("websiteProject"),
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
 * Update website project
 */
export const update = mutation({
  args: {
    projectId: v.id("websiteProject"),
    title: v.optional(v.string()),
    status: v.optional(v.string()),
    progress: v.optional(v.number()),
    assignedDeveloper: v.optional(v.string()),
    deadline: v.optional(v.string()),
    url: v.optional(v.string()),
    technologies: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Verify access
    await verifyOrgAccess(ctx, project.organizationId);

    await ctx.db.patch(args.projectId, {
      ...(args.title && { title: args.title }),
      ...(args.status && { status: args.status }),
      ...(args.progress !== undefined && { progress: args.progress }),
      ...(args.assignedDeveloper !== undefined && { assignedDeveloper: args.assignedDeveloper }),
      ...(args.deadline !== undefined && { deadline: args.deadline }),
      ...(args.url !== undefined && { url: args.url }),
      ...(args.technologies !== undefined && { technologies: args.technologies }),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});


