import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserId } from "./lib/spec";

export const list = query({
  args: { organizationId: v.optional(v.id("organizations")) },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    const projects = await ctx.db
      .query("videoProjects")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .collect();
    
    return projects;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    client: v.string(),
    duration: v.string(),
    status: v.string(),
    progress: v.number(),
    deadline: v.string(),
    editor: v.string(),
    thumbnail: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const now = Date.now();
    return await ctx.db.insert("videoProjects", {
      ...args,
      clerkUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("videoProjects"),
    status: v.optional(v.string()),
    progress: v.optional(v.number()),
    deadline: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const project = await ctx.db.get(id);
    if (!project || project.clerkUserId !== userId) throw new Error("Not found");

    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
  },
});
