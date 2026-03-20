import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJsonWithFallback, getAiErrorMessage } from "@/lib/ai";
import { requirePlan } from "@/lib/route-auth";
import { saveAiGenerationHistory } from "@/lib/convex-history";

const bodySchema = z.object({
  niche: z.string().min(2),
  platform: z.string().min(2),
  goal: z.string().min(2),
});

const systemPrompt =
  "You are a growth content strategist. Return JSON array with 10 content ideas. Each idea must include: title, hook, formatSuggestion, and cta.";

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("growth");
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

    const traceId = `content-ideas:${guard.userId}:${Date.now()}`;
    const { data, provider, model, rawText } = await generateJsonWithFallback<unknown>({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content:
            `Niche: ${parsed.data.niche}\n` +
            `Platform: ${parsed.data.platform}\n` +
            `Goal: ${parsed.data.goal}\n` +
            "Return valid JSON only.",
        },
      ],
      traceId,
    });

    const ideas = data;
    console.info("Content ideas generated", {
      traceId,
      provider,
      model,
      rawPreview: rawText.slice(0, 300),
    });

    const generationId = await saveAiGenerationHistory({
      userId: guard.userId,
      type: "content-ideas",
      input: parsed.data,
      output: ideas,
    });

    return NextResponse.json({ ideas, generationId });
  } catch (error) {
    console.error("Content idea generation failed", error);
    const message = getAiErrorMessage(error);
    return NextResponse.json(
      { error: `Failed to generate content ideas: ${message}` },
      { status: 500 },
    );
  }
}
