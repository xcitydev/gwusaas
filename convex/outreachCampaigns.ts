import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyOrgAccess, getCurrentUserProfile } from "./lib/spec";

/**
 * Create a new outreach campaign
 */
export const create = mutation({
  args: {
    organizationId: v.id("organization"),
    instagramUsername: v.string(),
    instagramPassword: v.optional(v.string()),
    backupCodes: v.optional(v.string()),
    idealClient: v.optional(v.string()),
    targetAccounts: v.optional(v.array(v.string())),
    outreachScript: v.optional(v.string()),
    allowFollow: v.boolean(),
    enableEngagement: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verify access
    const access = await verifyOrgAccess(ctx, args.organizationId);
    const profile = await getCurrentUserProfile(ctx);
    
    if (!profile) {
      throw new Error("User profile not found");
    }

    const now = Date.now();
    const campaignId = await ctx.db.insert("outreachCampaign", {
      organizationId: args.organizationId,
      instagramUsername: args.instagramUsername,
      instagramPassword: args.instagramPassword, // TODO: Encrypt in production
      backupCodes: args.backupCodes, // TODO: Encrypt in production
      idealClient: args.idealClient,
      targetAccounts: args.targetAccounts,
      outreachScript: args.outreachScript,
      allowFollow: args.allowFollow,
      enableEngagement: args.enableEngagement,
      status: "setup",
      createdBy: profile._id,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, campaignId };
  },
});

/**
 * List outreach campaigns for an organization
 */
export const list = query({
  args: {
    organizationId: v.id("organization"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify access
    await verifyOrgAccess(ctx, args.organizationId);

    let query = ctx.db
      .query("outreachCampaign")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId));

    const campaigns = await query.collect();

    // Filter by status if provided
    if (args.status) {
      return campaigns.filter((c) => c.status === args.status);
    }

    return campaigns;
  },
});

/**
 * Get a single outreach campaign
 */
export const get = query({
  args: {
    campaignId: v.id("outreachCampaign"),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      return null;
    }

    // Verify access
    await verifyOrgAccess(ctx, campaign.organizationId);

    return campaign;
  },
});

/**
 * Update outreach campaign
 */
export const update = mutation({
  args: {
    campaignId: v.id("outreachCampaign"),
    status: v.optional(v.string()),
    instagramPassword: v.optional(v.string()),
    backupCodes: v.optional(v.string()),
    idealClient: v.optional(v.string()),
    targetAccounts: v.optional(v.array(v.string())),
    outreachScript: v.optional(v.string()),
    allowFollow: v.optional(v.boolean()),
    enableEngagement: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Verify access
    await verifyOrgAccess(ctx, campaign.organizationId);

    await ctx.db.patch(args.campaignId, {
      ...(args.status && { status: args.status }),
      ...(args.instagramPassword !== undefined && { instagramPassword: args.instagramPassword }),
      ...(args.backupCodes !== undefined && { backupCodes: args.backupCodes }),
      ...(args.idealClient !== undefined && { idealClient: args.idealClient }),
      ...(args.targetAccounts !== undefined && { targetAccounts: args.targetAccounts }),
      ...(args.outreachScript !== undefined && { outreachScript: args.outreachScript }),
      ...(args.allowFollow !== undefined && { allowFollow: args.allowFollow }),
      ...(args.enableEngagement !== undefined && { enableEngagement: args.enableEngagement }),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});


