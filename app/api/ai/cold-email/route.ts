import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJsonWithFallback, getAiErrorMessage } from "@/lib/ai";
import { requirePlan } from "@/lib/route-auth";
import { saveAiGenerationHistory } from "@/lib/convex-history";

const bodySchema = z.object({
  targetIndustry: z.string().min(2),
  offer: z.string().min(2),
  tone: z.enum(["professional", "casual", "bold"]),
});

const systemPrompt =
  "You are a cold outreach copywriter. Generate a cold email sequence with exactly 3 emails: initial, followUp, breakup. Return valid JSON with subject and body for each email.";

const emailMessageSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

const emailSequenceSchema = z.object({
  initial: emailMessageSchema,
  followUp: emailMessageSchema,
  breakup: emailMessageSchema,
});

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toEmailMessage(value: unknown, fallbackLabel: string) {
  if (typeof value === "string") {
    return {
      subject: `${fallbackLabel} Email`,
      body: value.trim(),
    };
  }

  const obj = asRecord(value);
  if (!obj) return null;

  const subjectCandidate = obj.subject ?? obj.title ?? obj.headline;
  const bodyCandidate =
    obj.body ?? obj.content ?? obj.email ?? obj.text ?? obj.message;

  const subject =
    typeof subjectCandidate === "string" && subjectCandidate.trim().length > 0
      ? subjectCandidate.trim()
      : `${fallbackLabel} Email`;
  const body =
    typeof bodyCandidate === "string" && bodyCandidate.trim().length > 0
      ? bodyCandidate.trim()
      : "";

  if (!body) return null;

  return { subject, body };
}

function createTemplateSequence(input: {
  targetIndustry: string;
  offer: string;
  tone: "professional" | "casual" | "bold";
}) {
  const opener =
    input.tone === "casual"
      ? "Hey there,"
      : input.tone === "bold"
        ? "Quick one for you,"
        : "Hi there,";

  return {
    initial: {
      subject: `${input.offer} for ${input.targetIndustry}`,
      body:
        `${opener}\n\n` +
        `We help ${input.targetIndustry} get more qualified opportunities with our ${input.offer}.\n` +
        "Would you be open to a quick 15-minute chat this week to see if this could fit your current pipeline?\n\n" +
        "Best,\nGWU Agency",
    },
    followUp: {
      subject: `Following up: ${input.offer}`,
      body:
        "Just following up in case this got buried.\n\n" +
        `If improving outbound results in ${input.targetIndustry} is a priority, I can share a short breakdown of how we deploy this.\n\n` +
        "Open to a quick call?",
    },
    breakup: {
      subject: "Should I close your file?",
      body:
        "No worries if timing is not right.\n\n" +
        "If you want, I can circle back in a few weeks. Otherwise I will close this out for now.\n\n" +
        "Thanks either way.",
    },
  };
}

function normalizeSequence(
  value: unknown,
  input: { targetIndustry: string; offer: string; tone: "professional" | "casual" | "bold" },
) {
  const obj = asRecord(value);
  const list = Array.isArray(value) ? value : null;
  const emailsFromObj = obj && Array.isArray(obj.emails) ? obj.emails : null;
  const sequenceFromObj = obj && Array.isArray(obj.sequence) ? obj.sequence : null;

  const initial = toEmailMessage(
    obj?.initial ?? obj?.initialEmail ?? obj?.first ?? emailsFromObj?.[0] ?? sequenceFromObj?.[0] ?? list?.[0],
    "Initial",
  );
  const followUp = toEmailMessage(
    obj?.followUp ?? obj?.followup ?? obj?.follow_up ?? obj?.second ?? emailsFromObj?.[1] ?? sequenceFromObj?.[1] ?? list?.[1],
    "Follow-up",
  );
  const breakup = toEmailMessage(
    obj?.breakup ?? obj?.break_up ?? obj?.third ?? emailsFromObj?.[2] ?? sequenceFromObj?.[2] ?? list?.[2],
    "Breakup",
  );

  const merged = {
    initial,
    followUp,
    breakup,
  };

  const parsed = emailSequenceSchema.safeParse(merged);
  if (parsed.success) {
    return parsed.data;
  }

  console.warn("Cold email sequence normalization fallback", {
    zodIssues: parsed.error.issues,
    rawType: typeof value,
  });

  return createTemplateSequence(input);
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

    const traceId = `cold-email:${guard.userId}:${Date.now()}`;
    const { data, provider, model, rawText } = await generateJsonWithFallback<unknown>({
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content:
            `Target industry: ${parsed.data.targetIndustry}\n` +
            `Offer: ${parsed.data.offer}\n` +
            `Tone: ${parsed.data.tone}\n` +
            "Return valid JSON only.",
        },
      ],
      traceId,
    });

    const sequence = normalizeSequence(data, parsed.data);
    console.info("Cold email generated", {
      traceId,
      provider,
      model,
      rawPreview: rawText.slice(0, 300),
    });

    await saveAiGenerationHistory({
      userId: guard.userId,
      type: "cold-email",
      input: parsed.data,
      output: sequence,
    });

    return NextResponse.json({ sequence });
  } catch (error) {
    console.error("Cold email generation failed", error);
    const message = getAiErrorMessage(error);
    return NextResponse.json(
      { error: `Failed to generate cold email sequence: ${message}` },
      { status: 500 },
    );
  }
}
