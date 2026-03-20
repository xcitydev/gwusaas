import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePipelinePlan } from "@/lib/pipeline-route-auth";
import { callClaudeJson, runContentPipelineMutation } from "@/lib/content-pipeline";

const bodySchema = z.object({
  runId: z.string().min(1),
  niche: z.string().min(2),
  brandName: z.string().min(2),
  targetPlatforms: z.array(z.string()).min(1),
  weekStartDate: z.string().min(8),
});
const RESEARCH_MAX_TOKENS = Number(process.env.PIPELINE_RESEARCH_MAX_TOKENS || 2200);
const RESEARCH_FALLBACK_MAX_TOKENS = Number(
  process.env.PIPELINE_RESEARCH_FALLBACK_MAX_TOKENS || 1200,
);
const RESEARCH_RETRY_LIMIT = Number(process.env.PIPELINE_RESEARCH_RETRY_LIMIT || 4);
const RESEARCH_BACKOFF_MS = Number(process.env.PIPELINE_RESEARCH_BACKOFF_MS || 12000);
const RESEARCH_TOPICS_PER_PLATFORM = Number(
  process.env.PIPELINE_RESEARCH_TOPICS_PER_PLATFORM || 4,
);

type ViralTopicOutput = {
  platform: string;
  topic: string;
  viralReason: string;
  sourceUrl?: string;
};

function buildEmergencyResearchTopics({
  niche,
  brandName,
  targetPlatforms,
}: {
  niche: string;
  brandName: string;
  targetPlatforms: string[];
}): ViralTopicOutput[] {
  return targetPlatforms.flatMap((platform) => [
    {
      platform,
      topic: `${brandName}: 3 biggest ${niche} mistakes in 2026`,
      viralReason:
        "Myth-busting and mistakes content reliably drives comments and shares.",
    },
    {
      platform,
      topic: `How ${brandName} would start ${niche} from zero in 30 days`,
      viralReason:
        "Step-by-step challenge formats are consistently high-retention and save-worthy.",
    },
    {
      platform,
      topic: `${niche} trend breakdown: what works now and what is dying`,
      viralReason:
        "Timely trend analysis creates urgency and positions the brand as a trusted guide.",
    },
  ]);
}

function isRateLimitError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("tokens per minute") ||
    message.includes("would exceed")
  );
}

function buildFallbackSystemPrompt(baseSystem: string) {
  return `${baseSystem}

Important fallback mode:
- Web search is unavailable for this attempt
- Use best-known evergreen trends and likely current patterns
- Keep results practical and high-confidence`;
}

async function generateResearchTopicsWithRetry({
  system,
  fallbackSystem,
  userMessage,
}: {
  system: string;
  fallbackSystem: string;
  userMessage: string;
}) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RESEARCH_RETRY_LIMIT; attempt += 1) {
    try {
      return await callClaudeJson<ViralTopicOutput[]>({
        system,
        userMessage,
        maxTokens: RESEARCH_MAX_TOKENS,
        enableWebSearch: true,
      });
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt === RESEARCH_RETRY_LIMIT) {
        break;
      }
      const waitMs = RESEARCH_BACKOFF_MS * attempt;
      console.warn("Research stage rate-limited, retrying", {
        attempt,
        waitMs,
        message: error instanceof Error ? error.message : String(error),
      });
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  if (isRateLimitError(lastError)) {
    console.warn(
      "Research stage falling back to non-web-search providers after repeated rate limits",
    );
    return callClaudeJson<ViralTopicOutput[]>({
      system: fallbackSystem,
      userMessage,
      maxTokens: RESEARCH_FALLBACK_MAX_TOKENS,
      enableWebSearch: false,
    });
  }

  throw lastError instanceof Error ? lastError : new Error("Research stage failed");
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
      status: "researching",
    });

    const systemPrompt = `You are a viral content research agent. Your job is to find the most trending, high-engagement topics from the past 7 days across social media platforms, specifically relevant to the niche provided.

For each platform requested, find 5-7 viral topics that:
- Are trending RIGHT NOW (past 7 days)
- Are relevant to the provided niche
- Have demonstrated high engagement (views, shares, comments, saves)
- Could be replicated or inspired by a brand in this niche

Return your findings as a JSON array with this exact structure:
[
  {
    "platform": "youtube",
    "topic": "Topic title here",
    "viralReason": "Why this is trending and performing well",
    "sourceUrl": "URL if available"
  }
]

Return ONLY the JSON array. No preamble, no markdown, no explanation.`;

    const userPrompt = `Research viral topics for the following:
Niche: ${parsed.data.niche}
Brand: ${parsed.data.brandName}
Platforms: ${parsed.data.targetPlatforms.join(", ")}
Date range: Past 7 days from ${parsed.data.weekStartDate}

Search each platform for trending content in this niche and return the JSON array of viral topics.`;

    const aiTopics = await generateResearchTopicsWithRetry({
      system: systemPrompt,
      fallbackSystem: buildFallbackSystemPrompt(systemPrompt),
      userMessage: userPrompt,
    }).catch((error) => {
      console.error("Research AI failed; using emergency topic fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
      return buildEmergencyResearchTopics({
        niche: parsed.data.niche,
        brandName: parsed.data.brandName,
        targetPlatforms: parsed.data.targetPlatforms,
      });
    });

    const sanitizedTopics = (Array.isArray(aiTopics) ? aiTopics : [])
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        platform: String(item.platform || "").toLowerCase().trim(),
        topic: String(item.topic || "").trim(),
        viralReason: String(item.viralReason || "").trim(),
        sourceUrl: item.sourceUrl ? String(item.sourceUrl).trim() : undefined,
      }))
      .filter(
        (item) =>
          item.platform &&
          item.topic &&
          item.viralReason &&
          parsed.data.targetPlatforms.includes(item.platform),
      );

    const cappedTopics = parsed.data.targetPlatforms.flatMap((platform) =>
      sanitizedTopics
        .filter((topic) => topic.platform === platform)
        .slice(0, RESEARCH_TOPICS_PER_PLATFORM),
    );

    await runContentPipelineMutation("contentPipeline:saveViralTopics", {
      userId: guard.userId,
      runId: parsed.data.runId,
      topics: cappedTopics,
    });

    await runContentPipelineMutation("contentPipeline:updateRunStatus", {
      userId: guard.userId,
      runId: parsed.data.runId,
      status: "refining",
    });

    return NextResponse.json({ viralTopics: cappedTopics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Research stage failed";
    console.error("Content pipeline research failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
