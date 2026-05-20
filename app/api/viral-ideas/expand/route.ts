import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { generateJsonWithFallback } from "@/lib/ai";

const bodySchema = z.object({
  idea: z.string().min(5),
  platform: z.string().min(2),
  niche: z.string().min(2),
  brandName: z.string().min(1),
});

type ExpandedDraft = {
  caption: string;
  hashtags: string[];
  callToAction: string;
  visualDirection: string;
  bestTimeToPost: string;
  estimatedReach: string;
  scriptOutline?: string[];
};

function sanitizeDraft(value: unknown): ExpandedDraft | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const caption = String(row.caption ?? "").trim();
  if (!caption) return null;
  return {
    caption,
    hashtags: Array.isArray(row.hashtags)
      ? row.hashtags.map(String).slice(0, 30)
      : [],
    callToAction: String(row.callToAction ?? "").trim(),
    visualDirection: String(row.visualDirection ?? "").trim(),
    bestTimeToPost: String(row.bestTimeToPost ?? "").trim(),
    estimatedReach: String(row.estimatedReach ?? "").trim(),
    scriptOutline: Array.isArray(row.scriptOutline)
      ? row.scriptOutline.map(String)
      : undefined,
  };
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

    const system = `You are a world-class social media copywriter who turns content ideas into ready-to-post drafts.

Given a content idea, platform, niche, and brand name, generate a complete, polished draft ready to copy-paste and post.

Return ONLY a JSON object (not an array) with this structure:
{
  "caption": "Full post caption with line breaks, emojis, and formatting ready to post",
  "hashtags": ["hashtag1", "hashtag2", ...up to 30],
  "callToAction": "The specific CTA for this post",
  "visualDirection": "Description of what the image/video should look like",
  "bestTimeToPost": "Recommended day and time range for this platform",
  "estimatedReach": "Estimated reach potential (e.g., '5K-15K views with trending audio')",
  "scriptOutline": ["Step 1: Hook — ...", "Step 2: Problem — ...", "Step 3: Solution — ...", "Step 4: CTA — ..."] // only for video content
}

Return ONLY the JSON object. No preamble, no markdown, no explanation.`;

    const userMessage = `Idea: ${parsed.data.idea}
Platform: ${parsed.data.platform}
Niche: ${parsed.data.niche}
Brand: ${parsed.data.brandName}

Create a ready-to-post draft for this content idea. Make the caption engaging, use line breaks for readability, include relevant emojis, and ensure the CTA drives business results.`;

    const { data } = await generateJsonWithFallback<ExpandedDraft>({
      system,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 1200,
      traceId: `expand-idea:${userId}:${Date.now()}`,
      providerOrder:
        process.env.PIPELINE_AI_PROVIDER_ORDER || "gemini,anthropic,openai",
    });

    const draft = sanitizeDraft(data);
    if (!draft) {
      return NextResponse.json(
        { error: "Failed to generate draft" },
        { status: 500 },
      );
    }

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("Failed to expand idea", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to expand idea into draft",
      },
      { status: 500 },
    );
  }
}
