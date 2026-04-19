import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listSavedIdeas = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("savedViralIdeas")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const saveIdea = mutation({
  args: {
    userId: v.string(),
    idea: v.string(),
    platform: v.string(),
    category: v.string(),
    hook: v.optional(v.string()),
    whyItWorks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("savedViralIdeas", {
      userId: args.userId,
      idea: args.idea,
      platform: args.platform,
      category: args.category,
      hook: args.hook,
      whyItWorks: args.whyItWorks,
      saved: true,
      addedToPipeline: false,
      createdAt: Date.now(),
    });
  },
});

export const markIdeaAdded = mutation({
  args: { userId: v.string(), ideaId: v.id("savedViralIdeas"), added: v.boolean() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.ideaId);
    if (!row || row.userId !== args.userId) throw new Error("Idea not found");
    await ctx.db.patch(args.ideaId, { addedToPipeline: args.added });
    return args.ideaId;
  },
});

export const deleteSavedIdea = mutation({
  args: { userId: v.string(), ideaId: v.id("savedViralIdeas") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.ideaId);
    if (!row || row.userId !== args.userId) throw new Error("Idea not found");
    await ctx.db.delete(args.ideaId);
    return { success: true };
  },
});
