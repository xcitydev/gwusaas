import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function randomToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const getConfig = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("whitelabelConfigs")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getClients = query({
  args: { agencyUserId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("whitelabelClients")
      .withIndex("by_agency_user_id", (q) => q.eq("agencyUserId", args.agencyUserId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getClient = query({
  args: { clientId: v.id("whitelabelClients"), agencyUserId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.clientId);
    if (!row || row.agencyUserId !== args.agencyUserId) return null;
    return row;
  },
});

export const getClientByInviteToken = query({
  args: { inviteToken: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("whitelabelClients")
      .withIndex("by_invite_token", (q) => q.eq("inviteToken", args.inviteToken))
      .first();
  },
});

export const getConfigByDomain = query({
  args: { customDomain: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.customDomain.toLowerCase().trim();
    return ctx.db
      .query("whitelabelConfigs")
      .withIndex("by_custom_domain", (q) => q.eq("customDomain", normalized))
      .first();
  },
});

export const getDomainVerification = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("whitelabelDomainVerifications")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const saveConfig = mutation({
  args: {
    userId: v.string(),
    agencyName: v.string(),
    platformName: v.string(),
    logoUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    primaryColor: v.string(),
    secondaryColor: v.string(),
    customDomain: v.optional(v.string()),
    supportEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("whitelabelConfigs")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    const normalizedDomain = args.customDomain?.toLowerCase().trim() || undefined;
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        customDomain: normalizedDomain,
        domainVerified:
          normalizedDomain && normalizedDomain === existing.customDomain
            ? existing.domainVerified
            : false,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("whitelabelConfigs", {
      ...args,
      customDomain: normalizedDomain,
      domainVerified: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const inviteClient = mutation({
  args: {
    agencyUserId: v.string(),
    clientName: v.string(),
    clientEmail: v.string(),
    clientBusinessName: v.optional(v.string()),
    plan: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const inviteToken = randomToken();
    const id = await ctx.db.insert("whitelabelClients", {
      agencyUserId: args.agencyUserId,
      clientName: args.clientName,
      clientEmail: args.clientEmail,
      clientBusinessName: args.clientBusinessName,
      plan: args.plan,
      status: "invited",
      inviteToken,
      createdAt: now,
      updatedAt: now,
    });
    return { clientId: id, inviteToken };
  },
});

export const acceptInvite = mutation({
  args: { inviteToken: v.string(), clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("whitelabelClients")
      .withIndex("by_invite_token", (q) => q.eq("inviteToken", args.inviteToken))
      .first();
    if (!row) throw new Error("Invite not found");

    await ctx.db.patch(row._id, {
      clerkUserId: args.clerkUserId,
      status: "active",
      inviteToken: undefined,
      updatedAt: Date.now(),
    });

    return { agencyUserId: row.agencyUserId, plan: row.plan, clientId: row._id };
  },
});

export const updateClientStatus = mutation({
  args: {
    agencyUserId: v.string(),
    clientId: v.id("whitelabelClients"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.clientId);
    if (!row || row.agencyUserId !== args.agencyUserId) {
      throw new Error("Client not found");
    }
    await ctx.db.patch(args.clientId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return args.clientId;
  },
});

export const saveDomainVerification = mutation({
  args: {
    userId: v.string(),
    domain: v.string(),
  },
  handler: async (ctx, args) => {
    const domain = args.domain.toLowerCase().trim();
    const txtRecord = `boolspace-verify=${randomToken()}`;
    const existing = await ctx.db
      .query("whitelabelDomainVerifications")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        domain,
        txtRecord,
        verified: false,
        lastCheckedAt: now,
      });
      return { id: existing._id, txtRecord };
    }

    const id = await ctx.db.insert("whitelabelDomainVerifications", {
      userId: args.userId,
      domain,
      txtRecord,
      verified: false,
      lastCheckedAt: now,
      createdAt: now,
    });
    return { id, txtRecord };
  },
});

export const markDomainVerified = mutation({
  args: { userId: v.string(), domain: v.string() },
  handler: async (ctx, args) => {
    const domain = args.domain.toLowerCase().trim();
    const verification = await ctx.db
      .query("whitelabelDomainVerifications")
      .withIndex("by_domain", (q) => q.eq("domain", domain))
      .first();
    if (!verification || verification.userId !== args.userId) {
      throw new Error("Verification record not found");
    }

    await ctx.db.patch(verification._id, {
      verified: true,
      lastCheckedAt: Date.now(),
    });

    const config = await ctx.db
      .query("whitelabelConfigs")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
    if (config) {
      await ctx.db.patch(config._id, {
        customDomain: domain,
        domainVerified: true,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});
