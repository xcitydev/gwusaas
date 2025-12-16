/**
 * Instagram Webhook endpoint
 * Handles real-time DM notifications from Instagram Graph API
 * 
 * Webhook URL: /api/webhook/instagram
 * 
 * Setup in Facebook Developer Console:
 * 1. Go to your App > Webhooks
 * 2. Add callback URL: https://yourdomain.com/api/webhook/instagram
 * 3. Verify token: Set INSTAGRAM_WEBHOOK_VERIFY_TOKEN in environment
 * 4. Subscribe to: messages, messaging_postbacks
 */
export async function GET(request: Request) {
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

export async function POST(request: Request) {
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
      // Call Convex httpAction via Convex HTTP endpoint
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!convexUrl) {
        throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
      }

      // Forward to Convex httpAction
      const response = await fetch(`${convexUrl}/httpAction/http/instagramWebhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      return response;
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

