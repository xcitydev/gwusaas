import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiErrorMessage, sseResponse, streamClaudeJson } from "@/lib/ai";
import { scrapeUrl } from "@/lib/firecrawl";
import { requirePlan } from "@/lib/route-auth";
import { saveSeoAuditHistory } from "@/lib/convex-history";

const bodySchema = z.object({
  url: z.string().min(1),
});

const systemPrompt =
  "You are an expert SEO auditor. Analyze the following webpage content and return a structured JSON SEO audit covering: title tag, meta description, heading structure (H1-H6), keyword density, internal linking, page speed recommendations, mobile-friendliness notes, schema markup presence, and an overall SEO score out of 100. Be specific and actionable.";

function normalizeUrl(input: string) {
  const raw = input.trim();
  if (!raw) {
    throw new Error("URL is required");
  }

  try {
    return new URL(raw).toString();
  } catch {
    try {
      return new URL(`https://${raw}`).toString();
    } catch {
      throw new Error("Please enter a valid website URL");
    }
  }
}

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

    const normalizedUrl = normalizeUrl(parsed.data.url);
    const pageContent = await scrapeUrl(normalizedUrl);

    const stream = await streamClaudeJson({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `URL: ${normalizedUrl}\n\nScraped Content:\n${pageContent}`,
        },
      ],
      onComplete: async (fullText) => {
        let result: unknown = fullText;
        try {
          result = JSON.parse(fullText);
        } catch {
          // Fallback to raw text if model returns invalid JSON.
        }

        await saveSeoAuditHistory({
          userId: guard.userId,
          url: normalizedUrl,
          result,
        });
      },
    });

    return sseResponse(stream);
  } catch (error) {
    console.error("SEO audit generation failed", error);
    const message = getAiErrorMessage(error);
    return NextResponse.json(
      { error: `Failed to generate SEO audit: ${message}` },
      { status: 500 },
    );
  }
}
