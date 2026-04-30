import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiErrorMessage, sseResponse, streamClaudeJson } from "@/lib/ai";
import { scrapeUrl } from "@/lib/firecrawl";
import { requirePlan } from "@/lib/route-auth";

const bodySchema = z.object({
  url: z.string().min(1),
});

const systemPrompt =
  "You are a SEO Link Building Strategist. Based on the website content provided, generate a detailed backlink strategy in JSON format. " +
  "Categories should include: 'Competitor Analysis', 'Guest Posting', 'Directory Opportunities', 'Broken Link Building', and 'PR/Outreach'. " +
  "For each category, provide: 'difficulty' (Low/Medium/High), 'potential_impact' (High/Medium/Low), 'strategy_description' (string), and 'action_steps' (array of strings). " +
  "Also include a 'summary' string of the overall strategy.";

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
    const guard = await requirePlan("growth");
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
    console.error("Backlink strategy generation failed", error);
    return NextResponse.json(
      { error: `Failed to generate backlink strategy: ${getAiErrorMessage(error)}` },
      { status: 500 },
    );
  }
}
