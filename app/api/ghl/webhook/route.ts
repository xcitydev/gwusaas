import { NextResponse } from "next/server";
import crypto from "crypto";
import { isFreshWebhookEvent } from "@/lib/webhookIdempotency";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import {
  dispatchAutomation,
  type DispatchInput,
} from "@/lib/automations/dispatcher";

type WebhookPayload = {
  type?: string;
  eventType?: string;
  [key: string]: unknown;
};

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

/**
 * Maps GHL message-type strings to our internal channel enum used by
 * automation rules. Returns null for types we don't yet auto-reply on
 * (so the rule never fires for, e.g., voice notes).
 */
function mapGhlMessageType(
  messageType: string | undefined,
): DispatchInput["channel"] | null {
  if (!messageType) return null;
  const t = messageType.toUpperCase();
  if (t.includes("INSTAGRAM") || t === "IG" || t === "TYPE_INSTAGRAM") return "instagram";
  if (t.includes("SMS") || t === "TYPE_SMS") return "sms";
  if (t.includes("EMAIL") || t === "TYPE_EMAIL") return "email";
  if (t.includes("FACEBOOK") || t === "FB" || t === "TYPE_FB") return "facebook";
  if (t.includes("WHATSAPP") || t === "TYPE_WHATSAPP") return "whatsapp";
  return null;
}

/**
 * Receives inbound webhook events from GoHighLevel.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rawPayload = await request.text();
    const signature = request.headers.get("x-ghl-signature");
    const secret = process.env.GHL_WEBHOOK_SECRET;

    // Verify signature in production
    if (process.env.NODE_ENV === "production") {
      if (!signature || !secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(rawPayload);
      const expectedSignature = hmac.digest("hex");

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    let payload: WebhookPayload = {};
    try {
      payload = rawPayload ? (JSON.parse(rawPayload) as WebhookPayload) : {};
    } catch {
      // Non-JSON payloads are still accepted; parsed payload stays empty.
    }

    const eventType = payload.type ?? payload.eventType ?? "Unknown";

    // Idempotency: GHL retries on timeout, dedupe by event id (or fall back
    // to a hash of the body if the event has no stable id field).
    const eventId =
      typeof payload.id === "string"
        ? payload.id
        : typeof payload.eventId === "string"
          ? payload.eventId
          : crypto.createHash("sha256").update(rawPayload).digest("hex");
    const fresh = await isFreshWebhookEvent("ghl", `${eventType}:${eventId}`);
    if (!fresh) {
      return NextResponse.json({ success: true, deduped: true });
    }

    let dispatchOutcome: string | undefined;

    switch (eventType) {
      case "ContactCreated":
        // TODO: Add business logic for ContactCreated.
        break;
      case "OpportunityStageChanged":
        // TODO: Add business logic for OpportunityStageChanged.
        break;
      case "InboundMessage": {
        // Auto-reply dispatcher: only inbound (lead-to-us) messages.
        const direction = String(payload.direction ?? "");
        if (direction && direction !== "inbound") break;

        const locationId = String(payload.locationId ?? "");
        const conversationId = String(payload.conversationId ?? "");
        const body = String(payload.body ?? payload.message ?? "");
        const messageType = String(payload.messageType ?? payload.type ?? "");
        const contactLabel =
          typeof payload.contactName === "string"
            ? payload.contactName
            : typeof payload.contactEmail === "string"
              ? payload.contactEmail
              : undefined;
        const channel = mapGhlMessageType(messageType);

        if (!locationId || !conversationId || !body.trim() || !channel || !convex) {
          dispatchOutcome = "skipped:missing_fields";
          break;
        }

        const clerkUserId = (await convex.query(
          api.automations.findUserByLocationId,
          { locationId },
        )) as string | null;
        if (!clerkUserId) {
          dispatchOutcome = "skipped:unknown_location";
          break;
        }

        const result = await dispatchAutomation({
          clerkUserId,
          conversationId,
          channel,
          messageBody: body,
          contactLabel,
        });
        dispatchOutcome = result.kind;
        if (result.kind === "error") {
          console.warn("[ghl/webhook] automation dispatch failed", {
            conversationId,
            channel,
            message: result.message,
          });
        }
        break;
      }
      default:
        // TODO: Add business logic for other webhook event types.
        break;
    }

    return NextResponse.json({
      success: true,
      data: { eventType, automation: dispatchOutcome },
    });
  } catch (error) {
    console.error("GHL webhook route failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to process webhook payload" },
      { status: 500 },
    );
  }
}
