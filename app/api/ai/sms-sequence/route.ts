import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJsonWithFallback, getAiErrorMessage } from "@/lib/ai";
import { requirePlan } from "@/lib/route-auth";
import { saveAiGenerationHistory } from "@/lib/convex-history";

const bodySchema = z.object({
  targetIndustry: z.string().min(2),
  offer: z.string().min(2),
  tone: z.enum(["friendly", "direct", "urgent"]),
  maxChars: z.number().int().min(80).max(480).optional(),
});

const systemPrompt =
  "You are an SMS copywriter writing high-conversion outbound texts. Always include opt-out language (Reply STOP). " +
  "Keep each message under the requested character limit. Output JSON with exactly 3 messages: initial, followUp, breakup. " +
  "Each message object has a single 'body' string. No markdown, no emojis unless tone is friendly.";

const smsMessageSchema = z.object({
  body: z.string().min(1),
});

const smsSequenceSchema = z.object({
  initial: smsMessageSchema,
  followUp: smsMessageSchema,
  breakup: smsMessageSchema,
});

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toSmsMessage(value: unknown): { body: string } | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return { body: value.trim() };
  }
  const obj = asRecord(value);
  if (!obj) return null;
  const candidate = obj.body ?? obj.text ?? obj.message ?? obj.content;
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return { body: candidate.trim() };
  }
  return null;
}

function createTemplateSequence(input: z.infer<typeof bodySchema>) {
  const sign = input.tone === "friendly" ? "👋" : "";
  return {
    initial: {
      body:
        `Hey ${sign} quick one — we help ${input.targetIndustry} businesses with ${input.offer}. ` +
        `Worth a 10-min chat this week? Reply STOP to opt out.`,
    },
    followUp: {
      body:
        `Following up on my last note re: ${input.offer}. Still open to a quick call? Reply STOP to opt out.`,
    },
    breakup: {
      body:
        `Last ping — should I close your file or circle back next quarter? Reply STOP to opt out.`,
    },
  };
}

function normalizeSequence(value: unknown, input: z.infer<typeof bodySchema>) {
  const obj = asRecord(value);
  const list = Array.isArray(value) ? value : null;
  const messages = obj && Array.isArray(obj.messages) ? obj.messages : null;
  const sequence = obj && Array.isArray(obj.sequence) ? obj.sequence : null;

  const initial = toSmsMessage(
    obj?.initial ?? obj?.first ?? messages?.[0] ?? sequence?.[0] ?? list?.[0],
  );
  const followUp = toSmsMessage(
    obj?.followUp ?? obj?.follow_up ?? obj?.second ?? messages?.[1] ?? sequence?.[1] ?? list?.[1],
  );
  const breakup = toSmsMessage(
    obj?.breakup ?? obj?.break_up ?? obj?.third ?? messages?.[2] ?? sequence?.[2] ?? list?.[2],
  );

  const parsed = smsSequenceSchema.safeParse({ initial, followUp, breakup });
  if (parsed.success) return parsed.data;
  return createTemplateSequence(input);
}

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
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const maxChars = parsed.data.maxChars ?? 160;
    const traceId = `sms-sequence:${guard.userId}:${Date.now()}`;

    const { data } = await generateJsonWithFallback<unknown>({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content:
            `Target industry: ${parsed.data.targetIndustry}\n` +
            `Offer: ${parsed.data.offer}\n` +
            `Tone: ${parsed.data.tone}\n` +
            `Max characters per message: ${maxChars}\n` +
            "Return JSON only.",
        },
      ],
      traceId,
    });

    const sequence = normalizeSequence(data, parsed.data);

    await saveAiGenerationHistory({
      userId: guard.userId,
      type: "sms-sequence",
      input: parsed.data,
      output: sequence,
    });

    return NextResponse.json({ sequence, maxChars });
  } catch (error) {
    console.error("SMS sequence generation failed", error);
    return NextResponse.json(
      { error: `Failed to generate SMS sequence: ${getAiErrorMessage(error)}` },
      { status: 500 },
    );
  }
}
