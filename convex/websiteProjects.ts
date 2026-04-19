import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserProfile } from "./lib/spec";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    title: v.string(),
    features: v.optional(v.string()),
    brandElements: v.optional(v.string()),
    aboutUsSummary: v.optional(v.string()),
    googleDriveLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const profile = await getCurrentUserProfile(ctx);
    if (!profile) throw new Error("User profile not found");

    const now = Date.now();
    const projectId = await ctx.db.insert("websiteProject", {
      clerkUserId: identity.subject,
      title: args.title,
      status: "planning",
      progress: 0,
      features: args.features,
      brandElements: args.brandElements,
      aboutUsSummary: args.aboutUsSummary,
      googleDriveLink: args.googleDriveLink,
      createdBy: profile._id as Id<"profile">,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, projectId };
  },
});

export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const projects = await ctx.db
      .query("websiteProject")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .collect();

    if (args.status) return projects.filter((p) => p.status === args.status);
    return projects;
  },
});

export const get = query({
  args: { projectId: v.id("websiteProject") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.clerkUserId !== identity.subject) return null;
    return project;
  },
});

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
  handler: async (ctx, { projectId, ...patch }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const project = await ctx.db.get(projectId);
    if (!project || project.clerkUserId !== identity.subject) throw new Error("Not found");

    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(projectId, { ...defined, updatedAt: Date.now() });
    return { success: true };
  },
});
