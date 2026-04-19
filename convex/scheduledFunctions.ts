import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const getActiveProjects = internalQuery({
  handler: async (ctx) => {
    const allProjects = await ctx.db
      .query("project")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const results = await Promise.all(
      allProjects.map(async (project) => {
        const onboarding = await ctx.db
          .query("onboardingResponse")
          .withIndex("by_project_id", (q) => q.eq("projectId", project._id))
          .first();
        return onboarding?.completed ? project : null;
      })
    );

    return results.filter((p) => p !== null);
  },
});

export const getAllOrganizations = internalQuery({
  handler: async (ctx) => {
    return ctx.db.query("organizations").collect();
  },
});

export const fetchNightlyMetrics = internalMutation({
  handler: async (ctx) => {
    const projects = await ctx.db
      .query("project")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const today = new Date().toISOString().split("T")[0];

    for (const project of projects) {
      await ctx.db.insert("auditLog", {
        clerkUserId: project.clerkUserId,
        action: "nightly_metrics_fetch",
        meta: { projectId: project._id, date: today, status: "scheduled" },
        createdAt: Date.now(),
      });
    }

    return { success: true, projectsProcessed: projects.length };
  },
});

export const generateWeeklyInsights = internalAction({
  handler: async (ctx): Promise<{ success: boolean; successCount: number; errorCount: number; totalProjects: number }> => {
    const projects = await ctx.runQuery(internal.scheduledFunctions.getActiveProjects);

    let successCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      if (!project) continue;
      try {
        await ctx.runMutation(internal.audit.log, {
          clerkUserId: project.clerkUserId,
          action: "weekly_insight_scheduled",
          meta: { projectId: project._id },
        });
        successCount++;
      } catch (error: unknown) {
        console.error(`Failed to schedule insight for project ${project._id}:`, error);
        errorCount++;
        await ctx.runMutation(internal.audit.log, {
          clerkUserId: project.clerkUserId,
          action: "weekly_insight_failed",
          meta: { projectId: project._id, error: String(error) },
        }).catch(() => {});
      }
    }

    return { success: true, successCount, errorCount, totalProjects: projects.length };
  },
});

export const generateMonthlyReports = internalAction({
  handler: async (ctx): Promise<{ success: boolean; successCount: number; errorCount: number; totalOrganizations: number }> => {
    const organizations = await ctx.runQuery(internal.scheduledFunctions.getAllOrganizations);

    let successCount = 0;
    let errorCount = 0;

    for (const org of organizations) {
      try {
        await ctx.runMutation(internal.audit.log, {
          clerkUserId: org.ownerId,
          action: "monthly_report_generated",
          meta: { month: new Date().toLocaleString("default", { month: "long", year: "numeric" }) },
        });
        successCount++;
      } catch (error: unknown) {
        console.error(`Failed to generate report for org ${org._id}:`, error);
        errorCount++;
        await ctx.runMutation(internal.audit.log, {
          clerkUserId: org.ownerId,
          action: "monthly_report_failed",
          meta: { error: String(error) },
        }).catch(() => {});
      }
    }

    return { success: true, successCount, errorCount, totalOrganizations: organizations.length };
  },
});
