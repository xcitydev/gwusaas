import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserId } from "./lib/spec";

/**
 * List support tickets for a user
 */
export const list = query({
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("supportTickets")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .collect();
  },
});

/**
 * Create a new support ticket
 */
export const create = mutation({
  args: {
    subject: v.string(),
    priority: v.string(),
    category: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const now = Date.now();
    const id = await ctx.db.insert("supportTickets", {
      clerkUserId: userId,
      subject: args.subject,
      priority: args.priority,
      category: args.category,
      description: args.description,
      status: "Open",
      lastUpdate: now,
      createdAt: now,
    });

    return id;
  },
});
