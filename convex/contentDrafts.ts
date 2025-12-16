import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyUserAccess, getCurrentUserProfile } from "./lib/spec";

/**
 * Create a new content draft
 */
export const create = mutation({
  args: {
    contentType: v.string(), // "social_media_design" | "blog_post" | "newsletter"
    // Social Media Design fields
    designTexts: v.optional(v.array(v.string())),
    logoUrl: v.optional(v.string()),
    designExamples: v.optional(v.string()),
    colors: v.optional(v.string()),
    googleDriveLink: v.optional(v.string()),
    // Blog Post fields
    topic: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    tone: v.optional(v.string()),
    referenceArticles: v.optional(v.string()),
    keywords: v.optional(v.string()),
    // Newsletter fields
    mainTopic: v.optional(v.string()),
    goal: v.optional(v.string()),
    emailListSegment: v.optional(v.string()),
    exampleNewsletters: v.optional(v.string()),
    graphicsLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const access = await verifyUserAccess(ctx);
    const profile = await getCurrentUserProfile(ctx);
    
    if (!profile) {
      throw new Error("User profile not found");
    }

    const now = Date.now();
    const draftId = await ctx.db.insert("contentDraft", {
      clerkUserId: access.profile.clerkUserId,
      contentType: args.contentType,
      status: "draft",
      // Social Media Design
      designTexts: args.designTexts,
      logoUrl: args.logoUrl,
      designExamples: args.designExamples,
      colors: args.colors,
      googleDriveLink: args.googleDriveLink,
      // Blog Post
      topic: args.topic,
      targetAudience: args.targetAudience,
      tone: args.tone,
      referenceArticles: args.referenceArticles,
      keywords: args.keywords,
      // Newsletter
      mainTopic: args.mainTopic,
      goal: args.goal,
      emailListSegment: args.emailListSegment,
      exampleNewsletters: args.exampleNewsletters,
      graphicsLink: args.graphicsLink,
      createdBy: profile._id,
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
    contentType: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized: No user session");
    }

    let query = ctx.db
      .query("contentDraft")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId.subject));

    const drafts = await query.collect();

    // Filter by contentType if provided
    let filtered = drafts;
    if (args.contentType) {
      filtered = filtered.filter((d) => d.contentType === args.contentType);
    }

    // Filter by status if provided
    if (args.status) {
      filtered = filtered.filter((d) => d.status === args.status);
    }

    // Sort by createdAt descending
    filtered.sort((a, b) => b.createdAt - a.createdAt);

    return filtered;
  },
});

/**
 * Get a single content draft
 */
export const get = query({
  args: {
    draftId: v.id("contentDraft"),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized: No user session");
    }

    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      return null;
    }

    // Verify user owns this draft
    if (draft.clerkUserId !== userId.subject) {
      throw new Error("Unauthorized: You don't have access to this draft");
    }

    return draft;
  },
});

/**
 * Update content draft
 */
export const update = mutation({
  args: {
    draftId: v.id("contentDraft"),
    status: v.optional(v.string()),
    // Social Media Design fields
    designTexts: v.optional(v.array(v.string())),
    logoUrl: v.optional(v.string()),
    designExamples: v.optional(v.string()),
    colors: v.optional(v.string()),
    googleDriveLink: v.optional(v.string()),
    // Blog Post fields
    topic: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    tone: v.optional(v.string()),
    referenceArticles: v.optional(v.string()),
    keywords: v.optional(v.string()),
    // Newsletter fields
    mainTopic: v.optional(v.string()),
    goal: v.optional(v.string()),
    emailListSegment: v.optional(v.string()),
    exampleNewsletters: v.optional(v.string()),
    graphicsLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized: No user session");
    }

    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found");
    }

    // Verify user owns this draft
    if (draft.clerkUserId !== userId.subject) {
      throw new Error("Unauthorized: You don't have access to this draft");
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.status !== undefined) updateData.status = args.status;
    if (args.designTexts !== undefined) updateData.designTexts = args.designTexts;
    if (args.logoUrl !== undefined) updateData.logoUrl = args.logoUrl;
    if (args.designExamples !== undefined) updateData.designExamples = args.designExamples;
    if (args.colors !== undefined) updateData.colors = args.colors;
    if (args.googleDriveLink !== undefined) updateData.googleDriveLink = args.googleDriveLink;
    if (args.topic !== undefined) updateData.topic = args.topic;
    if (args.targetAudience !== undefined) updateData.targetAudience = args.targetAudience;
    if (args.tone !== undefined) updateData.tone = args.tone;
    if (args.referenceArticles !== undefined) updateData.referenceArticles = args.referenceArticles;
    if (args.keywords !== undefined) updateData.keywords = args.keywords;
    if (args.mainTopic !== undefined) updateData.mainTopic = args.mainTopic;
    if (args.goal !== undefined) updateData.goal = args.goal;
    if (args.emailListSegment !== undefined) updateData.emailListSegment = args.emailListSegment;
    if (args.exampleNewsletters !== undefined) updateData.exampleNewsletters = args.exampleNewsletters;
    if (args.graphicsLink !== undefined) updateData.graphicsLink = args.graphicsLink;

    await ctx.db.patch(args.draftId, updateData);

    return { success: true };
  },
});

