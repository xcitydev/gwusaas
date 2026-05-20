import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    sourceUrl: v.string(),
    platform: v.string(),
    transcript: v.string(),
    duration: v.number(),
    language: v.optional(v.string()),
    source: v.string(),
    wordCount: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const id = await ctx.db.insert("transcripts", {
      clerkUserId: identity.subject,
      sourceUrl: args.sourceUrl,
      platform: args.platform,
      transcript: args.transcript,
      duration: args.duration,
      language: args.language,
      source: args.source,
      wordCount: args.wordCount,
      createdAt: Date.now(),
    });

    return id;
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("transcripts")
      .withIndex("by_clerk_user_id_created_at", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .order("desc")
      .take(Math.min(Math.max(limit ?? 25, 1), 100));
  },
});

export const get = query({
  args: { id: v.id("transcripts") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const row = await ctx.db.get(id);
    if (!row || row.clerkUserId !== identity.subject) return null;
    return row;
  },
});

export const remove = mutation({
  args: { id: v.id("transcripts") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const row = await ctx.db.get(id);
    if (!row || row.clerkUserId !== identity.subject) {
      throw new Error("Not found");
    }
    await ctx.db.delete(id);
    return { ok: true };
  },
});
