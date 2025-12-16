import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyUserAccess, getCurrentUserProfile, getCurrentUserId } from "./lib/spec";

/**
 * Create a new outreach campaign
 */
export const create = mutation({
  args: {
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
    // Verify user is authenticated
    const access = await verifyUserAccess(ctx);
    const profile = await getCurrentUserProfile(ctx);
    
    if (!profile) {
      throw new Error("User profile not found");
    }

    const now = Date.now();
    const campaignId = await ctx.db.insert("outreachCampaign", {
      clerkUserId: access.profile.clerkUserId,
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
 * List outreach campaigns for the current user
 */
export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized: No user session");
    }

    let query = ctx.db
      .query("outreachCampaign")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId.subject));

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
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: No user session");
    }

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      return null;
    }

    // Verify user owns this campaign
    if (campaign.clerkUserId !== userId) {
      throw new Error("Unauthorized: You don't have access to this campaign");
    }

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
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: No user session");
    }

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Verify user owns this campaign
    if (campaign.clerkUserId !== userId) {
      throw new Error("Unauthorized: You don't have access to this campaign");
    }

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


