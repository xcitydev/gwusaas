import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePipelinePlan } from "@/lib/pipeline-route-auth";
import { callClaudeJson, runContentPipelineMutation, sleep } from "@/lib/content-pipeline";

const bodySchema = z.object({
  runId: z.string().min(1),
  niche: z.string().min(2),
  brandName: z.string().min(2),
  brandVoice: z.string().min(2),
  contentPillars: z.array(z.string()).min(1),
  targetPlatforms: z.array(z.string()).min(1),
  viralTopics: z.array(
    z.object({
      platform: z.string(),
      topic: z.string(),
      viralReason: z.string(),
      sourceUrl: z.string().optional(),
    }),
  ),
});

type RefinedTopicOutput = {
  platform: string;
  dayNumber: number;
  topicTitle: string;
  topicAngle: string;
};

const REFINE_RETRY_LIMIT = Number(process.env.PIPELINE_REFINE_RETRY_LIMIT || 4);
const REFINE_BACKOFF_MS = Number(process.env.PIPELINE_REFINE_BACKOFF_MS || 10000);
const REFINE_PLATFORM_BATCH_DELAY_MS = Number(
  process.env.PIPELINE_REFINE_PLATFORM_DELAY_MS || 12000,
);
const REFINE_MAX_TOKENS = Number(process.env.PIPELINE_REFINE_MAX_TOKENS || 1200);
const REFINE_MAX_TOPICS_PER_PLATFORM = Number(
  process.env.PIPELINE_REFINE_TOPICS_PER_PLATFORM || 3,
);

function isRateLimitError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("rate limit") ||
    message.includes("tokens per minute") ||
    message.includes("429") ||
    message.includes("would exceed")
  );
}

async function callRefineWithRetry({
  system,
  userMessage,
}: {
  system: string;
  userMessage: string;
}) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= REFINE_RETRY_LIMIT; attempt += 1) {
    try {
      return await callClaudeJson<RefinedTopicOutput[]>({
        system,
        userMessage,
        maxTokens: REFINE_MAX_TOKENS,
      });
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt === REFINE_RETRY_LIMIT) {
        throw error;
      }
      const waitMs = REFINE_BACKOFF_MS * attempt;
      console.warn("Refine stage rate-limited, retrying", {
        attempt,
        waitMs,
        message: error instanceof Error ? error.message : String(error),
      });
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Refine call failed");
}

function buildRefinePrompt({
  brandName,
  niche,
  brandVoice,
  contentPillars,
  platform,
  viralTopics,
}: {
  brandName: string;
  niche: string;
  brandVoice: string;
  contentPillars: string[];
  platform: string;
  viralTopics: Array<{ platform: string; topic: string; viralReason: string }>;
}) {
  return `Brand: ${brandName}
Niche: ${niche}
Voice: ${brandVoice}
Content pillars: ${contentPillars.slice(0, 6).join(", ")}
Platform: ${platform}

Viral topics discovered this week:
${JSON.stringify(
    viralTopics.map((topic) => ({
      platform: topic.platform,
      topic: topic.topic.slice(0, 120),
      viralReason: topic.viralReason.slice(0, 180),
    })),
  )}

Generate exactly 7 refined, branded content angles for this single platform (${platform}) across dayNumber 1 to 7.`;
}

export async function POST(req: Request) {
  try {
    const guard = await requirePipelinePlan(req, "growth");
    if (!guard.ok) return guard.response;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await runContentPipelineMutation("contentPipeline:updateRunStatus", {
      userId: guard.userId,
      runId: parsed.data.runId,
      status: "refining",
    });

    const systemPrompt = `You are a content strategy agent. Your job is to take viral trending topics and refine them into specific, branded content angles for a given brand.

For each platform, select or adapt 7 topics (one per day of the week) that:
- Are inspired by or derived from the viral topics provided
- Are specifically tailored to the brand's niche, voice, and content pillars
- Are original angles - not copies of the viral content, but inspired by what's working
- Match the platform's content format and audience expectations

Return ONLY a JSON array with this structure:
[
  {
    "platform": "youtube",
    "dayNumber": 1,
    "topicTitle": "Title of the content piece",
    "topicAngle": "The specific angle or hook this brand should take on this topic"
  }
]

Return ONLY the JSON array. No preamble, no markdown, no explanation.`;

    const allRefinedTopics: RefinedTopicOutput[] = [];
    for (const [platformIndex, platform] of parsed.data.targetPlatforms.entries()) {
      const compactTopics = parsed.data.viralTopics
        .filter((topic) => topic.platform === platform)
        .slice(0, REFINE_MAX_TOPICS_PER_PLATFORM)
        .map((topic) => ({
          platform: topic.platform,
          topic: topic.topic,
          viralReason: topic.viralReason,
        }));

      const userPrompt = buildRefinePrompt({
        brandName: parsed.data.brandName,
        niche: parsed.data.niche,
        brandVoice: parsed.data.brandVoice,
        contentPillars: parsed.data.contentPillars,
        platform,
        viralTopics: compactTopics,
      });

      const platformTopics = await callRefineWithRetry({
        system: systemPrompt,
        userMessage: userPrompt,
      });

      allRefinedTopics.push(...platformTopics);

      if (platformIndex < parsed.data.targetPlatforms.length - 1) {
        await sleep(REFINE_PLATFORM_BATCH_DELAY_MS);
      }
    }

    const sanitized = (Array.isArray(allRefinedTopics) ? allRefinedTopics : [])
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        platform: String(item.platform || "").toLowerCase().trim(),
        dayNumber: Math.min(7, Math.max(1, Number(item.dayNumber) || 1)),
        topicTitle: String(item.topicTitle || "").trim(),
        topicAngle: String(item.topicAngle || "").trim(),
      }))
      .filter(
        (item) =>
          item.platform &&
          item.topicTitle &&
          item.topicAngle &&
          parsed.data.targetPlatforms.includes(item.platform),
      );

    const refinedTopics = (await runContentPipelineMutation(
      "contentPipeline:saveRefinedTopics",
      {
        userId: guard.userId,
        runId: parsed.data.runId,
        topics: sanitized,
      },
    )) as Array<{
      id: string;
      platform: string;
      dayNumber: number;
      topicTitle: string;
      topicAngle: string;
    }>;

    await runContentPipelineMutation("contentPipeline:updateRunStatus", {
      userId: guard.userId,
      runId: parsed.data.runId,
      status: "generating",
    });

    return NextResponse.json({ refinedTopics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refine stage failed";
    console.error("Content pipeline refine failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
