import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiErrorMessage, sseResponse, streamClaudeJson } from "@/lib/ai";
import { scrapeUrl } from "@/lib/firecrawl";
import { requirePlan } from "@/lib/route-auth";

const bodySchema = z.object({
  url: z.string().min(1),
});

const systemPrompt =
  "You are a Technical SEO expert. Analyze the following webpage content and provide a detailed technical SEO report in JSON format. " +
  "Focus on: indexing (robots meta, canonicals), performance (speed recommendations based on content size), security (HTTPS), mobile-friendliness, and architecture (URL structure, breadcrumbs). " +
  "For each category (indexing, performance, security, mobile, architecture, crawlers), " +
  "provide an object with: 'score' (0-10), 'status' (string like 'Good', 'Action Required', 'Warning'), 'issues' (array), and 'recommendations' (array). " +
  "Also include an 'overall_score' (0-100). Be technical and specific.";

function normalizeUrl(input: string) {
  const raw = input.trim();
  if (!raw) throw new Error("URL is required");
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
    const guard = await requirePlan("growth", {
      rateLimit: "ai",
      consumeUsage: "dailyAiGenerations",
    });
    if (!guard.ok) return guard.response;

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
    });

    return sseResponse(stream);
  } catch (error) {
    console.error("Technical SEO audit failed", error);
    return NextResponse.json(
      { error: `Failed to run technical SEO audit: ${getAiErrorMessage(error)}` },
      { status: 500 },
    );
  }
}
