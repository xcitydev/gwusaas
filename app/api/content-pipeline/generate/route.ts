import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePipelinePlan } from "@/lib/pipeline-route-auth";
import {
  callClaudeJson,
  generateImageFromPrompt,
  runContentPipelineMutation,
  sleep,
} from "@/lib/content-pipeline";

const topicSchema = z.object({
  id: z.string().min(1),
  platform: z.string().min(2),
  dayNumber: z.number().min(1).max(7),
  topicTitle: z.string().min(2),
  topicAngle: z.string().min(2),
});

const bodySchema = z.object({
  runId: z.string().min(1),
  brandName: z.string().min(2),
  brandVoice: z.string().min(2),
  niche: z.string().min(2),
  refinedTopics: z.array(topicSchema).min(1),
});

type TopicInput = z.infer<typeof topicSchema>;

const PIPELINE_BATCH_SIZE = Math.max(
  1,
  Number(process.env.PIPELINE_GENERATE_BATCH_SIZE || 1),
);
const PIPELINE_BATCH_DELAY_MS = Number(
  process.env.PIPELINE_GENERATE_BATCH_DELAY_MS || 8000,
);
const PIPELINE_RETRY_LIMIT = Number(process.env.PIPELINE_GENERATE_RETRY_LIMIT || 4);
const PIPELINE_RATE_LIMIT_BACKOFF_MS = Number(
  process.env.PIPELINE_GENERATE_BACKOFF_MS || 9000,
);
const PIPELINE_MAX_TOKENS = Number(process.env.PIPELINE_GENERATE_MAX_TOKENS || 1000);

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
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

function getPlatformPrompt(platform: string) {
  switch (platform) {
    case "youtube":
      return {
        extra:
          "You are a YouTube script writer. Write engaging, educational scripts with a strong hook in the first 15 seconds. Use conversational language. Include timestamps markers like [0:00], [0:30] etc.",
        expected:
          '{ "script": "...", "image_prompt": "..." }',
      };
    case "instagram":
      return {
        extra:
          "You are an Instagram content writer. Write captions that stop the scroll. Lead with a bold hook line, use short punchy paragraphs, end with a question CTA to drive comments.",
        expected:
          '{ "caption": "...", "image_prompt": "..." }',
      };
    case "tiktok":
      return {
        extra:
          "You are a TikTok script writer. The first 3 seconds must be a scroll-stopping hook. Keep sentences short. Write for spoken delivery. Use pattern interrupts.",
        expected:
          '{ "script": "...", "image_prompt": "..." }',
      };
    case "substack":
      return {
        extra:
          "You are a newsletter writer. Write in a warm, direct editorial voice. Each newsletter should feel like a personal note from an expert. Include a subject line and preview text at the top.",
        expected:
          '{ "newsletter": "..." }',
      };
    case "reddit":
      return {
        extra:
          "You are writing a Reddit post. It must not feel like marketing. Write from a genuine community member perspective sharing value, asking questions, or sparking discussion. Include a compelling title.",
        expected:
          '{ "post": "..." }',
      };
    default:
      return {
        extra: "Write platform-native content.",
        expected:
          '{ "post": "...", "image_prompt": "optional visual concept" }',
      };
  }
}

async function saveGenerationError({
  userId,
  runId,
  topic,
  error,
}: {
  userId: string;
  runId: string;
  topic: TopicInput;
  error: unknown;
}) {
  const message =
    error instanceof Error ? error.message : "Unknown content generation failure";
  await runContentPipelineMutation("contentPipeline:saveGeneratedContent", {
    userId,
    runId,
    refinedTopicId: topic.id,
    platform: topic.platform,
    dayNumber: topic.dayNumber,
    contentType: "error",
    content: message,
    status: "error",
  });
}

async function generateContentWithRetry(params: {
  systemPrompt: string;
  userPrompt: string;
}) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= PIPELINE_RETRY_LIMIT; attempt += 1) {
    try {
      return await callClaudeJson<Record<string, string>>({
        system: params.systemPrompt,
        userMessage: params.userPrompt,
        maxTokens: PIPELINE_MAX_TOKENS,
      });
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt === PIPELINE_RETRY_LIMIT) {
        throw error;
      }
      const backoffMs = PIPELINE_RATE_LIMIT_BACKOFF_MS * attempt;
      console.warn("Rate limit encountered, retrying content generation", {
        attempt,
        backoffMs,
        message: error instanceof Error ? error.message : String(error),
      });
      await sleep(backoffMs);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Generation failed unexpectedly");
}

export async function POST(req: Request) {
  let guardedUserId: string | null = null;
  let guardedRunId: string | null = null;
  try {
    const guard = await requirePipelinePlan(req, "growth");
    if (!guard.ok) return guard.response;
    guardedUserId = guard.userId;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    guardedRunId = parsed.data.runId;

    await runContentPipelineMutation("contentPipeline:updateRunStatus", {
      userId: guard.userId,
      runId: parsed.data.runId,
      status: "generating",
    });

    let successCount = 0;
    let failedCount = 0;

    const batches = chunkArray(parsed.data.refinedTopics, PIPELINE_BATCH_SIZE);
    for (const [batchIndex, batch] of batches.entries()) {
      await Promise.all(
        batch.map(async (topic) => {
          try {
            const promptParts = getPlatformPrompt(topic.platform);
            const systemPrompt = `${promptParts.extra}

Always return ONLY a JSON object with the content fields for this platform. No preamble, no markdown fences, no explanation. Just the JSON object. Expected shape: ${promptParts.expected}`;
            const userPrompt = `Brand: ${parsed.data.brandName}
Niche: ${parsed.data.niche}
Voice: ${parsed.data.brandVoice}
Platform: ${topic.platform}
Day: ${topic.dayNumber}
Topic: ${topic.topicTitle}
Angle: ${topic.topicAngle}

Generate the content for this topic on this platform.`;

            const content = await generateContentWithRetry({
              systemPrompt,
              userPrompt,
            });

            const imagePrompt =
              typeof content.image_prompt === "string" && content.image_prompt.trim()
                ? content.image_prompt.trim()
                : null;

            let imageUrl: string | undefined;
            if (imagePrompt) {
              try {
                imageUrl = await generateImageFromPrompt(
                  `${imagePrompt}. Brand: ${parsed.data.brandName}. Style: clean, modern, professional social media visual.`,
                );
              } catch (imageError) {
                console.warn("Image generation failed for topic", {
                  refinedTopicId: topic.id,
                  error:
                    imageError instanceof Error ? imageError.message : imageError,
                });
              }
            }

            const entries = Object.entries(content).filter(
              ([, value]) => typeof value === "string" && value.trim().length > 0,
            );

            if (entries.length === 0) {
              throw new Error("No content fields returned");
            }

            for (const [contentType, value] of entries) {
              await runContentPipelineMutation("contentPipeline:saveGeneratedContent", {
                userId: guard.userId,
                runId: parsed.data.runId,
                refinedTopicId: topic.id,
                platform: topic.platform,
                dayNumber: topic.dayNumber,
                contentType,
                content: value,
                imageUrl: contentType === "image_prompt" ? imageUrl : undefined,
                status: "draft",
              });
              successCount += 1;
            }
          } catch (error) {
            failedCount += 1;
            console.error("Topic generation failed", {
              runId: parsed.data.runId,
              refinedTopicId: topic.id,
              error,
            });
            await saveGenerationError({
              userId: guard.userId,
              runId: parsed.data.runId,
              topic,
              error,
            }).catch((saveError) => {
              console.error("Failed to persist generation error", saveError);
            });
          }
        }),
      );
      if (batchIndex < batches.length - 1) {
        await sleep(PIPELINE_BATCH_DELAY_MS);
      }
    }

    await runContentPipelineMutation("contentPipeline:updateRunStatus", {
      userId: guard.userId,
      runId: parsed.data.runId,
      status: "complete",
    });

    return NextResponse.json({
      success: true,
      successCount,
      failedCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generation stage failed";
    console.error("Content pipeline generation failed", error);

    if (guardedUserId && guardedRunId) {
      await runContentPipelineMutation("contentPipeline:updateRunStatus", {
        userId: guardedUserId,
        runId: guardedRunId,
        status: "error",
        errorMessage: message,
      }).catch((statusError) => {
        console.error("Failed to persist generation error status", statusError);
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
