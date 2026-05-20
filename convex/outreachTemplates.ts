import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveTemplate = mutation({
  args: {
    clerkUserId: v.string(),
    clientId: v.optional(v.string()),
    channel: v.string(),
    name: v.string(),
    tags: v.array(v.string()),
    steps: v.any(),
    sourceInput: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("outreachTemplates", {
      clerkUserId: args.clerkUserId,
      clientId: args.clientId,
      channel: args.channel,
      name: args.name,
      tags: args.tags,
      steps: args.steps,
      sourceInput: args.sourceInput,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listTemplates = query({
  args: {
    clerkUserId: v.string(),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = args.channel
      ? await ctx.db
          .query("outreachTemplates")
          .withIndex("by_clerk_user_id_channel", (q) =>
            q.eq("clerkUserId", args.clerkUserId).eq("channel", args.channel as string),
          )
          .collect()
      : await ctx.db
          .query("outreachTemplates")
          .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
          .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getTemplate = query({
  args: {
    clerkUserId: v.string(),
    templateId: v.id("outreachTemplates"),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.templateId);
    if (!row) return null;
    if (row.clerkUserId !== args.clerkUserId) throw new Error("Unauthorized");
    return row;
  },
});

export const updateTemplate = mutation({
  args: {
    clerkUserId: v.string(),
    templateId: v.id("outreachTemplates"),
    name: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    steps: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.templateId);
    if (!row) throw new Error("Template not found");
    if (row.clerkUserId !== args.clerkUserId) throw new Error("Unauthorized");
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.steps !== undefined) patch.steps = args.steps;
    await ctx.db.patch(args.templateId, patch);
    return { success: true };
  },
});

export const deleteTemplate = mutation({
  args: {
    clerkUserId: v.string(),
    templateId: v.id("outreachTemplates"),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.templateId);
    if (!row) throw new Error("Template not found");
    if (row.clerkUserId !== args.clerkUserId) throw new Error("Unauthorized");
    await ctx.db.delete(args.templateId);
    const metrics = await ctx.db
      .query("outreachTemplateMetrics")
      .withIndex("by_template_id", (q) => q.eq("templateId", args.templateId))
      .collect();
    for (const m of metrics) {
      await ctx.db.delete(m._id);
    }
    return { success: true };
  },
});
