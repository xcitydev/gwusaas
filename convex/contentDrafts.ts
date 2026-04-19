import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyUserAccess, getCurrentUserProfile } from "./lib/spec";

/**
 * Create a new content draft
 */
export const create = mutation({
  args: {
    contentType: v.string(),
    topic: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    tone: v.optional(v.string()),
    referenceArticles: v.optional(v.string()),
    keywords: v.optional(v.string()),
    mainTopic: v.optional(v.string()),
    goal: v.optional(v.string()),
    emailListSegment: v.optional(v.string()),
    exampleNewsletters: v.optional(v.string()),
    graphicsLink: v.optional(v.string()),
    designTexts: v.optional(v.array(v.string())),
    logoUrl: v.optional(v.string()),
    designExamples: v.optional(v.string()),
    colors: v.optional(v.string()),
    googleDriveLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { profile } = await verifyUserAccess(ctx);
    
    const now = Date.now();
    const draftId = await ctx.db.insert("contentDraft", {
      clerkUserId: profile.clerkUserId,
      contentType: args.contentType,
      status: "draft",
      topic: args.topic,
      targetAudience: args.targetAudience,
      tone: args.tone,
      referenceArticles: args.referenceArticles,
      keywords: args.keywords,
      mainTopic: args.mainTopic,
      goal: args.goal,
      emailListSegment: args.emailListSegment,
      exampleNewsletters: args.exampleNewsletters,
      graphicsLink: args.graphicsLink,
      designTexts: args.designTexts,
      logoUrl: args.logoUrl,
      designExamples: args.designExamples,
      colors: args.colors,
      googleDriveLink: args.googleDriveLink,
      createdBy: profile._id as any,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, draftId };
  },
});

/**
 * List content drafts for the current user
 */
export const list = query({
  args: {
    organizationId: v.optional(v.id("organizations")), // Optional for now to maintain compatibility
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentUserProfile(ctx);
    if (!profile) return [];

    return await ctx.db
      .query("contentDraft")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", profile.clerkUserId))
      .collect();
  },
});
