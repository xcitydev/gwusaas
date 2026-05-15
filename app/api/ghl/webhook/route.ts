import { NextResponse } from "next/server";
import crypto from "crypto";
import { isFreshWebhookEvent } from "@/lib/webhookIdempotency";

type WebhookPayload = {
  type?: string;
  eventType?: string;
  [key: string]: unknown;
};

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

    switch (eventType) {
      case "ContactCreated":
        // TODO: Add business logic for ContactCreated.
        break;
      case "OpportunityStageChanged":
        // TODO: Add business logic for OpportunityStageChanged.
        break;
      default:
        // TODO: Add business logic for other webhook event types.
        break;
    }

    return NextResponse.json({ success: true, data: { eventType } });
  } catch (error) {
    console.error("GHL webhook route failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to process webhook payload" },
      { status: 500 },
    );
  }
}
