import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("userApiKeys")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    userId: v.string(),
    openaiApiKey: v.optional(v.string()),
    stabilityApiKey: v.optional(v.string()),
    replicateApiKey: v.optional(v.string()),
    runwayApiKey: v.optional(v.string()),
    apifyApiKey: v.optional(v.string()),
  },
  handler: async (ctx, { userId, ...keys }) => {
    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    const defined = Object.fromEntries(
      Object.entries(keys).filter(([, v]) => v !== undefined)
    );

    if (existing) {
      await ctx.db.patch(existing._id, { ...defined, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("userApiKeys", { userId, ...defined, updatedAt: Date.now() });
    }
  },
});
