import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { callClaudeJson } from "@/lib/content-pipeline";
import { generateJsonWithFallback } from "@/lib/ai";

const bodySchema = z.object({
  niche: z.string().min(2),
  platforms: z.array(z.string()).min(1),
});

export type TrendingItem = {
  title: string;
  platform: string;
  format: string;
  hook: string;
  whyTrending: string;
  engagementTip: string;
  exampleAngle: string;
  difficulty: "easy" | "medium" | "hard";
  timeSensitive: boolean;
};

function sanitizeTrending(value: unknown): TrendingItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        title: String(row.title ?? "").trim(),
        platform: String(row.platform ?? "any").toLowerCase(),
        format: String(row.format ?? "post").toLowerCase(),
        hook: String(row.hook ?? "").trim(),
        whyTrending: String(row.whyTrending ?? "").trim(),
        engagementTip: String(row.engagementTip ?? "").trim(),
        exampleAngle: String(row.exampleAngle ?? "").trim(),
        difficulty: (["easy", "medium", "hard"].includes(
          String(row.difficulty ?? "").toLowerCase(),
        )
          ? String(row.difficulty).toLowerCase()
          : "medium") as TrendingItem["difficulty"],
        timeSensitive: Boolean(row.timeSensitive),
      };
    })
    .filter((item) => item.title && item.hook && item.whyTrending)
    .slice(0, 15);
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

    const system = `You are a social media trend analyst who monitors what's going viral RIGHT NOW across platforms.

Your job is to find 12–15 REAL trending content formats, sounds, topics, and hooks that are currently blowing up on social media. Focus on trends that a service-based business in the given niche can piggyback on to attract clients.

For each trend, explain:
- What the trend IS (the format, sound, template)
- WHY it's trending (algorithm boost, cultural moment, controversy)
- How a business in this niche can use it to get clients
- A specific example angle they can film/post TODAY

Return ONLY a JSON array with this structure:
[
  {
    "title": "Name of the trend or viral format",
    "platform": "instagram" | "tiktok" | "youtube" | "twitter" | "linkedin" | "any",
    "format": "reel" | "carousel" | "story" | "short" | "thread" | "post" | "live",
    "hook": "The opening line or concept that makes people stop scrolling",
    "whyTrending": "Why this is blowing up right now (algorithm, cultural moment, etc.)",
    "engagementTip": "Specific tip to maximize reach with this trend",
    "exampleAngle": "A specific example of how someone in this niche could use this trend",
    "difficulty": "easy" | "medium" | "hard",
    "timeSensitive": true/false
  }
]

Return ONLY the JSON array. No preamble, no markdown, no explanation.`;

    const userMessage = `Niche: ${parsed.data.niche}
Platforms: ${parsed.data.platforms.join(", ")}

Search for what's CURRENTLY trending and going viral on these platforms in the last 7 days. Find real trends, viral sounds, content formats, and hooks that are getting massive engagement. Then show how a ${parsed.data.niche} business can ride these trends to get clients.`;

    let trends: TrendingItem[] = [];

    // Try web-search-enabled Claude first
    try {
      const response = await callClaudeJson<TrendingItem[]>({
        system,
        userMessage,
        maxTokens: 1800,
        enableWebSearch: true,
      });
      trends = sanitizeTrending(response);
    } catch (error) {
      console.warn("[Trending] web search failed, falling back", error);
    }

    // Fallback: multi-provider without web search
    if (trends.length === 0) {
      const { data } = await generateJsonWithFallback<TrendingItem[]>({
        system: `${system}\n\nImportant: Use your knowledge of the most common and effective social media trend patterns and evergreen viral formats.`,
        messages: [{ role: "user", content: userMessage }],
        maxTokens: 1400,
        traceId: `trending:${userId}:${Date.now()}`,
        providerOrder:
          process.env.PIPELINE_AI_PROVIDER_ORDER || "gemini,anthropic,openai",
      });
      trends = sanitizeTrending(data);
    }

    return NextResponse.json({ trends });
  } catch (error) {
    console.error("Failed to fetch trending content", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch trending content",
      },
      { status: 500 },
    );
  }
}
