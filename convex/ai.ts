import { v } from "convex/values";
import { action, query, internalMutation } from "./_generated/server";
import { verifyProjectAccess } from "./lib/spec";
import { internal } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "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",
});

/**
 * Check rate limits for AI generation
 */
async function checkRateLimit(
  ctx: any,
  projectId: string,
  reportType: string,
  plan: string
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  // Get today's reports for this project and type
  const todayReports = await ctx.runQuery(async (ctx) => {
    const allReports = await ctx.db
      .query("aiReport")
      .withIndex("by_project_type", (q) => 
        q.eq("projectId", projectId as any).eq("reportType", reportType)
      )
      .collect();

    return allReports.filter((r) => r.createdAt >= todayStartMs);
  });

  // Rate limits based on plan
  const limits: Record<string, number> = {
    trial: 2,
    pro: 5,
    enterprise: 20,
  };

  const limit = limits[plan] || limits.trial;
  const remaining = Math.max(0, limit - todayReports.length);

  return {
    allowed: remaining > 0,
    remaining,
  };
}

/**
 * Generate AI report
 */
export const generate = action({
  args: {
    projectId: v.id("project"),
    reportType: v.string(), // "weekly_insight" | "caption_batch" | "hashtag_list" | "competitor_scan" | "action_plan"
  },
  handler: async (ctx, args) => {
    // Verify access and get project/org info
    const project = await ctx.runQuery(async (ctx) => {
      return await ctx.db.get(args.projectId);
    });
    if (!project) {
      throw new Error("Project not found");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Verify user owns this project
    if (project.clerkUserId !== identity.subject) {
      throw new Error("Unauthorized: You don't have access to this project");
    }

    // Check rate limit (using trial plan for now - can be stored in user profile later)
    const rateLimit = await checkRateLimit(ctx, args.projectId, args.reportType, "trial");
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Daily limit: 2 generations per type. Resets at 00:00.`);
    }

    // Get onboarding data
    const onboarding = await ctx.runQuery(async (ctx) => {
      return await ctx.db
        .query("onboardingResponse")
        .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
        .first();
    });

    if (!onboarding || !onboarding.completed) {
      throw new Error("Onboarding must be completed before generating AI reports");
    }

    // Get last 30 days of metrics
    const metrics = await ctx.runQuery(async (ctx) => {
      const allMetrics = await ctx.db
        .query("igMetricDaily")
        .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
        .collect();

      const sorted = allMetrics.sort((a, b) => b.date.localeCompare(a.date));
      return sorted.slice(0, 30);
    });

    // Build prompt based on report type
    let prompt = buildPrompt(args.reportType, onboarding, metrics);

    // Call OpenAI with structured output
    let content: any;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert social media strategist. Generate structured, actionable insights based on the provided data. Always follow the style rules and output format exactly as specified.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) {
          throw new Error("No content in response");
        }

        content = JSON.parse(rawContent);
        
        // Validate structure
        const validation = validateReportContent(args.reportType, content);
        if (validation.valid) {
          break;
        } else {
          // Retry with correction
          attempts++;
          if (attempts < maxAttempts) {
            prompt += `\n\nPrevious attempt had validation errors: ${validation.errors.join(", ")}. Please correct and regenerate.`;
            continue;
          } else {
            throw new Error(`Validation failed after ${maxAttempts} attempts: ${validation.errors.join(", ")}`);
          }
        }
      } catch (error: any) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to generate report: ${error.message}`);
        }
      }
    }

    // Calculate score (0-100)
    const score = calculateReportScore(args.reportType, content, metrics);

    // Save report
    const reportId = await ctx.runMutation(internal.ai.saveReport, {
      projectId: args.projectId,
      reportType: args.reportType,
      content,
      score,
      inputRefs: {
        onboardingId: onboarding._id,
        metricsCount: metrics.length,
      },
    });

    return { success: true, reportId };
  },
});

/**
 * Build prompt for specific report type
 */
function buildPrompt(
  reportType: string,
  onboarding: any,
  metrics: any[]
): string {
  const styleRules = `
Style Rules:
- Use "you", avoid "y'all"
- Prefer "great" over "solid"
- No back-to-back emojis on consecutive lines
- Tie every recommendation to an observed metric or business goal
`;

  const businessContext = `
Business Context:
- Brand Tone: ${onboarding.brandTone || "Not specified"}
- Goals: ${onboarding.goals || "Not specified"}
- Target Audience: ${onboarding.targetAudience || "Not specified"}
- Competitors: ${onboarding.competitors || "Not specified"}
- Design Style: ${onboarding.designStyle || "Not specified"}
`;

  const recentPerformance = `
Recent Performance (Last 30 days):
${metrics.length > 0 
  ? metrics.map(m => `- ${m.date}: ${m.followers} followers, ${m.likes} likes, ${m.comments} comments, ${m.reach || 0} reach`)
      .join("\n")
  : "No metrics available yet"
}
`;

  switch (reportType) {
    case "weekly_insight":
      return `${businessContext}

${recentPerformance}

${styleRules}

Generate a weekly insight report with:
- summary: string (what changed this week)
- why: string (explanation of changes)
- actions: array of 3-5 objects with {priority: "high"|"medium"|"low", action: string, reason: string}

Output as JSON with keys: summary, why, actions`;

    case "caption_batch":
      return `${businessContext}

${styleRules}

Generate exactly 10 Instagram captions. Each caption must have:
- hook: string (engaging first line)
- body: string (main content)
- cta: string (call to action)

Follow brand tone: ${onboarding.brandTone || "professional"}
No back-to-back emojis. Use "you" not "y'all". Prefer "great" over "solid".

Output as JSON with key "captions" containing array of {hook, body, cta}`;

    case "hashtag_list":
      return `${businessContext}

Generate hashtags in 3 tiers:
- broad: 10 hashtags (general, high volume)
- mid: 10 hashtags (moderate volume, relevant)
- niche: 10 hashtags (specific, low competition)

Total: 30 hashtags. No duplicates. No banned tags.

Output as JSON with keys: broad (array), mid (array), niche (array)`;

    case "competitor_scan":
      const competitors = onboarding.competitors?.split(",").map((c: string) => c.trim()) || [];
      return `${businessContext}

Competitors to analyze: ${competitors.join(", ") || "None specified"}

For each competitor, provide:
- handle: string
- postingFrequency: string (e.g., "3-5 posts/week")
- avgEngagement: number
- themes: array of strings (content themes observed)

Output as JSON with key "competitors" containing array of objects`;

    case "action_plan":
      return `${businessContext}

${recentPerformance}

${styleRules}

Generate an action plan with 5-7 tasks. Each task must have:
- task: string
- priority: "high"|"medium"|"low"
- effort: "low"|"medium"|"high"
- reason: string (tied to metrics or goals)

Output as JSON with key "tasks" containing array of objects`;

    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

/**
 * Validate report content structure
 */
function validateReportContent(reportType: string, content: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (reportType) {
    case "weekly_insight":
      if (!content.summary || typeof content.summary !== "string") errors.push("Missing or invalid summary");
      if (!content.why || typeof content.why !== "string") errors.push("Missing or invalid why");
      if (!Array.isArray(content.actions) || content.actions.length < 3) errors.push("Actions must be array with at least 3 items");
      break;
    case "caption_batch":
      if (!Array.isArray(content.captions) || content.captions.length !== 10) errors.push("Must have exactly 10 captions");
      content.captions?.forEach((cap: any, i: number) => {
        if (!cap.hook || !cap.body || !cap.cta) errors.push(`Caption ${i + 1} missing required fields`);
      });
      break;
    case "hashtag_list":
      if (!Array.isArray(content.broad) || content.broad.length !== 10) errors.push("Must have 10 broad hashtags");
      if (!Array.isArray(content.mid) || content.mid.length !== 10) errors.push("Must have 10 mid hashtags");
      if (!Array.isArray(content.niche) || content.niche.length !== 10) errors.push("Must have 10 niche hashtags");
      break;
    case "competitor_scan":
      if (!Array.isArray(content.competitors)) errors.push("Competitors must be array");
      break;
    case "action_plan":
      if (!Array.isArray(content.tasks) || content.tasks.length < 5) errors.push("Must have at least 5 tasks");
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculate report score (0-100)
 */
function calculateReportScore(reportType: string, content: any, metrics: any[]): number {
  // Simplified scoring
  let score = 50; // Base score

  // Add points for completeness
  if (reportType === "caption_batch" && content.captions?.length === 10) score += 20;
  if (reportType === "hashtag_list" && content.broad?.length === 10 && content.mid?.length === 10 && content.niche?.length === 10) score += 20;
  if (reportType === "action_plan" && content.tasks?.length >= 5) score += 20;
  if (reportType === "weekly_insight" && content.actions?.length >= 3) score += 20;

  // Add points if metrics are available
  if (metrics.length > 0) score += 10;

  return Math.min(100, score);
}

/**
 * Get latest report by type
 */
export const latest = query({
  args: {
    projectId: v.id("project"),
    reportType: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyProjectAccess(ctx, args.projectId);

    const reports = await ctx.db
      .query("aiReport")
      .withIndex("by_project_type", (q) => 
        q.eq("projectId", args.projectId).eq("reportType", args.reportType)
      )
      .collect();

    if (reports.length === 0) return null;

    // Sort by createdAt descending and return latest
    reports.sort((a, b) => b.createdAt - a.createdAt);
    return reports[0];
  },
});

/**
 * List reports with pagination
 */
export const list = query({
  args: {
    projectId: v.id("project"),
    reportType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await verifyProjectAccess(ctx, args.projectId);

    let query = ctx.db
      .query("aiReport")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId));

    if (args.reportType) {
      // Filter by type if specified
      const allReports = await query.collect();
      const filtered = allReports.filter((r) => r.reportType === args.reportType);
      filtered.sort((a, b) => b.createdAt - a.createdAt);
      const limit = args.limit || 50;
      return filtered.slice(0, limit);
    }

    const reports = await query.collect();
    reports.sort((a, b) => b.createdAt - a.createdAt);
    const limit = args.limit || 50;
    return reports.slice(0, limit);
  },
});

/**
 * Internal mutation to save report
 */
export const saveReport = internalMutation({
  args: {
    projectId: v.id("project"),
    reportType: v.string(),
    content: v.any(),
    score: v.optional(v.number()),
    inputRefs: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const reportId = await ctx.db.insert("aiReport", {
      projectId: args.projectId,
      reportType: args.reportType,
      content: args.content,
      score: args.score,
      inputRefs: args.inputRefs,
      createdAt: now,
      updatedAt: now,
    });
    return reportId;
  },
});

