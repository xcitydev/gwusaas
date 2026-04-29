import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { requireVoiceCallerAccess } from "@/lib/voiceCallerGate";
import { getAiErrorMessage } from "@/lib/ai";

export const runtime = "nodejs";

const bodySchema = z.object({
  niche: z.string().min(1),
  clientName: z.string().min(1),
  offer: z.string().min(1),
});

const SYSTEM_PROMPT =
  "You are a cold call script writer for AI marketing agencies. Write a short 45–60 second phone script for a sales qualifier named Jordan. The script should: open with a quick permission ask, probe for the pain point (inconsistent lead gen), ask for ballpark budget, confirm decision-making authority, then pitch a 20-minute demo with two time slot options. Sound natural and conversational — not salesy. Use {firstName} as a variable for personalization. Return only the script text, no labels or formatting.";

const FALLBACK_MODELS = ["claude-3-5-sonnet-latest", "claude-sonnet-4-20250514"];

export async function POST(req: Request) {
  const guard = await requireVoiceCallerAccess();
  if (!guard.ok) return guard.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body", details: getAiErrorMessage(error) },
      { status: 400 },
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const envModels = (process.env.ANTHROPIC_MODEL || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const models = Array.from(new Set([...envModels, ...FALLBACK_MODELS]));

  let lastError: unknown;
  for (const model of models) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Niche: ${body.niche}. Agency name: ${body.clientName}. Core offer: ${body.offer}.`,
          },
        ],
      });
      const text = response.content
        .map((block) => ("text" in block ? block.text : ""))
        .join("\n")
        .trim();
      if (!text) throw new Error("Empty script returned");
      return NextResponse.json({ script: text, model });
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number })?.status;
      if (status !== 404) {
        return NextResponse.json(
          { error: `Script generation failed: ${getAiErrorMessage(error)}` },
          { status: 502 },
        );
      }
    }
  }

  return NextResponse.json(
    { error: `No compatible Claude model: ${getAiErrorMessage(lastError)}` },
    { status: 502 },
  );
}
