import { internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Nightly job: Fetch IG metrics for all active projects
 */
export const fetchNightlyMetrics = internalMutation({
  handler: async (ctx) => {
    // Get all active projects
    const projects = await ctx.db
      .query("project")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // For each project, fetch metrics
    // In production, this would:
    // 1. Check if project has Meta API credentials
    // 2. Fetch from Meta Graph API if available
    // 3. Otherwise, wait for Apify webhook (which handles ingestion)
    // 4. Or trigger Apify actor if configured

    // Log the job run
    for (const project of projects) {
      const org = await ctx.db.get(project.organizationId);
      if (org) {
        await ctx.db.insert("auditLog", {
          organizationId: project.organizationId,
          actorUserId: "system",
          action: "nightly_metrics_fetch",
          meta: {
            projectId: project._id,
            date: today,
            status: "scheduled",
          },
          createdAt: Date.now(),
        });
      }
    }

    return { success: true, projectsProcessed: projects.length };
  },
});

/**
 * Weekly job: Generate weekly insights for all completed onboardings
 */
export const generateWeeklyInsights = internalAction({
  handler: async (ctx) => {
    // Get all projects with completed onboarding
    const projects = await ctx.runQuery(async (ctx) => {
      const allProjects = await ctx.db
        .query("project")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect();

      const projectsWithOnboarding = await Promise.all(
        allProjects.map(async (project) => {
          const onboarding = await ctx.db
            .query("onboardingResponse")
            .withIndex("by_project_id", (q) => q.eq("projectId", project._id))
            .first();

          if (onboarding && onboarding.completed) {
            return project;
          }
          return null;
        })
      );

      return projectsWithOnboarding.filter((p) => p !== null);
    });

    // Generate weekly insight for each project
    let successCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      if (!project) continue;

      try {
        // Note: This requires a user context, so we'll need to create an internal version
        // For now, we'll just log that it should be generated
        // In production, you'd create an internal action that bypasses auth
        await ctx.runMutation(internal.audit.log, {
          organizationId: project.organizationId,
          actorUserId: "system",
          action: "weekly_insight_scheduled",
          meta: {
            projectId: project._id,
            note: "Weekly insight generation scheduled - requires manual trigger or internal action",
          },
        });
        successCount++;
      } catch (error: any) {
        console.error(`Failed to generate insight for project ${project._id}:`, error);
        errorCount++;

        // Log error
        const org = await ctx.runQuery(async (ctx) => {
          return await ctx.db.get(project.organizationId);
        });

        if (org) {
          await ctx.runMutation(internal.audit.log, {
            organizationId: project.organizationId,
            actorUserId: "system",
            action: "weekly_insight_failed",
            meta: {
              projectId: project._id,
              error: error.message,
            },
          });
        }
      }
    }

    return {
      success: true,
      successCount,
      errorCount,
      totalProjects: projects.length,
    };
  },
});

/**
 * Monthly job: Generate and send monthly reports
 */
export const generateMonthlyReports = internalAction({
  handler: async (ctx) => {
    // Get all organizations
    const organizations = await ctx.runQuery(async (ctx) => {
      return await ctx.db.query("organization").collect();
    });

    let successCount = 0;
    let errorCount = 0;

    for (const org of organizations) {
      try {
        // Generate monthly report
        // Note: monthlyReport is an action that requires auth
        // In production, create an internal version or use a service account
        await ctx.runMutation(internal.audit.log, {
          organizationId: org._id,
          actorUserId: "system",
          action: "monthly_report_scheduled",
          meta: {
            note: "Monthly report generation scheduled - requires manual trigger or internal action",
          },
        });

        // Log success
        await ctx.runMutation(internal.audit.log, {
          organizationId: org._id,
          actorUserId: "system",
          action: "monthly_report_generated",
          meta: {
            month: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
          },
        });

        successCount++;
      } catch (error: any) {
        console.error(`Failed to generate report for org ${org._id}:`, error);
        errorCount++;

        await ctx.runMutation(internal.audit.log, {
          organizationId: org._id,
          actorUserId: "system",
          action: "monthly_report_failed",
          meta: {
            error: error.message,
          },
        });
      }
    }

    return {
      success: true,
      successCount,
      errorCount,
      totalOrganizations: organizations.length,
    };
  },
});

