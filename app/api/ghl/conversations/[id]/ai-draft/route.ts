import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConversationMessages } from "@/lib/ghl";
import { getActiveGHLAuth } from "@/lib/ghl/serverAuth";
import { generateJsonWithFallback } from "@/lib/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Drafts an AI reply for a GHL conversation. Pulls the last N messages,
 * hands them to the multi-provider AI router with a qualification-leaning
 * system prompt, and returns a JSON-shaped suggestion the UI can preview
 * before sending.
 */

type DraftBody = {
  /** Optional context the user can type in: tone, intent, additional facts. */
  intent?: string;
  /** Optional override of which channel the reply is going on (for tone). */
  channel?: "SMS" | "Email" | "WhatsApp" | "IG" | "FB" | "Custom";
  /** How many recent messages to feed the model. Default 20. */
  historyLimit?: number;
};

type DraftResult = {
  reply: string;
  intent: "qualifying" | "booking" | "objection-handling" | "closing" | "info";
  reasoning: string;
};

const SYSTEM_PROMPT = `You draft short, human-sounding outbound replies for a marketing agency's
qualification inbox. Conversations are typically SMS-style cold outreach
where prospects answered with a keyword like "MIAMI" to express interest.

Your job: read the recent thread and return a SINGLE next message that:
- Sounds like a real person texting from their phone — not a brand or AI.
- Stays short. SMS replies under ~280 characters; longer only if essential.
- Mirrors the prospect's energy and last message.
- Pushes toward the next concrete step (qualification questions OR booking
  a quick call) without being pushy.
- Never uses generic "thanks for your message" filler.
- Never invents facts about the prospect. Use only what the thread shows.
- If the prospect already booked / asked to be removed / already replied
  with a clear no, the draft should acknowledge and step back, not push.

Return JSON in this exact shape:
{
  "reply": "<the message text>",
  "intent": "qualifying" | "booking" | "objection-handling" | "closing" | "info",
  "reasoning": "<1 sentence on why you went with this angle>"
}`;

function bodyText(m: { body?: string; messageType?: string }): string {
  return (m.body ?? "").trim();
}

function roleFor(direction: string | undefined): "agent" | "lead" {
  return direction === "outbound" ? "agent" : "lead";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // Rate limit: AI drafts hit Anthropic/OpenAI on every call.
  const rl = await checkRateLimit(userId, "ai");
  const denied = rateLimitResponse(rl);
  if (denied) return denied as unknown as NextResponse;

  const { id: conversationId } = await context.params;
  if (!conversationId) {
    return NextResponse.json(
      { success: false, error: "conversationId is required" },
      { status: 400 },
    );
  }

  const ghlAuth = await getActiveGHLAuth(userId);
  if (!ghlAuth) {
    return NextResponse.json(
      {
        success: false,
        error: "No GHL connection found. Connect GoHighLevel in Settings first.",
      },
      { status: 400 },
    );
  }

  let body: DraftBody = {};
  try {
    body = (await request.json()) as DraftBody;
  } catch {
    // Empty body is fine — all fields are optional.
  }

  // Pull the recent history from GHL.
  let history: { role: "agent" | "lead"; text: string; ts: string }[] = [];
  try {
    const result = await getConversationMessages({
      conversationId,
      apiKey: ghlAuth.apiKey,
      limit: body.historyLimit ?? 20,
    });
    history = result.messages
      .map((m) => ({
        role: roleFor(m.direction),
        text: bodyText(m),
        ts: m.dateAdded,
      }))
      .filter((m) => m.text.length > 0)
      // GHL returns newest-first; flip to chronological for the LLM.
      .reverse();
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to load history";
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }

  if (history.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No messages in this conversation yet — nothing to draft from.",
      },
      { status: 400 },
    );
  }

  const channel = body.channel ?? "SMS";
  const intent = body.intent?.trim();

  const transcriptForPrompt = history
    .map((m, i) => `${i + 1}. [${m.role === "agent" ? "Me" : "Prospect"}] ${m.text}`)
    .join("\n");

  const userPrompt = [
    `Channel: ${channel}`,
    intent ? `What I want this reply to do: ${intent}` : null,
    "",
    "Conversation so far (chronological, oldest first):",
    transcriptForPrompt,
    "",
    "Draft the next message I should send.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { data, provider, model } = await generateJsonWithFallback<DraftResult>({
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 600,
      traceId: `ghl-ai-draft:${conversationId}`,
    });

    if (!data?.reply) {
      return NextResponse.json(
        { success: false, error: "AI returned no reply text" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reply: data.reply,
        intent: data.intent,
        reasoning: data.reasoning,
        provider,
        model,
        historyCount: history.length,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI draft failed";
    console.error("[ghl/ai-draft] generation failed", error);
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
