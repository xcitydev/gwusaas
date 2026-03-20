import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { callClaudeJson } from "@/lib/content-pipeline";
import { generateJsonWithFallback } from "@/lib/ai";

const bodySchema = z.object({
  niche: z.string().min(2),
  brandName: z.string().min(2),
  targetPlatforms: z.array(z.string()).min(1),
  goal: z.string().min(2),
});

type ViralIdea = {
  idea: string;
  platform: "youtube" | "instagram" | "tiktok" | "substack" | "reddit" | "any";
  category:
    | "client attraction"
    | "education"
    | "social proof"
    | "controversy"
    | "trend";
  hook: string;
  whyItWorks: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("tokens per minute")
  );
}

function sanitizeIdeas(value: unknown): ViralIdea[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        idea: String(row.idea ?? "").trim(),
        platform: (String(row.platform ?? "any").toLowerCase() as ViralIdea["platform"]),
        category: (String(row.category ?? "education").toLowerCase() as ViralIdea["category"]),
        hook: String(row.hook ?? "").trim(),
        whyItWorks: String(row.whyItWorks ?? "").trim(),
      };
    })
    .filter((item) => item.idea && item.hook && item.whyItWorks)
    .slice(0, 30);
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const system = `You are a viral content strategist specializing in helping service-based businesses and agencies attract clients through social media content.

Your job is to generate 30 highly specific, actionable viral content ideas for the brand provided. These ideas should be:
- Designed to go viral on social media
- Specifically crafted to attract potential clients (not just followers)
- Relevant to the brand's niche and target audience
- A mix of formats: educational, controversial opinion, social proof, trend-jacking, storytelling, listicles, before/after, case studies
- Platform-aware - tag each idea with the best platform(s) for it

Return ONLY a JSON array with this structure:
[
  {
    "idea": "Full idea title and brief description of the angle",
    "platform": "youtube" | "instagram" | "tiktok" | "substack" | "reddit" | "any",
    "category": "client attraction" | "education" | "social proof" | "controversy" | "trend",
    "hook": "The opening hook line for this piece of content",
    "whyItWorks": "One sentence explaining why this will attract clients"
  }
]

Return ONLY the JSON array. No preamble, no markdown, no explanation.`;

    const userMessage = `Brand: ${parsed.data.brandName}
Niche: ${parsed.data.niche}
Platforms: ${parsed.data.targetPlatforms.join(", ")}
Goal: ${parsed.data.goal}

Search for what's currently working in this niche to attract clients, then generate 30 viral content ideas.`;

    let ideas: ViralIdea[] = [];
    const webSearchRetryLimit = Number(process.env.VIRAL_IDEAS_WEB_RETRY_LIMIT || 2);
    const webSearchBackoffMs = Number(process.env.VIRAL_IDEAS_WEB_RETRY_BACKOFF_MS || 6000);
    const webSearchMaxTokens = Number(process.env.VIRAL_IDEAS_WEB_MAX_TOKENS || 1800);
    const fallbackMaxTokens = Number(process.env.VIRAL_IDEAS_FALLBACK_MAX_TOKENS || 1200);

    let lastError: unknown = null;
    for (let attempt = 0; attempt <= webSearchRetryLimit; attempt += 1) {
      try {
        const response = await callClaudeJson<ViralIdea[]>({
          system,
          userMessage,
          maxTokens: webSearchMaxTokens,
          enableWebSearch: true,
        });
        ideas = sanitizeIdeas(response);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (!isRateLimitError(error) || attempt === webSearchRetryLimit) break;
        await sleep(webSearchBackoffMs * (attempt + 1));
      }
    }

    // Fallback path: no web search, multi-provider (Gemini/OpenAI/Claude)
    if (ideas.length === 0) {
      const { data } = await generateJsonWithFallback<ViralIdea[]>({
        system: `${system}

Important: If web search is unavailable, use strong recent social patterns and winning formats from the last few months.`,
        messages: [{ role: "user", content: userMessage }],
        maxTokens: fallbackMaxTokens,
        traceId: `viral-ideas:${userId}:${Date.now()}`,
        providerOrder: process.env.PIPELINE_AI_PROVIDER_ORDER || "gemini,anthropic,openai",
      });
      ideas = sanitizeIdeas(data);
    }

    if (ideas.length === 0 && lastError) {
      throw lastError;
    }

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("Failed to generate viral ideas", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate ideas" },
      { status: 500 },
    );
  }
}
