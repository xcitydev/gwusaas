import { NextResponse } from "next/server";
import twilio from "twilio";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const TWILIO_STATUS_TO_STATUS: Record<string, string> = {
  queued: "queued",
  sending: "sending",
  sent: "sent",
  delivered: "delivered",
  undelivered: "failed",
  failed: "failed",
  received: "replied",
};

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    return NextResponse.json({ error: "Convex not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);
  const sid = params.get("MessageSid") ?? params.get("SmsSid") ?? "";
  const status = params.get("MessageStatus") ?? params.get("SmsStatus") ?? "";

  // Twilio signature verification — uses the public URL the request was sent to.
  const signature = req.headers.get("x-twilio-signature");
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiSecret = process.env.TWILIO_API_KEY_SECRET;
  const validatorSecret = authToken || apiSecret;
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (signature && validatorSecret && base) {
    const fullUrl = `${base.replace(/\/$/, "")}/api/webhooks/twilio/sms`;
    const obj: Record<string, string> = {};
    params.forEach((v, k) => {
      obj[k] = v;
    });
    const valid = twilio.validateRequest(validatorSecret, signature, fullUrl, obj);
    if (!valid) {
      console.warn("Twilio webhook signature invalid", { fullUrl, sid });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  if (!sid) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const mappedStatus = TWILIO_STATUS_TO_STATUS[status] ?? status;
  const convex = new ConvexHttpClient(url);
  await convex.mutation(api.outreachSends.updateStatus, {
    provider: "twilio",
    providerId: sid,
    status: mappedStatus,
    lastEvent: status,
  });

  return NextResponse.json({ ok: true });
}
