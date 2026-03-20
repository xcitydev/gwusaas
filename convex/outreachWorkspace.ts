import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listCampaigns = query({
  args: { clerkUserId: v.string(), clientId: v.string() },
  handler: async (ctx, args) => {
    const campaigns = await ctx.db
      .query("dmCampaigns")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .collect();
    return campaigns.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const createCampaign = mutation({
  args: {
    clerkUserId: v.string(),
    clientId: v.string(),
    campaignName: v.string(),
    platform: v.string(),
    messageType: v.string(),
    script: v.string(),
    targets: v.array(
      v.object({
        instagramUsername: v.string(),
        fullName: v.optional(v.string()),
        followerCount: v.optional(v.number()),
        bio: v.optional(v.string()),
        profileUrl: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const campaignId = await ctx.db.insert("dmCampaigns", {
      ownerUserId: args.clerkUserId,
      clientId: args.clientId,
      campaignName: args.campaignName,
      platform: args.platform,
      messageType: args.messageType,
      script: args.script,
      status: "active",
      totalTargets: args.targets.length,
      totalSent: 0,
      totalReplies: 0,
      totalBooked: 0,
      totalClosed: 0,
      startedAt: now,
      createdAt: now,
    });

    for (const target of args.targets) {
      await ctx.db.insert("dmContacts", {
        ownerUserId: args.clerkUserId,
        campaignId,
        clientId: args.clientId,
        instagramUsername: target.instagramUsername.replace(/^@/, "").toLowerCase(),
        fullName: target.fullName,
        followerCount: target.followerCount,
        bio: target.bio,
        profileUrl: target.profileUrl,
        qualificationScore: 0,
        qualificationStatus: "maybe",
        qualificationReason: "Added manually",
        dmStatus: "pending",
        followUpCount: 0,
        createdAt: now,
      });
    }

    return campaignId;
  },
});

export const getCampaignDetail = query({
  args: { campaignId: v.id("dmCampaigns"), clientId: v.string() },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.clientId !== args.clientId) return null;

    const contacts = await ctx.db
      .query("dmContacts")
      .withIndex("by_campaign_id", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    return {
      campaign,
      contacts: contacts.sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});

export const updateContactStatus = mutation({
  args: {
    contactId: v.id("dmContacts"),
    dmStatus: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) throw new Error("Contact not found");

    const patch: Record<string, unknown> = {
      dmStatus: args.dmStatus,
      ...(args.note !== undefined ? { notes: args.note } : {}),
    };
    const now = Date.now();
    if (args.dmStatus === "sent") patch.dmSentAt = now;
    if (args.dmStatus === "replied") patch.dmRepliedAt = now;
    if (args.dmStatus === "booked") patch.lastFollowUpAt = now;

    await ctx.db.patch(args.contactId, patch);
    return { success: true };
  },
});

export const createDealFromContact = mutation({
  args: {
    contactId: v.id("dmContacts"),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.clientId !== args.clientId) {
      throw new Error("Contact not found");
    }

    const existing = await ctx.db
      .query("deals")
      .withIndex("by_contact_id", (q) => q.eq("contactId", args.contactId))
      .first();
    if (existing) return existing._id;

    return ctx.db.insert("deals", {
      ownerUserId: contact.ownerUserId,
      contactId: contact._id,
      clientId: contact.clientId,
      campaignId: contact.campaignId,
      stage: "contacted",
      currency: "USD",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const listDeals = query({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    const deals = await ctx.db
      .query("deals")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .collect();
    return deals.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const updateDeal = mutation({
  args: {
    dealId: v.id("deals"),
    stage: v.optional(v.string()),
    dealValue: v.optional(v.number()),
    notes: v.optional(v.string()),
    lostReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const deal = await ctx.db.get(args.dealId);
    if (!deal) throw new Error("Deal not found");
    const now = Date.now();
    await ctx.db.patch(args.dealId, {
      ...(args.stage !== undefined ? { stage: args.stage } : {}),
      ...(args.dealValue !== undefined ? { dealValue: args.dealValue } : {}),
      ...(args.notes !== undefined ? { notes: args.notes } : {}),
      ...(args.lostReason !== undefined ? { lostReason: args.lostReason } : {}),
      ...(args.stage === "closed_won" || args.stage === "closed_lost"
        ? { closedAt: now }
        : {}),
      updatedAt: now,
    });
    return { success: true };
  },
});

export const listScrapedFollowers = query({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    const followers = await ctx.db
      .query("scrapedFollowers")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .collect();
    return followers.sort((a, b) => b.scrapedAt - a.scrapedAt);
  },
});

export const saveScrapeJob = mutation({
  args: {
    clerkUserId: v.string(),
    clientId: v.string(),
    sourceAccount: v.string(),
    status: v.string(),
    totalFound: v.number(),
    totalQualified: v.number(),
    errorMessage: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("scrapeJobs", {
      ownerUserId: args.clerkUserId,
      clientId: args.clientId,
      sourceAccount: args.sourceAccount,
      status: args.status,
      totalFound: args.totalFound,
      totalQualified: args.totalQualified,
      errorMessage: args.errorMessage,
      startedAt: Date.now(),
      completedAt: args.completedAt,
    });
  },
});

export const saveScrapedFollowers = mutation({
  args: {
    clerkUserId: v.string(),
    clientId: v.string(),
    sourceAccount: v.string(),
    followers: v.array(
      v.object({
        instagramUsername: v.string(),
        fullName: v.optional(v.string()),
        followerCount: v.optional(v.number()),
        bio: v.optional(v.string()),
        profileUrl: v.optional(v.string()),
        isPrivate: v.boolean(),
        isVerified: v.boolean(),
        qualificationScore: v.number(),
        qualificationStatus: v.string(),
        qualificationReason: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const item of args.followers) {
      await ctx.db.insert("scrapedFollowers", {
        ownerUserId: args.clerkUserId,
        clientId: args.clientId,
        sourceAccount: args.sourceAccount,
        instagramUsername: item.instagramUsername.replace(/^@/, "").toLowerCase(),
        fullName: item.fullName,
        followerCount: item.followerCount,
        bio: item.bio,
        profileUrl: item.profileUrl,
        isPrivate: item.isPrivate,
        isVerified: item.isVerified,
        qualificationScore: item.qualificationScore,
        qualificationStatus: item.qualificationStatus,
        qualificationReason: item.qualificationReason,
        addedToCampaign: false,
        scrapedAt: now,
      });
    }
    return { success: true };
  },
});
