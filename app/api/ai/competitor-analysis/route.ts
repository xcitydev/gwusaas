import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJsonWithFallback, getAiErrorMessage } from "@/lib/ai";
import { scrapeUrl } from "@/lib/firecrawl";
import { requirePlan } from "@/lib/route-auth";
import { saveAiGenerationHistory } from "@/lib/convex-history";

const bodySchema = z.object({
  competitorUrl: z.string().url(),
  ourUrl: z.string().url(),
});

const systemPrompt =
  "You are an expert digital marketing strategist. Compare these two websites and return a structured JSON response. " +
  "Use these exact keys: 'strengthsOfCompetitor' (array of strings), 'weaknessesOfCompetitor' (array of strings), " +
  "'opportunitiesWeCanExploit' (array of strings), 'keywordGaps' (array of strings), 'contentGaps' (array of strings), " +
  "'backlinkStrategyRecommendations' (array of strings), and 'overallCompetitiveThreatScore' (number 1-10). " +
  "Be analytical, specific, and data-driven based on the provided content.";

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("growth", {
      rateLimit: "ai",
      consumeUsage: "dailyAiGenerations",
    });
    if (!guard.ok) {
      return guard.response;
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const [competitorContent, ourContent] = await Promise.all([
      scrapeUrl(parsed.data.competitorUrl),
      scrapeUrl(parsed.data.ourUrl),
    ]);

    const traceId = `competitor-analysis:${guard.userId}:${Date.now()}`;
    const { data, provider, model, rawText } = await generateJsonWithFallback<unknown>({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content:
            `Competitor URL: ${parsed.data.competitorUrl}\n` +
            `Our URL: ${parsed.data.ourUrl}\n\n` +
            `Competitor content:\n${competitorContent}\n\n` +
            `Our content:\n${ourContent}\n\n` +
            "Return valid JSON only.",
        },
      ],
      traceId,
    });

    const analysis = data;
    console.info("Competitor analysis generated", {
      traceId,
      provider,
      model,
      rawPreview: rawText.slice(0, 300),
    });
    await saveAiGenerationHistory({
      userId: guard.userId,
      type: "competitor",
      input: parsed.data,
      output: analysis,
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Competitor analysis generation failed", error);
    const message = getAiErrorMessage(error);
    return NextResponse.json(
      { error: `Failed to generate competitor analysis: ${message}` },
      { status: 500 },
    );
  }
}
