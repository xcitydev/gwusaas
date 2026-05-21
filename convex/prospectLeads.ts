import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const leadSchema = v.object({
  name: v.string(),
  email: v.string(),
  phone: v.string(),
  company: v.string(),
  jobTitle: v.string(),
  industry: v.string(),
  location: v.string(),
  linkedin: v.string(),
  website: v.string(),
  painPoint: v.string(),
  outreachAngle: v.string(),
  confidence: v.number(),
});

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

/**
 * Server-side batch insert. Called from Next.js API routes after they've
 * already authenticated the user via Clerk. Takes `clerkUserId` as an arg
 * to match the existing aiHistory.* pattern. Idempotent: existing rows
 * with the same (clerkUserId, emailLower) are skipped.
 */
export const saveBatch = mutation({
  args: {
    clerkUserId: v.string(),
    source: v.string(),
    sourceQuery: v.optional(v.string()),
    leads: v.array(leadSchema),
  },
  handler: async (ctx, { clerkUserId, source, sourceQuery, leads }) => {
    let inserted = 0;
    let skipped = 0;
    const now = Date.now();

    for (const lead of leads) {
      const emailLower = normalizeEmail(lead.email);
      if (!emailLower) {
        skipped++;
        continue;
      }

      const existing = await ctx.db
        .query("prospectLeads")
        .withIndex("by_user_and_email", (q) =>
          q.eq("clerkUserId", clerkUserId).eq("emailLower", emailLower),
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("prospectLeads", {
        clerkUserId,
        name: lead.name,
        email: lead.email,
        emailLower,
        phone: lead.phone,
        company: lead.company,
        jobTitle: lead.jobTitle,
        industry: lead.industry,
        location: lead.location,
        linkedin: lead.linkedin,
        website: lead.website,
        painPoint: lead.painPoint,
        outreachAngle: lead.outreachAngle,
        confidence: lead.confidence,
        source,
        sourceQuery,
        createdAt: now,
      });
      inserted++;
    }

    return { inserted, skipped, total: leads.length };
  },
});

/**
 * Paginated list of the current user's saved leads, newest first.
 * Optional `search` filters by name/email/company case-insensitively.
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, { limit, search, source }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const cap = Math.min(Math.max(limit ?? 50, 1), 500);
    const rows = await ctx.db
      .query("prospectLeads")
      .withIndex("by_clerk_user_id_created_at", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .order("desc")
      .take(cap);

    let filtered = rows;
    if (source) {
      filtered = filtered.filter((r) => r.source === source);
    }
    if (search) {
      const needle = search.trim().toLowerCase();
      if (needle) {
        filtered = filtered.filter(
          (r) =>
            r.name.toLowerCase().includes(needle) ||
            r.emailLower.includes(needle) ||
            r.company.toLowerCase().includes(needle) ||
            r.jobTitle.toLowerCase().includes(needle),
        );
      }
    }
    return filtered;
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    // Cap collection at 1000 so we don't blow context on huge user libraries.
    const rows = await ctx.db
      .query("prospectLeads")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .take(1000);
    return rows.length;
  },
});

export const get = query({
  args: { id: v.id("prospectLeads") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const row = await ctx.db.get(id);
    if (!row || row.clerkUserId !== identity.subject) return null;
    return row;
  },
});

export const remove = mutation({
  args: { id: v.id("prospectLeads") },
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

export const removeMany = mutation({
  args: { ids: v.array(v.id("prospectLeads")) },
  handler: async (ctx, { ids }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    let deleted = 0;
    for (const id of ids) {
      const row = await ctx.db.get(id);
      if (!row || row.clerkUserId !== identity.subject) continue;
      await ctx.db.delete(id);
      deleted++;
    }
    return { deleted };
  },
});
