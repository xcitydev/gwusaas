import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Instagram Webhook endpoint
 * Handles real-time DM notifications from Instagram Graph API
 */
export const instagramWebhook = httpAction(async (ctx, request) => {
  // Handle GET request for webhook verification
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const expectedToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

    if (mode === "subscribe" && token === expectedToken) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("Forbidden", { status: 403 });
  }

  // Handle POST request for webhook events
  if (request.method === "POST") {
    try {
      const body = await request.json();

      // Instagram sends webhook events in this format:
      // {
      //   object: "instagram",
      //   entry: [
      //     {
      //       id: "page_id",
      //       time: timestamp,
      //       messaging: [
      //         {
      //           sender: { id: "user_id" },
      //           recipient: { id: "page_id" },
      //           timestamp: timestamp,
      //           message: {
      //             mid: "message_id",
      //             text: "message text",
      //             attachments: [...]
      //           }
      //         }
      //       ]
      //     }
      //   ]
      // }

      if (body.object === "instagram" && body.entry) {
        for (const entry of body.entry) {
          const pageId = entry.id;
          const messaging = entry.messaging || [];

          for (const event of messaging) {
            if (event.message) {
              // New message received
              await ctx.runMutation(internal.testIG.processWebhookMessage, {
                pageId,
                senderId: event.sender.id,
                recipientId: event.recipient.id,
                messageId: event.message.mid,
                messageText: event.message.text || "",
                timestamp: event.timestamp,
                attachments: event.message.attachments || [],
              });
            }

            if (event.postback) {
              // Postback event (button clicks, etc.)
              await ctx.runMutation(internal.testIG.processWebhookPostback, {
                pageId,
                senderId: event.sender.id,
                recipientId: event.recipient.id,
                payload: event.postback.payload,
                timestamp: event.timestamp,
              });
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

