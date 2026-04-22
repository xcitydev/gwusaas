import { v } from "convex/values";
import { mutation, query, action, internalQuery } from "./_generated/server";
import { verifyProjectAccess } from "./lib/spec";
import { internal } from "./_generated/api";

/**
 * Create a new lead
 */
export const create = mutation({
  args: {
    projectId: v.id("project"),
    source: v.string(), // "instagram" | "website" | "manual"
    handleOrEmail: v.string(),
    message: v.optional(v.string()),
    status: v.optional(v.string()), // defaults to "new"
  },
  handler: async (ctx, args) => {
    // Verify access
    await verifyProjectAccess(ctx, args.projectId);

    const now = Date.now();
    const leadId = await ctx.db.insert("lead", {
      projectId: args.projectId,
      source: args.source,
      handleOrEmail: args.handleOrEmail,
      message: args.message,
      status: args.status || "new",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, leadId };
  },
});

/**
 * Update a lead
 */
export const update = mutation({
  args: {
    leadId: v.id("lead"),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    // Verify access to the project
    await verifyProjectAccess(ctx, lead.projectId);

    await ctx.db.patch(args.leadId, {
      ...(args.status && { status: args.status }),
      ...(args.notes !== undefined && { notes: args.notes }),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * List leads with pagination and filters
 */
export const list = query({
  args: {
    projectId: v.id("project"),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify access
    await verifyProjectAccess(ctx, args.projectId);

    let query = ctx.db
      .query("lead")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId));

    const leads = await query.collect();

    // Filter by status if provided
    let filtered = leads;
    if (args.status) {
      filtered = filtered.filter((lead) => lead.status === args.status);
    }

    // Filter by date range if provided
    if (args.startDate || args.endDate) {
      filtered = filtered.filter((lead) => {
        if (args.startDate && lead.createdAt < args.startDate) return false;
        if (args.endDate && lead.createdAt > args.endDate) return false;
        return true;
      });
    }

    // Sort by createdAt descending
    filtered.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    const limit = args.limit || 100;
    const limited = filtered.slice(0, limit);

    return {
      leads: limited,
      total: filtered.length,
    };
  },
});

export const getProjectForExport = internalQuery({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => ctx.db.get(args.projectId),
});

export const getLeadsForExport = internalQuery({
  args: {
    projectId: v.id("project"),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const leads = await ctx.db.query("lead")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .collect();
    let filtered = leads;
    if (args.status) filtered = filtered.filter((l) => l.status === args.status);
    if (args.startDate || args.endDate) {
      filtered = filtered.filter((l) => {
        if (args.startDate && l.createdAt < args.startDate) return false;
        if (args.endDate && l.createdAt > args.endDate) return false;
        return true;
      });
    }
    filtered.sort((a, b) => b.createdAt - a.createdAt);
    return filtered;
  },
});

/**
 * Export leads as CSV
 */
export const exportCsv = action({
  args: {
    projectId: v.id("project"),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ csv: string; filename: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const project = await ctx.runQuery(internal.leads.getProjectForExport, { projectId: args.projectId });
    if (!project) throw new Error("Project not found");
    if (project.clerkUserId !== identity.subject) throw new Error("Unauthorized: You don't have access to this project");

    const result = await ctx.runQuery(internal.leads.getLeadsForExport, {
      projectId: args.projectId,
      status: args.status,
      startDate: args.startDate,
      endDate: args.endDate,
    });

    // Generate CSV
    const headers = ["Date", "Source", "Handle/Email", "Message", "Status", "Notes"];
    const rows = result.map((lead) => {
      const date = new Date(lead.createdAt).toISOString();
      return [
        date,
        lead.source,
        lead.handleOrEmail,
        lead.message || "",
        lead.status,
        lead.notes || "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    // Return as base64 encoded string that frontend can download
    const base64 = Buffer.from(csvContent).toString("base64");

    return {
      csv: base64,
      filename: `leads-export-${Date.now()}.csv`,
    };
  },
});

