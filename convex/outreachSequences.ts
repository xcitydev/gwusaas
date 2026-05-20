import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveSequence = mutation({
  args: {
    clerkUserId: v.string(),
    clientId: v.optional(v.string()),
    name: v.string(),
    steps: v.any(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("outreachSequences", {
      clerkUserId: args.clerkUserId,
      clientId: args.clientId,
      name: args.name,
      steps: args.steps,
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listSequences = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("outreachSequences")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getSequence = query({
  args: {
    clerkUserId: v.string(),
    sequenceId: v.id("outreachSequences"),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.sequenceId);
    if (!row) return null;
    if (row.clerkUserId !== args.clerkUserId) throw new Error("Unauthorized");
    return row;
  },
});

export const updateSequence = mutation({
  args: {
    clerkUserId: v.string(),
    sequenceId: v.id("outreachSequences"),
    name: v.optional(v.string()),
    steps: v.optional(v.any()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.sequenceId);
    if (!row) throw new Error("Sequence not found");
    if (row.clerkUserId !== args.clerkUserId) throw new Error("Unauthorized");
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.steps !== undefined) patch.steps = args.steps;
    if (args.status !== undefined) patch.status = args.status;
    await ctx.db.patch(args.sequenceId, patch);
    return { success: true };
  },
});

export const deleteSequence = mutation({
  args: {
    clerkUserId: v.string(),
    sequenceId: v.id("outreachSequences"),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.sequenceId);
    if (!row) throw new Error("Sequence not found");
    if (row.clerkUserId !== args.clerkUserId) throw new Error("Unauthorized");
    await ctx.db.delete(args.sequenceId);
    return { success: true };
  },
});
