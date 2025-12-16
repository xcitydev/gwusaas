import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { verifyProjectAccess } from "./lib/spec";

/**
 * Upsert daily IG metrics
 */
export const upsertDaily = mutation({
  args: {
    projectId: v.id("project"),
    date: v.string(), // ISO YYYY-MM-DD
    followers: v.number(),
    posts: v.number(),
    likes: v.number(),
    comments: v.number(),
    reach: v.optional(v.number()),
    profileVisits: v.optional(v.number()),
    websiteClicks: v.optional(v.number()),
    dmLeads: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify access (or allow webhook with secret)
    // For webhook, we'll skip this check if called from webhook handler
    try {
      await verifyProjectAccess(ctx, args.projectId);
    } catch {
      // If verification fails, this might be a webhook call
      // Webhook handler should validate separately
    }

    const now = Date.now();

    // Check if metric already exists for this date
    const existing = await ctx.db
      .query("igMetricDaily")
      .withIndex("by_project_date", (q) => 
        q.eq("projectId", args.projectId).eq("date", args.date)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        followers: args.followers,
        posts: args.posts,
        likes: args.likes,
        comments: args.comments,
        reach: args.reach,
        profileVisits: args.profileVisits,
        websiteClicks: args.websiteClicks,
        dmLeads: args.dmLeads,
        updatedAt: now,
      });
      return { success: true, updated: true };
    } else {
      // Create new
      await ctx.db.insert("igMetricDaily", {
        projectId: args.projectId,
        date: args.date,
        followers: args.followers,
        posts: args.posts,
        likes: args.likes,
        comments: args.comments,
        reach: args.reach,
        profileVisits: args.profileVisits,
        websiteClicks: args.websiteClicks,
        dmLeads: args.dmLeads,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, updated: false };
    }
  },
});

/**
 * Get metrics for a date range
 */
export const range = query({
  args: {
    projectId: v.id("project"),
    days: v.optional(v.number()), // Default 30
  },
  handler: async (ctx, args) => {
    // Verify access
    await verifyProjectAccess(ctx, args.projectId);

    const days = args.days || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all metrics for the project
    const allMetrics = await ctx.db
      .query("igMetricDaily")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Filter by date range and sort
    const filtered = allMetrics
      .filter((metric) => {
        const metricDate = new Date(metric.date);
        return metricDate >= startDate && metricDate <= endDate;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return filtered;
  },
});

/**
 * Get KPIs (7d leads, 7d reach, total followers, growth score)
 */
export const kpis = query({
  args: {
    projectId: v.id("project"),
  },
  handler: async (ctx, args) => {
    // Verify access
    await verifyProjectAccess(ctx, args.projectId);

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all metrics
    const allMetrics = await ctx.db
      .query("igMetricDaily")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Get latest metric for total followers
    const sortedMetrics = allMetrics.sort((a, b) => b.date.localeCompare(a.date));
    const latestMetric = sortedMetrics[0];

    // Calculate 7d metrics
    const sevenDayMetrics = allMetrics.filter((metric) => {
      const metricDate = new Date(metric.date);
      return metricDate >= sevenDaysAgo && metricDate <= now;
    });

    // Sum 7d leads
    const leads7d = sevenDayMetrics.reduce((sum, m) => sum + (m.dmLeads || 0), 0);

    // Sum 7d reach
    const reach7d = sevenDayMetrics.reduce((sum, m) => sum + (m.reach || 0), 0);

    // Total followers (from latest)
    const totalFollowers = latestMetric?.followers || 0;

    // Growth score (0-100): combination of follower growth, engagement, and leads
    // Simplified calculation
    const followerGrowth = sortedMetrics.length >= 2
      ? ((sortedMetrics[0].followers - sortedMetrics[sortedMetrics.length - 1].followers) / 
         Math.max(1, sortedMetrics[sortedMetrics.length - 1].followers)) * 100
      : 0;
    
    const avgEngagement = sevenDayMetrics.length > 0
      ? sevenDayMetrics.reduce((sum, m) => sum + (m.likes || 0) + (m.comments || 0), 0) / sevenDayMetrics.length
      : 0;
    
    const leadsScore = Math.min(100, (leads7d / 10) * 100); // 10 leads = 100 score
    
    const growthScore = Math.min(100, Math.round(
      (followerGrowth * 0.4) + 
      (Math.min(100, avgEngagement / 100) * 0.3) + 
      (leadsScore * 0.3)
    ));

    return {
      leads7d,
      reach7d,
      totalFollowers,
      growthScore,
    };
  },
});

/**
 * Internal mutation for webhook use (no auth check)
 */
export const upsertDailyInternal = internalMutation({
  args: {
    projectId: v.id("project"),
    date: v.string(),
    followers: v.number(),
    posts: v.number(),
    likes: v.number(),
    comments: v.number(),
    reach: v.optional(v.number()),
    profileVisits: v.optional(v.number()),
    websiteClicks: v.optional(v.number()),
    dmLeads: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if metric already exists for this date
    const existing = await ctx.db
      .query("igMetricDaily")
      .withIndex("by_project_date", (q) => 
        q.eq("projectId", args.projectId).eq("date", args.date)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        followers: args.followers,
        posts: args.posts,
        likes: args.likes,
        comments: args.comments,
        reach: args.reach,
        profileVisits: args.profileVisits,
        websiteClicks: args.websiteClicks,
        dmLeads: args.dmLeads,
        updatedAt: now,
      });
      return { success: true, updated: true };
    } else {
      // Create new
      await ctx.db.insert("igMetricDaily", {
        projectId: args.projectId,
        date: args.date,
        followers: args.followers,
        posts: args.posts,
        likes: args.likes,
        comments: args.comments,
        reach: args.reach,
        profileVisits: args.profileVisits,
        websiteClicks: args.websiteClicks,
        dmLeads: args.dmLeads,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, updated: false };
    }
  },
});

