import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserProfile } from "./lib/spec";
import { Id } from "./_generated/dataModel";

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const profile = await getCurrentUserProfile(ctx);
    if (!profile) throw new Error("User profile not found");

    const now = Date.now();
    const campaignId = await ctx.db.insert("outreachCampaign", {
      clerkUserId: identity.subject,
      instagramUsername: args.instagramUsername,
      instagramPassword: args.instagramPassword,
      backupCodes: args.backupCodes,
      idealClient: args.idealClient,
      targetAccounts: args.targetAccounts,
      outreachScript: args.outreachScript,
      allowFollow: args.allowFollow,
      enableEngagement: args.enableEngagement,
      status: "setup",
      createdBy: profile._id as Id<"profile">,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, campaignId };
  },
});

export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const campaigns = await ctx.db
      .query("outreachCampaign")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .collect();

    if (args.status) return campaigns.filter((c) => c.status === args.status);
    return campaigns;
  },
});

export const get = query({
  args: { campaignId: v.id("outreachCampaign") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.clerkUserId !== identity.subject) return null;
    return campaign;
  },
});

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
  handler: async (ctx, { campaignId, ...patch }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const campaign = await ctx.db.get(campaignId);
    if (!campaign || campaign.clerkUserId !== identity.subject) throw new Error("Not found");

    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(campaignId, { ...defined, updatedAt: Date.now() });
    return { success: true };
  },
});
