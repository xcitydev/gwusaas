import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJsonWithFallback, getAiErrorMessage } from "@/lib/ai";
import { requirePlan } from "@/lib/route-auth";
import { saveKeywordHistory } from "@/lib/convex-history";

const bodySchema = z.object({
  topic: z.string().min(2),
  targetAudience: z.string().min(2),
});

const systemPrompt =
  "You are an expert SEO keyword researcher. Return a JSON array of 20 keywords for the given topic and audience. Each keyword object must include: keyword, searchIntent (informational/navigational/transactional/commercial), estimatedDifficulty (1-100), contentIdea (one sentence), and priority (high/medium/low).";

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("starter");
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

    const traceId = `keyword-research:${guard.userId}:${Date.now()}`;
    const { data, provider, model, rawText } = await generateJsonWithFallback<unknown[]>({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Topic: ${parsed.data.topic}\nTarget Audience: ${parsed.data.targetAudience}\nReturn valid JSON only.`,
        },
      ],
      traceId,
    });

    const keywords = data;
    console.info("Keyword research generated", {
      traceId,
      provider,
      model,
      rawPreview: rawText.slice(0, 300),
    });
    await saveKeywordHistory({
      userId: guard.userId,
      topic: parsed.data.topic,
      keywords,
    });

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error("Keyword research generation failed", error);
    const message = getAiErrorMessage(error);
    return NextResponse.json(
      { error: `Failed to generate keyword research: ${message}` },
      { status: 500 },
    );
  }
}
