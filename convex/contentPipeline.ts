import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getConfig = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("contentPipelineConfigs")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getRuns = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("contentPipelineRuns")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    return runs.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getRunDetail = query({
  args: { userId: v.string(), runId: v.id("contentPipelineRuns") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.userId !== args.userId) return null;
    const config = await ctx.db.get(run.configId);

    const [viralTopics, refinedTopics, generatedContent] = await Promise.all([
      ctx.db
        .query("viralTopics")
        .withIndex("by_run_id", (q) => q.eq("runId", args.runId))
        .collect(),
      ctx.db
        .query("refinedTopics")
        .withIndex("by_run_id", (q) => q.eq("runId", args.runId))
        .collect(),
      ctx.db
        .query("generatedContent")
        .withIndex("by_run_id", (q) => q.eq("runId", args.runId))
        .collect(),
    ]);

    return {
      run,
      config,
      viralTopics,
      refinedTopics: refinedTopics.sort((a, b) => {
        if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
        return a.platform.localeCompare(b.platform);
      }),
      generatedContent: generatedContent.sort((a, b) => {
        if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
        if (a.platform !== b.platform) return a.platform.localeCompare(b.platform);
        return a.contentType.localeCompare(b.contentType);
      }),
    };
  },
});

export const getContentCalendar = query({
  args: { userId: v.string(), runId: v.id("contentPipelineRuns") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.userId !== args.userId) return null;

    const [refinedTopics, generatedContent] = await Promise.all([
      ctx.db
        .query("refinedTopics")
        .withIndex("by_run_id", (q) => q.eq("runId", args.runId))
        .collect(),
      ctx.db
        .query("generatedContent")
        .withIndex("by_run_id", (q) => q.eq("runId", args.runId))
        .collect(),
    ]);

    const topicMap = new Map(refinedTopics.map((topic) => [topic._id, topic]));
    const calendar: Record<
      string,
      Record<
        number,
        {
          topicId: string;
          topicTitle: string;
          topicAngle: string;
          items: Array<(typeof generatedContent)[number]>;
        }[]
      >
    > = {};

    for (const item of generatedContent) {
      const topic = topicMap.get(item.refinedTopicId);
      const platform = item.platform;
      const dayNumber = item.dayNumber;

      if (!calendar[platform]) calendar[platform] = {};
      if (!calendar[platform][dayNumber]) calendar[platform][dayNumber] = [];

      let group = calendar[platform][dayNumber].find(
        (entry) => entry.topicId === item.refinedTopicId,
      );
      if (!group) {
        group = {
          topicId: String(item.refinedTopicId),
          topicTitle: topic?.topicTitle || "Untitled topic",
          topicAngle: topic?.topicAngle || "",
          items: [],
        };
        calendar[platform][dayNumber].push(group);
      }
      group.items.push(item);
    }

    return {
      run,
      platforms: Object.keys(calendar).sort(),
      days: [1, 2, 3, 4, 5, 6, 7],
      calendar,
    };
  },
});

export const saveConfig = mutation({
  args: {
    userId: v.string(),
    clientId: v.optional(v.string()),
    niche: v.string(),
    brandName: v.string(),
    brandVoice: v.string(),
    contentPillars: v.array(v.string()),
    targetPlatforms: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("contentPipelineConfigs")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        clientId: args.clientId,
        niche: args.niche,
        brandName: args.brandName,
        brandVoice: args.brandVoice,
        contentPillars: args.contentPillars,
        targetPlatforms: args.targetPlatforms,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("contentPipelineConfigs", {
      userId: args.userId,
      clientId: args.clientId,
      niche: args.niche,
      brandName: args.brandName,
      brandVoice: args.brandVoice,
      contentPillars: args.contentPillars,
      targetPlatforms: args.targetPlatforms,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createRun = mutation({
  args: {
    userId: v.string(),
    configId: v.id("contentPipelineConfigs"),
    status: v.string(),
    weekStartDate: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("contentPipelineRuns", {
      userId: args.userId,
      configId: args.configId,
      status: args.status,
      weekStartDate: args.weekStartDate,
      errorMessage: args.errorMessage,
      createdAt: Date.now(),
    });
  },
});

export const updateRunStatus = mutation({
  args: {
    userId: v.string(),
    runId: v.id("contentPipelineRuns"),
    status: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.userId !== args.userId) {
      throw new Error("Run not found");
    }

    const completedAt =
      args.status === "complete" || args.status === "error"
        ? Date.now()
        : run.completedAt;

    await ctx.db.patch(args.runId, {
      status: args.status,
      errorMessage: args.errorMessage,
      completedAt,
    });
    return args.runId;
  },
});

export const saveViralTopics = mutation({
  args: {
    userId: v.string(),
    runId: v.id("contentPipelineRuns"),
    topics: v.array(
      v.object({
        platform: v.string(),
        topic: v.string(),
        viralReason: v.string(),
        sourceUrl: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const insertedIds = [];
    const now = Date.now();
    for (const item of args.topics) {
      const id = await ctx.db.insert("viralTopics", {
        runId: args.runId,
        userId: args.userId,
        platform: item.platform,
        topic: item.topic,
        viralReason: item.viralReason,
        sourceUrl: item.sourceUrl,
        createdAt: now,
      });
      insertedIds.push(id);
    }
    return insertedIds;
  },
});

export const saveRefinedTopics = mutation({
  args: {
    userId: v.string(),
    runId: v.id("contentPipelineRuns"),
    topics: v.array(
      v.object({
        platform: v.string(),
        topicTitle: v.string(),
        topicAngle: v.string(),
        dayNumber: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const inserted: Array<{
      id: string;
      platform: string;
      topicTitle: string;
      topicAngle: string;
      dayNumber: number;
    }> = [];
    const now = Date.now();

    for (const item of args.topics) {
      const id = await ctx.db.insert("refinedTopics", {
        runId: args.runId,
        userId: args.userId,
        platform: item.platform,
        topicTitle: item.topicTitle,
        topicAngle: item.topicAngle,
        dayNumber: item.dayNumber,
        createdAt: now,
      });
      inserted.push({
        id: String(id),
        platform: item.platform,
        topicTitle: item.topicTitle,
        topicAngle: item.topicAngle,
        dayNumber: item.dayNumber,
      });
    }
    return inserted;
  },
});

export const saveGeneratedContent = mutation({
  args: {
    userId: v.string(),
    runId: v.id("contentPipelineRuns"),
    refinedTopicId: v.id("refinedTopics"),
    platform: v.string(),
    dayNumber: v.number(),
    contentType: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("generatedContent", {
      runId: args.runId,
      refinedTopicId: args.refinedTopicId,
      userId: args.userId,
      platform: args.platform,
      dayNumber: args.dayNumber,
      contentType: args.contentType,
      content: args.content,
      imageUrl: args.imageUrl,
      status: args.status,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateContentStatus = mutation({
  args: {
    userId: v.string(),
    contentId: v.id("generatedContent"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.contentId);
    if (!row || row.userId !== args.userId) {
      throw new Error("Content not found");
    }

    await ctx.db.patch(args.contentId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return args.contentId;
  },
});

export const deleteRun = mutation({
  args: {
    userId: v.string(),
    runId: v.id("contentPipelineRuns"),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.userId !== args.userId) {
      throw new Error("Run not found");
    }

    const [viralTopics, refinedTopics, generatedContent] = await Promise.all([
      ctx.db
        .query("viralTopics")
        .withIndex("by_run_id", (q) => q.eq("runId", args.runId))
        .collect(),
      ctx.db
        .query("refinedTopics")
        .withIndex("by_run_id", (q) => q.eq("runId", args.runId))
        .collect(),
      ctx.db
        .query("generatedContent")
        .withIndex("by_run_id", (q) => q.eq("runId", args.runId))
        .collect(),
    ]);

    await Promise.all(
      generatedContent.map((item) => ctx.db.delete(item._id)),
    );
    await Promise.all(refinedTopics.map((item) => ctx.db.delete(item._id)));
    await Promise.all(viralTopics.map((item) => ctx.db.delete(item._id)));
    await ctx.db.delete(args.runId);

    return { success: true };
  },
});
