import { NextResponse } from "next/server";

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
    console.log("Received GHL webhook payload", rawPayload);

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
