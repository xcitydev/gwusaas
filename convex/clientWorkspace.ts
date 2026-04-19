import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_DIRECT_CLIENT_PREFIX = "direct:";

function asDirectClientId(userId: string) {
  return `${DEFAULT_DIRECT_CLIENT_PREFIX}${userId}`;
}

export const getWorkspace = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profile")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!profile) return null;

    const userType = profile.userType || "client";
    if (userType !== "agency") {
      return {
        userType: "client",
        selectedClient: {
          id: asDirectClientId(args.clerkUserId),
          clientName: profile.fullName || "My Account",
          clientEmail: profile.email || "",
          instagramUsername: "",
          niche: "General",
          notes: "",
          status: "active",
          addedAt: profile.createdAt,
          avatarUrl: undefined,
          isDirect: true,
        },
        clients: [] as Array<Record<string, unknown>>,
      };
    }

    if (!profile.organizationId) {
      return {
        userType: "agency",
        selectedClient: null,
        clients: [] as Array<Record<string, unknown>>,
      };
    }

    const clients = await ctx.db
      .query("orgClients")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", profile.organizationId!))
      .collect();

    const sortedClients = clients.sort((a, b) => b.addedAt - a.addedAt);
    return {
      userType: "agency",
      selectedClient: sortedClients[0] || null,
      clients: sortedClients,
    };
  },
});

export const setUserType = mutation({
  args: {
    clerkUserId: v.string(),
    userType: v.string(), // "client" | "agency"
    agencyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profile")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!profile) throw new Error("Profile not found");

    let organizationId = profile.organizationId;
    if (args.userType === "agency" && !organizationId) {
      organizationId = await ctx.db.insert("organizations", {
        ownerId: args.clerkUserId,
        name: args.agencyName || "My Agency",
        plan: "starter",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(profile._id, {
      userType: args.userType,
      organizationId,
      updatedAt: Date.now(),
    });

    return { success: true, organizationId };
  },
});

export const addOrgClient = mutation({
  args: {
    clerkUserId: v.string(),
    clientName: v.string(),
    clientEmail: v.string(),
    instagramUsername: v.string(),
    niche: v.string(),
    notes: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profile")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!profile || (profile.userType || "client") !== "agency" || !profile.organizationId) {
      throw new Error("Only agencies can add clients");
    }

    return ctx.db.insert("orgClients", {
      organizationId: profile.organizationId,
      clientName: args.clientName,
      clientEmail: args.clientEmail,
      instagramUsername: args.instagramUsername.replace(/^@/, "").toLowerCase(),
      niche: args.niche,
      notes: args.notes,
      status: "active",
      addedAt: Date.now(),
      avatarUrl: args.avatarUrl,
    });
  },
});

export const updateOrgClient = mutation({
  args: {
    clerkUserId: v.string(),
    clientId: v.id("orgClients"),
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    instagramUsername: v.optional(v.string()),
    niche: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profile")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
    if (!profile || !profile.organizationId) throw new Error("Unauthorized");

    const client = await ctx.db.get(args.clientId);
    if (!client || client.organizationId !== profile.organizationId) {
      throw new Error("Client not found");
    }

    await ctx.db.patch(args.clientId, {
      ...(args.clientName !== undefined ? { clientName: args.clientName } : {}),
      ...(args.clientEmail !== undefined ? { clientEmail: args.clientEmail } : {}),
      ...(args.instagramUsername !== undefined
        ? { instagramUsername: args.instagramUsername.replace(/^@/, "").toLowerCase() }
        : {}),
      ...(args.niche !== undefined ? { niche: args.niche } : {}),
      ...(args.notes !== undefined ? { notes: args.notes } : {}),
      ...(args.status !== undefined ? { status: args.status } : {}),
      ...(args.avatarUrl !== undefined ? { avatarUrl: args.avatarUrl } : {}),
    });
    return { success: true };
  },
});

export const removeOrgClient = mutation({
  args: {
    clerkUserId: v.string(),
    clientId: v.id("orgClients"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profile")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
    if (!profile || !profile.organizationId) throw new Error("Unauthorized");

    const client = await ctx.db.get(args.clientId);
    if (!client || client.organizationId !== profile.organizationId) {
      throw new Error("Client not found");
    }

    await ctx.db.delete(args.clientId);
    return { success: true };
  },
});

export const getClientStats = query({
  args: {
    clerkUserId: v.string(),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profile")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
    if (!profile) return null;

    const [campaigns, contacts, deals] = await Promise.all([
      ctx.db
        .query("dmCampaigns")
        .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
        .collect(),
      ctx.db
        .query("dmContacts")
        .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
        .collect(),
      ctx.db
        .query("deals")
        .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
        .collect(),
    ]);

    const dmsSent = campaigns.reduce((sum, c) => sum + c.totalSent, 0);
    const replies = campaigns.reduce((sum, c) => sum + c.totalReplies, 0);
    const callsBooked = contacts.filter((c) => c.dmStatus === "booked").length;
    const dealsClosed = deals.filter((d) => d.stage === "closed_won").length;
    return { dmsSent, replies, callsBooked, dealsClosed };
  },
});
