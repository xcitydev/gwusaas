import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { Webhook } from "svix";
import { api } from "@/convex/_generated/api";

const EVENT_TO_STATUS: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    return NextResponse.json({ error: "Convex not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signingSecret = process.env.RESEND_WEBHOOK_SECRET;

  let payload: unknown;
  if (signingSecret) {
    const wh = new Webhook(signingSecret);
    try {
      payload = wh.verify(rawBody, {
        "svix-id": req.headers.get("svix-id") ?? "",
        "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
        "svix-signature": req.headers.get("svix-signature") ?? "",
      });
    } catch (err) {
      console.warn("Resend webhook signature verification failed", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
  }

  const event = payload as { type?: string; data?: { email_id?: string; id?: string } };
  const type = event.type;
  const messageId = event.data?.email_id ?? event.data?.id;
  if (!type || !messageId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const status = EVENT_TO_STATUS[type] ?? type.replace("email.", "");
  const convex = new ConvexHttpClient(url);
  await convex.mutation(api.outreachSends.updateStatus, {
    provider: "resend",
    providerId: messageId,
    status,
    lastEvent: type,
  });

  return NextResponse.json({ ok: true });
}
