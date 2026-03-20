import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveSeoAudit = mutation({
  args: {
    userId: v.string(),
    url: v.string(),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("seoAudits", {
      userId: args.userId,
      url: args.url,
      result: args.result,
      createdAt: Date.now(),
    });
  },
});

export const saveKeywordResearch = mutation({
  args: {
    userId: v.string(),
    topic: v.string(),
    keywords: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("keywordResearch", {
      userId: args.userId,
      topic: args.topic,
      keywords: args.keywords,
      createdAt: Date.now(),
    });
  },
});

export const saveAiGeneration = mutation({
  args: {
    userId: v.string(),
    type: v.string(),
    input: v.any(),
    output: v.any(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("aiGenerations", {
      userId: args.userId,
      type: args.type,
      input: args.input,
      output: args.output,
      createdAt: Date.now(),
    });
  },
});

export const listSeoAudits = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("seoAudits")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listKeywordResearch = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("keywordResearch")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listAiGenerations = query({
  args: { userId: v.string(), type: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("aiGenerations")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    const filtered = args.type
      ? rows.filter((row) => row.type === args.type)
      : rows;
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getAiGenerationById = query({
  args: { userId: v.string(), generationId: v.id("aiGenerations") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.generationId);
    if (!row) return null;
    if (row.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    return row;
  },
});

export const deleteAiGeneration = mutation({
  args: { userId: v.string(), generationId: v.id("aiGenerations") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.generationId);
    if (!row) {
      throw new Error("Generation not found");
    }
    if (row.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(args.generationId);
    return { success: true };
  },
});
