import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyProjectAccess } from "./lib/spec";

/**
 * Save a step of onboarding data
 */
export const saveStep = mutation({
  args: {
    projectId: v.id("project"),
    stepData: v.object({
      brandTone: v.optional(v.string()),
      colorPalette: v.optional(v.string()),
      goals: v.optional(v.string()),
      targetAudience: v.optional(v.string()),
      competitors: v.optional(v.string()),
      designStyle: v.optional(v.string()),
      uploads: v.optional(v.array(v.object({
        name: v.string(),
        url: v.string(),
      }))),
    }),
  },
  handler: async (ctx, args) => {
    // Verify access
    await verifyProjectAccess(ctx, args.projectId);

    // Get existing onboarding or create new
    const existing = await ctx.db
      .query("onboardingResponse")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .first();

    // Calculate progress based on filled fields
    const fields = [
      args.stepData.brandTone,
      args.stepData.colorPalette,
      args.stepData.goals,
      args.stepData.targetAudience,
      args.stepData.competitors,
      args.stepData.designStyle,
    ];
    const filledFields = fields.filter((f) => f && f.trim().length > 0).length;
    const progress = Math.min(100, Math.round((filledFields / 6) * 100));

    const now = Date.now();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        ...args.stepData,
        progress,
        updatedAt: now,
      });
      return { success: true, progress };
    } else {
      // Create new
      await ctx.db.insert("onboardingResponse", {
        projectId: args.projectId,
        ...args.stepData,
        progress,
        completed: false,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, progress };
    }
  },
});

/**
 * Mark onboarding as complete
 */
export const complete = mutation({
  args: {
    projectId: v.id("project"),
  },
  handler: async (ctx, args) => {
    // Verify access
    await verifyProjectAccess(ctx, args.projectId);

    const existing = await ctx.db
      .query("onboardingResponse")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!existing) {
      throw new Error("Onboarding not found");
    }

    await ctx.db.patch(existing._id, {
      completed: true,
      progress: 100,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get onboarding data for a project
 */
export const get = query({
  args: {
    projectId: v.id("project"),
  },
  handler: async (ctx, args) => {
    // Verify access
    await verifyProjectAccess(ctx, args.projectId);

    const onboarding = await ctx.db
      .query("onboardingResponse")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .first();

    return onboarding;
  },
});

