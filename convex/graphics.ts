import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveGraphic = mutation({
  args: {
    ideaTitle: v.string(),
    imageUrl: v.string(),
    platform: v.string(),
    niche: v.string(),
    prompt: v.string(),
    runId: v.optional(v.id("aiGenerations")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    return ctx.db.insert("graphics", {
      ...args,
      userId: identity.subject,
      createdAt: Date.now(),
    });
  },
});

export const listGraphics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const rows = await ctx.db
      .query("graphics")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .collect();

    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});
