import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { PLAN_LIMITS, normalizePlan } from "../lib/plans";
import { getCurrentUserId } from "./lib/spec";

/**
 * Get current usage for a specific metric for the authenticated user
 */
export const getUsage = query({
  args: {
    metric: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentUserId(ctx);
    if (!clerkUserId) return 0;

    const today = new Date().toISOString().split("T")[0];
    const usage = await ctx.db
      .query("userUsage")
      .withIndex("by_user_metric_date", (q) =>
        q.eq("clerkUserId", clerkUserId).eq("metric", args.metric).eq("date", today)
      )
      .first();

    return usage?.count ?? 0;
  },
});

/**
 * Check if the user has enough credits and increment usage
 */
export const checkAndIncrementUsage = mutation({
  args: {
    metric: v.string(),
    increment: v.number(),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentUserId(ctx);
    if (!clerkUserId) {
      throw new Error("Unauthorized");
    }

    // 1. Get user's plan from their organization
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", clerkUserId))
      .first();
    
    let plan = normalizePlan(org?.plan);
    
    // STRICT HABIT LOCK: Downgrade effective plan to "free" if trial expired.
    if (org?.trialEndsAt && Date.now() > org.trialEndsAt) {
      plan = "free";
    }

    const limits = PLAN_LIMITS[plan];
    const limit = (limits as any)[args.metric];

    if (limit === undefined) {
      throw new Error(`Invalid metric: ${args.metric}`);
    }

    // 2. Get current daily usage
    const today = new Date().toISOString().split("T")[0];
    const usageRecord = await ctx.db
      .query("userUsage")
      .withIndex("by_user_metric_date", (q) =>
        q.eq("clerkUserId", clerkUserId).eq("metric", args.metric).eq("date", today)
      )
      .first();

    const currentCount = usageRecord?.count ?? 0;

    // 3. Check if they have reached their limit
    if (currentCount + args.increment > limit) {
      return { 
        success: false, 
        error: "Limit reached", 
        limit, 
        currentCount,
        metric: args.metric
      };
    }

    // 4. Update or create the usage record
    if (usageRecord) {
      await ctx.db.patch(usageRecord._id, {
        count: currentCount + args.increment,
      });
    } else {
      await ctx.db.insert("userUsage", {
        clerkUserId,
        metric: args.metric,
        date: today,
        count: args.increment,
      });
    }

    return { 
      success: true, 
      count: currentCount + args.increment, 
      limit,
      metric: args.metric 
    };
  },
});

/**
 * Get all usage metrics for the current user for today
 */
export const getAllUsage = query({
  handler: async (ctx) => {
    const clerkUserId = await getCurrentUserId(ctx);
    if (!clerkUserId) return [];

    const today = new Date().toISOString().split("T")[0];
    const usage = await ctx.db
      .query("userUsage")
      .withIndex("by_user_metric_date", (q) =>
        q.eq("clerkUserId", clerkUserId)
      )
      .filter(q => q.eq(q.field("date"), today))
      .collect();

    return usage;
  },
});
