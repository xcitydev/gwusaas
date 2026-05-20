import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJsonWithFallback, getAiErrorMessage } from "@/lib/ai";
import { requirePlan } from "@/lib/route-auth";

const bodySchema = z.object({
  reply: z.string().min(2).max(4000),
  originalSubject: z.string().optional(),
  originalBody: z.string().optional(),
  channel: z.enum(["email", "sms"]).default("email"),
  senderName: z.string().optional(),
});

const CATEGORIES = [
  "interested",
  "objection_price",
  "objection_timing",
  "objection_authority",
  "ooo",
  "unsubscribe",
  "not_now",
  "wrong_person",
  "neutral",
] as const;

const responseSchema = z.object({
  category: z.enum(CATEGORIES),
  confidence: z.number().min(0).max(1),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  summary: z.string(),
  suggestedAction: z.string(),
  draftReply: z.object({
    subject: z.string().optional(),
    body: z.string(),
  }),
});

const systemPrompt =
  "You triage cold-outreach replies. Classify the reply into one of: " +
  CATEGORIES.join(", ") +
  ". Provide a confidence score (0-1), overall sentiment, a 1-sentence summary, a suggested action, " +
  "and a drafted follow-up reply matched to the category (book a call for interested; gracefully acknowledge for ooo/not_now/unsubscribe; address the objection for objection_*). " +
  "For SMS replies, keep draft body under 320 chars. Return JSON only with keys: category, confidence, sentiment, summary, suggestedAction, draftReply.";

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("starter", {
      rateLimit: "ai",
      consumeUsage: "dailyAiGenerations",
    });
    if (!guard.ok) return guard.response;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const traceId = `reply-classify:${guard.userId}:${Date.now()}`;
    const userContext = [
      parsed.data.originalSubject ? `Original subject: ${parsed.data.originalSubject}` : null,
      parsed.data.originalBody ? `Original message:\n${parsed.data.originalBody}` : null,
      parsed.data.senderName ? `Sender name: ${parsed.data.senderName}` : null,
      `Channel: ${parsed.data.channel}`,
      `Reply received:\n${parsed.data.reply}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { data } = await generateJsonWithFallback<unknown>({
      system: systemPrompt,
      messages: [{ role: "user", content: userContext }],
      traceId,
    });

    const result = responseSchema.safeParse(data);
    if (!result.success) {
      return NextResponse.json(
        { error: "Model returned invalid shape", issues: result.error.issues },
        { status: 502 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Reply classification failed", error);
    return NextResponse.json(
      { error: `Reply classification failed: ${getAiErrorMessage(error)}` },
      { status: 500 },
    );
  }
}
