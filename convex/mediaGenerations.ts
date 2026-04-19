import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    userId: v.string(),
    type: v.string(),
    provider: v.string(),
    model: v.string(),
    prompt: v.string(),
    negativePrompt: v.optional(v.string()),
    status: v.string(),
    resultUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    duration: v.optional(v.number()),
    metadata: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("mediaGenerations", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("mediaGenerations"),
    status: v.optional(v.string()),
    resultUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const defined = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, defined);
  },
});

export const listByUser = query({
  args: { userId: v.string(), type: v.optional(v.string()) },
  handler: async (ctx, { userId, type }) => {
    const all = await ctx.db
      .query("mediaGenerations")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
    if (type) return all.filter((r) => r.type === type);
    return all;
  },
});

export const getById = query({
  args: { id: v.id("mediaGenerations") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});
