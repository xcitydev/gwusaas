import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { verifyProjectAccess, getCurrentUserId } from "./lib/spec";

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
  handler: async (ctx, args) => {
    // Verify access
    const project = await ctx.runQuery(async (ctx) => {
      return await ctx.db.get(args.projectId);
    });
    if (!project) {
      throw new Error("Project not found");
    }
    
    // Verify user owns the project
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    if (project.clerkUserId !== userId) {
      throw new Error("Unauthorized: You don't have access to this project");
    }

    // Get leads
    const result = await ctx.runQuery(
      async (ctx) => {
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

        return filtered;
      }
    );

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

