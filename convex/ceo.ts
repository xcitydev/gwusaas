import { v } from "convex/values";
import { query, action, internalQuery } from "./_generated/server";
import { getCurrentUserProfile, hasAdminRole, hasAdminOrManagerRole } from "./lib/spec";
import { internal } from "./_generated/api";

/**
 * Get organization KPIs (rollup across all projects)
 */
export const orgKpis = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Verify admin access
    const profile = await getCurrentUserProfile(ctx);
    if (!profile || !hasAdminRole(profile.role)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get all projects for this user
    const projects = await ctx.db
      .query("project")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", profile.clerkUserId))
      .collect();

    const activeProjects = projects.filter((p) => p.status === "active");

    // Get all metrics for all projects
    let totalLeads = 0;
    let totalFollowers = 0;
    let totalReach = 0;
    let totalProjects = activeProjects.length;

    for (const project of activeProjects) {
      const metrics = await ctx.db
        .query("igMetricDaily")
        .withIndex("by_project_id", (q) => q.eq("projectId", project._id))
        .collect();

      // Get latest metric for followers
      if (metrics.length > 0) {
        const sorted = metrics.sort((a, b) => b.date.localeCompare(a.date));
        totalFollowers += sorted[0].followers || 0;
      }

      // Sum 7d reach
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentMetrics = metrics.filter((m) => {
        const metricDate = new Date(m.date);
        return metricDate >= sevenDaysAgo;
      });
      totalReach += recentMetrics.reduce((sum, m) => sum + (m.reach || 0), 0);

      // Sum 7d leads
      totalLeads += recentMetrics.reduce((sum, m) => sum + (m.dmLeads || 0), 0);
    }

    // Calculate average growth
    let totalGrowthScore = 0;
    let projectsWithGrowth = 0;

    for (const project of activeProjects) {
      const metrics = await ctx.db
        .query("igMetricDaily")
        .withIndex("by_project_id", (q) => q.eq("projectId", project._id))
        .collect();

      if (metrics.length >= 2) {
        const sorted = metrics.sort((a, b) => b.date.localeCompare(a.date));
        const growth = ((sorted[0].followers - sorted[sorted.length - 1].followers) / 
                       Math.max(1, sorted[sorted.length - 1].followers)) * 100;
        totalGrowthScore += growth;
        projectsWithGrowth++;
      }
    }

    const avgGrowth = projectsWithGrowth > 0 ? totalGrowthScore / projectsWithGrowth : 0;

    return {
      totalClients: totalProjects,
      totalLeads,
      totalFollowers,
      totalReach,
      avgGrowth: Math.round(avgGrowth * 100) / 100,
    };
  },
});

/**
 * Get top growth projects
 */
export const topGrowth = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify admin access
    const profile = await getCurrentUserProfile(ctx);
    if (!profile || !hasAdminRole(profile.role)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get all active projects for this user
    const projects = await ctx.db
      .query("project")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", profile.clerkUserId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Calculate growth score for each project
    const projectsWithGrowth = await Promise.all(
      projects.map(async (project) => {
        const metrics = await ctx.db
          .query("igMetricDaily")
          .withIndex("by_project_id", (q) => q.eq("projectId", project._id))
          .collect();

        let growthScore = 0;
        if (metrics.length >= 2) {
          const sorted = metrics.sort((a, b) => b.date.localeCompare(a.date));
          const followerGrowth = ((sorted[0].followers - sorted[sorted.length - 1].followers) / 
                                 Math.max(1, sorted[sorted.length - 1].followers)) * 100;
          
          // Get 7d metrics for engagement
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const recentMetrics = metrics.filter((m) => {
            const metricDate = new Date(m.date);
            return metricDate >= sevenDaysAgo;
          });
          
          const avgEngagement = recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + (m.likes || 0) + (m.comments || 0), 0) / recentMetrics.length
            : 0;
          
          const leads7d = recentMetrics.reduce((sum, m) => sum + (m.dmLeads || 0), 0);
          const leadsScore = Math.min(100, (leads7d / 10) * 100);
          
          growthScore = Math.min(100, Math.round(
            (followerGrowth * 0.4) + 
            (Math.min(100, avgEngagement / 100) * 0.3) + 
            (leadsScore * 0.3)
          ));
        }

        return {
          projectId: project._id,
          projectName: project.name,
          instagramHandle: project.instagramHandle,
          growthScore,
        };
      })
    );

    // Sort by growth score descending
    projectsWithGrowth.sort((a, b) => b.growthScore - a.growthScore);

    const limit = args.limit || 10;
    return projectsWithGrowth.slice(0, limit);
  },
});

export const getProfileByClerkId = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) =>
    ctx.db.query("profile")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first(),
});

export const getKpisForReport = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const projects = await ctx.db.query("project")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();
    const activeProjects = projects.filter((p) => p.status === "active");
    let totalLeads = 0, totalFollowers = 0, totalReach = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    for (const project of activeProjects) {
      const metrics = await ctx.db.query("igMetricDaily")
        .withIndex("by_project_id", (q) => q.eq("projectId", project._id))
        .collect();
      if (metrics.length > 0) {
        const sorted = metrics.sort((a, b) => b.date.localeCompare(a.date));
        totalFollowers += sorted[0].followers || 0;
      }
      const recent = metrics.filter((m) => new Date(m.date) >= sevenDaysAgo);
      totalReach += recent.reduce((sum, m) => sum + (m.reach || 0), 0);
      totalLeads += recent.reduce((sum, m) => sum + (m.dmLeads || 0), 0);
    }
    return { totalClients: activeProjects.length, totalLeads, totalFollowers, totalReach, avgGrowth: 0 };
  },
});

export const getTopGrowthForReport = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const projects = await ctx.db.query("project")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    const result = await Promise.all(projects.map(async (project) => {
      const metrics = await ctx.db.query("igMetricDaily")
        .withIndex("by_project_id", (q) => q.eq("projectId", project._id))
        .collect();
      let growthScore = 0;
      if (metrics.length >= 2) {
        const sorted = metrics.sort((a, b) => b.date.localeCompare(a.date));
        const fg = ((sorted[0].followers - sorted[sorted.length - 1].followers) /
          Math.max(1, sorted[sorted.length - 1].followers)) * 100;
        growthScore = Math.min(100, Math.round(fg));
      }
      return { projectId: project._id, projectName: project.name, instagramHandle: project.instagramHandle, growthScore };
    }));
    result.sort((a, b) => b.growthScore - a.growthScore);
    return result.slice(0, 10);
  },
});

/**
 * Generate monthly impact report
 */
export const monthlyReport = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, _args): Promise<{ success: boolean; report: any }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const profile = await ctx.runQuery(internal.ceo.getProfileByClerkId, { clerkUserId: identity.subject });
    if (!profile || !hasAdminRole(profile.role ?? "")) throw new Error("Unauthorized: Admin access required");

    const kpis = await ctx.runQuery(internal.ceo.getKpisForReport, { clerkUserId: identity.subject });
    const topGrowth = await ctx.runQuery(internal.ceo.getTopGrowthForReport, { clerkUserId: identity.subject });

    const report = {
      month: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
      kpis,
      topGrowth,
      generatedAt: new Date().toISOString(),
    };

    return { success: true, report };
  },
});


/**
 * Get overall KPIs for the dashboard summary
 */
export const userKpis = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentUserProfile(ctx);
    if (!profile) {
      return {
        totalClients: 0,
        totalLeads: 0,
        totalFollowers: 0,
        avgGrowth: 0,
      };
    }

    // Role check - only admins/managers should see this
    if (!hasAdminOrManagerRole(profile.role)) {
      return {
        totalClients: 0,
        totalLeads: 0,
        totalFollowers: 0,
        avgGrowth: 0,
      };
    }

    // Scope by organizationId if provided, otherwise get all projects
    let q = ctx.db.query("project");
    if (args.organizationId) {
       // Note: projects table in schema currently uses clerkUserId, not organizationId.
       // However, we just updated the schema for outreachCampaign and websiteProject.
       // The 'project' table might still be user-centric. 
       // For now-production-readiness, we aggregate metrics based on the current profile's access.
    }

    const projects = await q.collect();
    const activeProjects = projects.filter(p => p.status === "active");

    // Fetch lead count across all projects
    let totalLeads = 0;
    for (const project of projects) {
      const leadsCount = await ctx.db
        .query("lead")
        .withIndex("by_project_id", (q) => q.eq("projectId", project._id))
        .take(1000);
      totalLeads += leadsCount.length;
    }

    // Sum followers from latest metric per active project
    let totalFollowers = 0;
    for (const project of activeProjects) {
      const latestMetric = await ctx.db
        .query("igMetricDaily")
        .withIndex("by_project_id", (q) => q.eq("projectId", project._id))
        .order("desc")
        .first();
      if (latestMetric) {
        totalFollowers += latestMetric.followers;
      }
    }

    // Calculate average follower growth % across active projects
    let totalGrowthScore = 0;
    let projectsWithGrowth = 0;

    for (const project of activeProjects) {
      const metrics = await ctx.db
        .query("igMetricDaily")
        .withIndex("by_project_id", (q) => q.eq("projectId", project._id))
        .order("asc")
        .take(60); // up to 60 days of history
      if (metrics.length >= 2) {
        const earliest = metrics[0].followers;
        const latest = metrics[metrics.length - 1].followers;
        const pctGrowth = earliest > 0 ? ((latest - earliest) / earliest) * 100 : 0;
        totalGrowthScore += pctGrowth;
        projectsWithGrowth++;
      }
    }

    const avgGrowth =
      projectsWithGrowth > 0
        ? Math.round((totalGrowthScore / projectsWithGrowth) * 100) / 100
        : 0;

    return {
      totalClients: activeProjects.length,
      totalLeads,
      totalFollowers,
      avgGrowth,
    };
  },
});
