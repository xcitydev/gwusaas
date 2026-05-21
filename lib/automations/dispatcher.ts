import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConversationMessages, sendMessage } from "@/lib/ghl";
import { getActiveGHLAuth } from "@/lib/ghl/serverAuth";
import { generateJsonWithFallback } from "@/lib/ai";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

/**
 * Required input from the webhook. Keep this small + serializable so the
 * dispatcher can also be invoked from a backfill or admin tool.
 */
export type DispatchInput = {
  clerkUserId: string;
  conversationId: string;
  channel: "instagram" | "sms" | "email" | "facebook" | "whatsapp";
  messageBody: string;
  contactLabel?: string;
  /**
   * Only honored when the dispatcher is called from a manual UI action
   * (e.g. "test this rule now"). When false (default), normal webhook
   * dedupe rules apply: we'll skip if a pending draft already exists.
   */
  forceRefresh?: boolean;
};

export type DispatchResult =
  | { kind: "no-match"; reason: string }
  | { kind: "max-replies"; runId: Id<"automationRuns"> }
  | { kind: "taken-over"; runId: Id<"automationRuns"> }
  | {
      kind: "drafted";
      runId: Id<"automationRuns">;
      draftId: Id<"automationDrafts">;
      body: string;
    }
  | {
      kind: "sent";
      runId: Id<"automationRuns">;
      draftId: Id<"automationDrafts">;
      messageId?: string;
    }
  | { kind: "error"; message: string };

function requireConvex(): ConvexHttpClient {
  if (!convex) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return convex;
}

function channelToGhlType(
  channel: DispatchInput["channel"],
): "SMS" | "Email" | "IG" | "FB" | "WhatsApp" {
  switch (channel) {
    case "sms":
      return "SMS";
    case "email":
      return "Email";
    case "instagram":
      return "IG";
    case "facebook":
      return "FB";
    case "whatsapp":
      return "WhatsApp";
  }
}

function goalSentence(goal: string): string {
  switch (goal) {
    case "book-call":
      return "Push the conversation toward booking a quick discovery call.";
    case "qualify":
      return "Ask 1-2 short qualification questions to gauge fit.";
    case "send-pricing":
      return "Surface the pricing options in a low-pressure way.";
    default:
      return "Move the conversation toward the user's stated goal.";
  }
}

function buildSystemPrompt(rule: {
  persona: string;
  goal: string;
  disclaimerRequired: boolean;
  channel: DispatchInput["channel"];
}, isFirstReply: boolean): string {
  const disclaimer =
    rule.disclaimerRequired && isFirstReply
      ? "Open the reply with a short, friendly note that they're chatting with an AI assistant on the user's behalf. Keep it natural."
      : "Do not mention being an AI unless the prospect directly asks.";

  return `You are an inbound conversation automation. The user has set you up to
handle replies for an incoming lead.

Persona / brand voice:
${rule.persona || "(no persona provided — be warm, conversational, and concise.)"}

Primary goal for this conversation:
${goalSentence(rule.goal)}

Channel: ${rule.channel.toUpperCase()}. Keep length appropriate for the channel —
SMS/IG/FB messages are short (<= 280 chars usually); email can be longer.

Hard rules:
- Sound like a real person, not a brand.
- Never invent facts, prices, dates, or commitments.
- If the prospect asks something only a human should answer (legal,
  custom pricing, scheduling conflicts), say you'll get the human on it.
- If the prospect explicitly asks to stop, opt out, or seems uninterested,
  acknowledge and don't push.
- ${disclaimer}

Return JSON in this exact shape:
{
  "reply": "<the message text>",
  "intent": "qualifying" | "booking" | "objection-handling" | "closing" | "info",
  "reasoning": "<1 sentence on why you went with this angle>"
}`;
}

export async function dispatchAutomation(
  input: DispatchInput,
): Promise<DispatchResult> {
  try {
    const cx = requireConvex();

    // 1. Match a rule.
    const rule = await cx.query(api.automations.findMatchingAutomation, {
      clerkUserId: input.clerkUserId,
      channel: input.channel,
      messageBody: input.messageBody,
    });
    if (!rule) {
      return { kind: "no-match", reason: "no active rule matched" };
    }

    // 2. Ensure a run row exists / reuse the active one.
    const runId = await cx.mutation(
      api.automations.upsertRunForConversation,
      {
        clerkUserId: input.clerkUserId,
        automationId: rule._id,
        conversationId: input.conversationId,
        channel: input.channel,
      },
    );
    await cx.mutation(api.automations.recordInbound, { runId });

    // 3. Re-fetch the run to check status + reply caps.
    const allRuns = await cx.query(api.automations.listRuns, {
      automationId: rule._id,
    });
    const run = allRuns.find((r) => r._id === runId);
    if (!run) {
      return { kind: "error", message: "Run row vanished after upsert" };
    }
    if (run.status === "stopped" || run.status === "completed") {
      return { kind: "taken-over", runId };
    }
    if (run.replyCount >= rule.maxRepliesPerThread) {
      return { kind: "max-replies", runId };
    }

    // 4. Pull thread history from GHL.
    const ghlAuth = await getActiveGHLAuth(input.clerkUserId);
    if (!ghlAuth) {
      return {
        kind: "error",
        message:
          "No active GHL connection — automation can't read the thread.",
      };
    }

    let history: { role: "agent" | "lead"; text: string }[] = [];
    let contactIdForSend: string | undefined;
    try {
      const res = await getConversationMessages({
        conversationId: input.conversationId,
        apiKey: ghlAuth.apiKey,
        limit: 20,
      });
      history = res.messages
        .map((m) => ({
          role:
            m.direction === "outbound"
              ? ("agent" as const)
              : ("lead" as const),
          text: (m.body ?? "").trim(),
        }))
        .filter((m) => m.text.length > 0)
        .reverse();
      // GHL message objects carry the contactId; pick the first one we see.
      const firstWithContact = res.messages.find((m) => (m as { contactId?: string }).contactId);
      contactIdForSend = (firstWithContact as { contactId?: string } | undefined)?.contactId;
    } catch (err) {
      return {
        kind: "error",
        message: `Failed to fetch GHL history: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // 5. Compose AI reply.
    const isFirstReply = run.replyCount === 0;
    const systemPrompt = buildSystemPrompt(
      {
        persona: rule.persona,
        goal: rule.goal,
        disclaimerRequired: rule.disclaimerRequired,
        channel: input.channel,
      },
      isFirstReply,
    );
    const transcript = history
      .map(
        (m, i) =>
          `${i + 1}. [${m.role === "agent" ? "Me" : "Prospect"}] ${m.text}`,
      )
      .join("\n");
    const userPrompt = [
      `Channel: ${input.channel.toUpperCase()}`,
      `Latest prospect message: ${input.messageBody}`,
      "",
      "Conversation so far:",
      transcript || "(no prior messages — this is the very first reply)",
      "",
      "Draft the next message I should send.",
    ].join("\n");

    let aiReply: {
      reply: string;
      intent?: string;
      reasoning?: string;
    };
    let provider: string | undefined;
    let model: string | undefined;
    try {
      const result = await generateJsonWithFallback<{
        reply: string;
        intent?: string;
        reasoning?: string;
      }>({
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        maxTokens: 600,
        traceId: `automation:${rule._id}:${input.conversationId}`,
      });
      aiReply = result.data;
      provider = result.provider;
      model = result.model;
    } catch (err) {
      return {
        kind: "error",
        message: `AI generation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (!aiReply?.reply?.trim()) {
      return { kind: "error", message: "AI returned an empty reply." };
    }

    // 6. Optionally create a deal in the automation pipeline.
    if (rule.autoCreateDeal) {
      await cx.mutation(api.automations.ensureDeal, {
        clerkUserId: input.clerkUserId,
        runId,
        automationId: rule._id,
        conversationId: input.conversationId,
        contactLabel: input.contactLabel ?? "Inbound lead",
        defaultDealValue: rule.defaultDealValue,
      });
    }

    // 7a. Approval mode: store as pending draft, stop here.
    if (rule.mode === "approval") {
      const draftId = await cx.mutation(api.automations.createDraft, {
        clerkUserId: input.clerkUserId,
        runId,
        automationId: rule._id,
        conversationId: input.conversationId,
        channel: input.channel,
        body: aiReply.reply,
        intent: aiReply.intent,
        reasoning: aiReply.reasoning,
        provider,
        model,
        status: "pending",
      });
      return { kind: "drafted", runId, draftId, body: aiReply.reply };
    }

    // 7b. Autonomous mode: send via GHL, then record as sent.
    if (!contactIdForSend) {
      return {
        kind: "error",
        message:
          "No contactId resolved from GHL — can't send autonomously. Saving as draft instead.",
      };
    }

    let sentMessageId: string | undefined;
    try {
      const result = await sendMessage({
        type: channelToGhlType(input.channel),
        contactId: contactIdForSend,
        message: aiReply.reply,
        apiKey: ghlAuth.apiKey,
      });
      sentMessageId = result.messageId;
    } catch (err) {
      // If send fails, still store the draft so the user can review + retry.
      const draftId = await cx.mutation(api.automations.createDraft, {
        clerkUserId: input.clerkUserId,
        runId,
        automationId: rule._id,
        conversationId: input.conversationId,
        channel: input.channel,
        body: aiReply.reply,
        intent: aiReply.intent,
        reasoning: aiReply.reasoning,
        provider,
        model,
        status: "pending",
      });
      return {
        kind: "error",
        message: `GHL send failed: ${err instanceof Error ? err.message : String(err)}. Saved as draft ${draftId}.`,
      };
    }

    const draftId = await cx.mutation(api.automations.createDraft, {
      clerkUserId: input.clerkUserId,
      runId,
      automationId: rule._id,
      conversationId: input.conversationId,
      channel: input.channel,
      body: aiReply.reply,
      intent: aiReply.intent,
      reasoning: aiReply.reasoning,
      provider,
      model,
      status: "sent",
      sentMessageId,
    });

    return { kind: "sent", runId, draftId, messageId: sentMessageId };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Sends a pending draft. Called from /api/automations/send-draft when the
 * user approves a queued reply.
 */
export async function sendPendingDraft({
  clerkUserId,
  draftId,
}: {
  clerkUserId: string;
  draftId: Id<"automationDrafts">;
}): Promise<DispatchResult> {
  try {
    const cx = requireConvex();
    const drafts = await cx.query(api.automations.listPendingDrafts, {});
    const draft = drafts.find((d) => d._id === draftId);
    if (!draft || draft.clerkUserId !== clerkUserId) {
      return { kind: "error", message: "Draft not found or not yours." };
    }

    const ghlAuth = await getActiveGHLAuth(clerkUserId);
    if (!ghlAuth) {
      return { kind: "error", message: "No active GHL connection." };
    }

    // Resolve the contactId for this conversation from GHL.
    let contactIdForSend: string | undefined;
    try {
      const res = await getConversationMessages({
        conversationId: draft.conversationId,
        apiKey: ghlAuth.apiKey,
        limit: 5,
      });
      const firstWithContact = res.messages.find((m) => (m as { contactId?: string }).contactId);
      contactIdForSend = (firstWithContact as { contactId?: string } | undefined)?.contactId;
    } catch (err) {
      return {
        kind: "error",
        message: `Could not resolve contactId: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (!contactIdForSend) {
      return {
        kind: "error",
        message: "Could not resolve a GHL contactId for this conversation.",
      };
    }

    const result = await sendMessage({
      type: channelToGhlType(draft.channel as DispatchInput["channel"]),
      contactId: contactIdForSend,
      message: draft.body,
      apiKey: ghlAuth.apiKey,
    });

    await cx.mutation(api.automations.markDraftSent, {
      draftId,
      sentMessageId: result.messageId,
    });
    return {
      kind: "sent",
      runId: draft.runId,
      draftId,
      messageId: result.messageId,
    };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
