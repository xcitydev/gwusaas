import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJsonWithFallback, getAiErrorMessage } from "@/lib/ai";
import { requirePlan } from "@/lib/route-auth";
import { saveAiGenerationHistory } from "@/lib/convex-history";

const bodySchema = z.object({
  businessType: z.string().min(2),
  targetGeo: z.string().min(2),
  offer: z.string().min(2),
});

const systemPrompt =
  "You are a B2B lead generation strategist. Return JSON with keys: icpSummary (string), channels (array of objects with channel, whyItWorks, tooling, firstActions), scrapingPlaybooks (array of objects with sourceType, searchPattern, collectionMethod, complianceNotes), outreachAngles (array of objects with angle, openingLine, cta), and weeklyExecutionPlan (array of 7 concise tasks).";

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("growth");
    if (!guard.ok) return guard.response;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const traceId = `lead-gen-strategy:${guard.userId}:${Date.now()}`;
    const { data, provider, model, rawText } = await generateJsonWithFallback<unknown>({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content:
            `Business type: ${parsed.data.businessType}\n` +
            `Target geography: ${parsed.data.targetGeo}\n` +
            `Offer: ${parsed.data.offer}\n` +
            "Include practical methods using Apify scraping, Google maps data, directories, LinkedIn prospecting, and owned content funnels. Return valid JSON only.",
        },
      ],
      traceId,
    });

    const generationId = await saveAiGenerationHistory({
      userId: guard.userId,
      type: "lead-gen-strategy",
      input: parsed.data,
      output: data,
    });

    console.info("Lead gen strategy generated", {
      traceId,
      provider,
      model,
      rawPreview: rawText.slice(0, 300),
    });

    return NextResponse.json({ strategy: data, generationId });
  } catch (error) {
    console.error("Lead gen strategy failed", error);
    return NextResponse.json(
      { error: `Lead gen strategy failed: ${getAiErrorMessage(error)}` },
      { status: 500 },
    );
  }
}
