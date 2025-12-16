import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Internal mutation to log audit events
 */
export const log = internalMutation({
  args: {
    organizationId: v.id("organization"),
    actorUserId: v.string(),
    action: v.string(),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      actorUserId: args.actorUserId,
      action: args.action,
      meta: args.meta,
      createdAt: Date.now(),
    });
  },
});

