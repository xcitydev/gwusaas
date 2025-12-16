import { v } from "convex/values";
import { query, action, internalQuery } from "./_generated/server";
import { getCurrentUserProfile, hasAdminRole } from "./lib/spec";
import { internal } from "./_generated/api";

/**
 * Get organization KPIs (rollup across all projects)
 */
export const orgKpis = query({
  args: {
    organizationId: v.id("organization"),
  },
  handler: async (ctx, args) => {
    // Verify admin access
    const profile = await getCurrentUserProfile(ctx);
    if (!profile || !hasAdminRole(profile.role)) {
      throw new Error("Unauthorized: Admin access required");
    }

    if (profile.organizationId !== args.organizationId) {
      throw new Error("Unauthorized: Cannot access other organization");
    }

    // Get all projects for this org
    const projects = await ctx.db
      .query("project")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
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
    organizationId: v.id("organization"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify admin access
    const profile = await getCurrentUserProfile(ctx);
    if (!profile || !hasAdminRole(profile.role)) {
      throw new Error("Unauthorized: Admin access required");
    }

    if (profile.organizationId !== args.organizationId) {
      throw new Error("Unauthorized: Cannot access other organization");
    }

    // Get all active projects
    const projects = await ctx.db
      .query("project")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
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

/**
 * Generate monthly impact report
 */
export const monthlyReport = action({
  args: {
    organizationId: v.id("organization"),
  },
  handler: async (ctx, args) => {
    // Verify admin access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.runQuery(async (ctx) => {
      return await ctx.db
        .query("profile")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
        .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
        .first();
    });

    if (!profile || !hasAdminRole(profile.role)) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get KPIs (reuse the same logic)
    const kpis = await ctx.runQuery(async (ctx) => {
      const projects = await ctx.db
        .query("project")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
        .collect();

      const activeProjects = projects.filter((p) => p.status === "active");
      let totalLeads = 0;
      let totalFollowers = 0;
      let totalReach = 0;

      for (const project of activeProjects) {
        const metrics = await ctx.db
          .query("igMetricDaily")
          .withIndex("by_project_id", (q) => q.eq("projectId", project._id))
          .collect();

        if (metrics.length > 0) {
          const sorted = metrics.sort((a, b) => b.date.localeCompare(a.date));
          totalFollowers += sorted[0].followers || 0;
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentMetrics = metrics.filter((m) => {
          const metricDate = new Date(m.date);
          return metricDate >= sevenDaysAgo;
        });
        totalReach += recentMetrics.reduce((sum, m) => sum + (m.reach || 0), 0);
        totalLeads += recentMetrics.reduce((sum, m) => sum + (m.dmLeads || 0), 0);
      }

      return {
        totalClients: activeProjects.length,
        totalLeads,
        totalFollowers,
        totalReach,
        avgGrowth: 0, // Simplified
      };
    });

    // Get top growth
    const topGrowth = await ctx.runQuery(async (ctx) => {
      const projects = await ctx.db
        .query("project")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

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
            growthScore = Math.min(100, Math.round(followerGrowth));
          }

          return {
            projectId: project._id,
            projectName: project.name,
            instagramHandle: project.instagramHandle,
            growthScore,
          };
        })
      );

      projectsWithGrowth.sort((a, b) => b.growthScore - a.growthScore);
      return projectsWithGrowth.slice(0, 10);
    });

    // Generate report data
    const report = {
      month: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
      kpis,
      topGrowth,
      generatedAt: new Date().toISOString(),
    };

    // TODO: Send email via Resend/Twilio
    // For now, just return the report data
    return {
      success: true,
      report,
    };
  },
});

