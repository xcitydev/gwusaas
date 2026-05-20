import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJsonWithFallback, getAiErrorMessage } from "@/lib/ai";
import { requirePlan } from "@/lib/route-auth";

const emailStepSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

const smsStepSchema = z.object({
  body: z.string(),
});

const bodySchema = z.object({
  channel: z.enum(["email", "sms"]),
  steps: z.array(z.union([emailStepSchema, smsStepSchema])).min(1).max(5),
  rows: z
    .array(z.record(z.string(), z.string()))
    .min(1)
    .max(25),
});

const systemPrompt =
  "You personalize cold outreach for each recipient. Keep the original structure, length, and tone. " +
  "Insert relevant details from the recipient row (name, company, role, pain point) naturally — not as obvious mail merge tags. " +
  "Return JSON with key 'personalized' = array (one per row) of arrays of step objects. " +
  "For email steps: {subject, body}. For SMS steps: {body}. Do not invent facts.";

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

    const traceId = `personalize:${guard.userId}:${Date.now()}`;
    const { data } = await generateJsonWithFallback<unknown>({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            channel: parsed.data.channel,
            template: parsed.data.steps,
            recipients: parsed.data.rows,
          }),
        },
      ],
      traceId,
    });

    const list =
      data && typeof data === "object" && !Array.isArray(data) && "personalized" in (data as object)
        ? (data as { personalized: unknown }).personalized
        : data;

    if (!Array.isArray(list)) {
      return NextResponse.json({ error: "Model returned invalid format" }, { status: 502 });
    }

    return NextResponse.json({ personalized: list });
  } catch (error) {
    console.error("Personalization failed", error);
    return NextResponse.json(
      { error: `Personalization failed: ${getAiErrorMessage(error)}` },
      { status: 500 },
    );
  }
}
