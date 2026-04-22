import { NextResponse } from "next/server";
import crypto from "crypto";

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
