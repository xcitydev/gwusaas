import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlan } from "@/lib/route-auth";
import { getInternalPipelineHeaderValue } from "@/lib/pipeline-route-auth";
import {
  runContentPipelineMutation,
  runContentPipelineQuery,
} from "@/lib/content-pipeline";

const bodySchema = z.object({
  configId: z.string().optional(),
  weekStartDate: z.string().optional(),
});

const STAGE_COOLDOWN_BEFORE_REFINE_MS = Number(
  process.env.PIPELINE_COOLDOWN_BEFORE_REFINE_MS || 25000,
);
const STAGE_COOLDOWN_BEFORE_GENERATE_MS = Number(
  process.env.PIPELINE_COOLDOWN_BEFORE_GENERATE_MS || 12000,
);
const MERGED_TOPICS_PER_PLATFORM_CAP = Number(
  process.env.PIPELINE_MERGED_TOPICS_PER_PLATFORM || 4,
);

function trimText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3)}...`
    : normalized;
}

async function runPipelineInBackground({
  origin,
  cookieHeader,
  internalPipelineToken,
  userId,
  runId,
  config,
  weekStartDate,
}: {
  origin: string;
  cookieHeader: string;
  internalPipelineToken: string | null;
  userId: string;
  runId: string;
  config: {
    niche: string;
    brandName: string;
    brandVoice: string;
    contentPillars: string[];
    targetPlatforms: string[];
  };
  weekStartDate: string;
}) {
  try {
    await runContentPipelineMutation("contentPipeline:updateRunStatus", {
      userId,
      runId,
      status: "researching",
    });

    const commonHeaders = {
      "Content-Type": "application/json",
      cookie: cookieHeader,
      ...(internalPipelineToken
        ? {
            "x-internal-pipeline-token": internalPipelineToken,
            "x-pipeline-user-id": userId,
          }
        : {}),
    };

    const researchResponse = await fetch(`${origin}/api/content-pipeline/research`, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({
        runId,
        niche: config.niche,
        brandName: config.brandName,
        targetPlatforms: config.targetPlatforms,
        weekStartDate,
      }),
    });

    if (!researchResponse.ok) {
      const payload = (await researchResponse.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(payload?.error || "Research stage failed");
    }
    const researchData = (await researchResponse.json()) as {
      viralTopics: Array<{
        platform: string;
        topic: string;
        viralReason: string;
        sourceUrl?: string;
      }>;
    };

    const savedIdeas = (await runContentPipelineQuery("viralIdeas:getSavedIdeas", {
      userId,
    }).catch(() => [])) as Array<{
      idea: string;
      platform: string;
      category: string;
      whyItWorks?: string;
      addedToPipeline: boolean;
    }>;
    const seedIdeas = savedIdeas
      .filter((item) => item.addedToPipeline)
      .map((item) => ({
        platform: item.platform === "any" ? config.targetPlatforms[0] || "youtube" : item.platform,
        topic: item.idea,
        viralReason: item.whyItWorks || `Seed idea (${item.category})`,
        sourceUrl: undefined,
      }));
    const mergedViralTopicsRaw = [...researchData.viralTopics, ...seedIdeas];
    const mergedViralTopics = config.targetPlatforms.flatMap((platform) =>
      mergedViralTopicsRaw
        .filter((topic) => topic.platform === platform)
        .slice(0, MERGED_TOPICS_PER_PLATFORM_CAP)
        .map((topic) => ({
          platform: topic.platform,
          topic: trimText(topic.topic, 100),
          viralReason: trimText(topic.viralReason || "", 140),
          sourceUrl: topic.sourceUrl,
        })),
    );

    await new Promise((resolve) =>
      setTimeout(resolve, STAGE_COOLDOWN_BEFORE_REFINE_MS),
    );

    const refineResponse = await fetch(`${origin}/api/content-pipeline/refine`, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({
        runId,
        niche: config.niche,
        brandName: config.brandName,
        brandVoice: config.brandVoice,
        contentPillars: config.contentPillars.slice(0, 4),
        targetPlatforms: config.targetPlatforms,
        viralTopics: mergedViralTopics,
      }),
    });
    if (!refineResponse.ok) {
      const payload = (await refineResponse.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(payload?.error || "Refine stage failed");
    }
    const refineData = (await refineResponse.json()) as {
      refinedTopics: Array<{
        id: string;
        platform: string;
        dayNumber: number;
        topicTitle: string;
        topicAngle: string;
      }>;
    };

    await new Promise((resolve) =>
      setTimeout(resolve, STAGE_COOLDOWN_BEFORE_GENERATE_MS),
    );

    // Kick off generate stage without blocking this orchestrator.
    // The generate route now owns final run status updates (complete/error).
    void fetch(`${origin}/api/content-pipeline/generate`, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({
        runId,
        brandName: config.brandName,
        brandVoice: config.brandVoice,
        niche: config.niche,
        refinedTopics: refineData.refinedTopics,
      }),
    })
      .then(async (generateResponse) => {
        if (generateResponse.ok) return;
        const payload = (await generateResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        const message = payload?.error || "Generate stage failed";
        await runContentPipelineMutation("contentPipeline:updateRunStatus", {
          userId,
          runId,
          status: "error",
          errorMessage: message,
        }).catch((updateError) => {
          console.error("Failed to persist async generate error", updateError);
        });
      })
      .catch(async (generateError) => {
        const message =
          generateError instanceof Error
            ? generateError.message
            : "Generate stage request failed";
        await runContentPipelineMutation("contentPipeline:updateRunStatus", {
          userId,
          runId,
          status: "error",
          errorMessage: message,
        }).catch((updateError) => {
          console.error("Failed to persist async generate fetch error", updateError);
        });
      });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pipeline execution failed";
    console.error("Content pipeline run failed", { runId, message });
    await runContentPipelineMutation("contentPipeline:updateRunStatus", {
      userId,
      runId,
      status: "error",
      errorMessage: message,
    }).catch((updateError) => {
      console.error("Failed to update pipeline error state", updateError);
    });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("growth");
    if (!guard.ok) {
      return guard.response;
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const config = (await runContentPipelineQuery("contentPipeline:getConfig", {
      userId: guard.userId,
    })) as
      | {
          _id: string;
          niche: string;
          brandName: string;
          brandVoice: string;
          contentPillars: string[];
          targetPlatforms: string[];
        }
      | null;

    if (!config) {
      return NextResponse.json(
        { error: "Content pipeline config not found. Save config first." },
        { status: 400 },
      );
    }

    const weekStartDate =
      parsed.data.weekStartDate || new Date().toISOString().slice(0, 10);

    const runId = (await runContentPipelineMutation("contentPipeline:createRun", {
      userId: guard.userId,
      configId: parsed.data.configId || config._id,
      status: "pending",
      weekStartDate,
    })) as string;

    const origin = new URL(req.url).origin;
    const cookieHeader = req.headers.get("cookie") || "";
    const internalPipelineToken = getInternalPipelineHeaderValue();

    setTimeout(() => {
      void runPipelineInBackground({
        origin,
        cookieHeader,
        internalPipelineToken,
        userId: guard.userId,
        runId,
        config,
        weekStartDate,
      });
    }, 0);

    return NextResponse.json({ runId });
  } catch (error) {
    console.error("Failed to start content pipeline", error);
    const message =
      error instanceof Error ? error.message : "Failed to start content pipeline";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
