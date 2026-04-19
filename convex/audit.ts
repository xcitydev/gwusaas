import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const log = internalMutation({
  args: {
    clerkUserId: v.string(),
    action: v.string(),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLog", {
      clerkUserId: args.clerkUserId,
      action: args.action,
      meta: args.meta,
      createdAt: Date.now(),
    });
  },
});
