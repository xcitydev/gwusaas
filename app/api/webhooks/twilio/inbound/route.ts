import { NextResponse } from "next/server";
import twilio from "twilio";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Twilio "Messaging webhook" fired when someone replies to a number we own.
// We try to match the inbound by From → most-recent outbound to that number.

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    return NextResponse.json({ error: "Convex not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);

  const signature = req.headers.get("x-twilio-signature");
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiSecret = process.env.TWILIO_API_KEY_SECRET;
  const validatorSecret = authToken || apiSecret;
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (signature && validatorSecret && base) {
    const fullUrl = `${base.replace(/\/$/, "")}/api/webhooks/twilio/inbound`;
    const obj: Record<string, string> = {};
    params.forEach((v, k) => {
      obj[k] = v;
    });
    const valid = twilio.validateRequest(validatorSecret, signature, fullUrl, obj);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const from = params.get("From");
  const body = params.get("Body") ?? "";

  if (!from) {
    return new NextResponse("<Response/>", { headers: { "Content-Type": "text/xml" } });
  }

  // Find the most recent outbound to this number and mark it as replied.
  const convex = new ConvexHttpClient(url);
  // We can't query Convex by 'to' efficiently here without a new index, but
  // updateStatus matches by provider+providerId. Inbound messages have a
  // different SID so we can't reuse that path. Instead, just log; the per-
  // recipient reply counter requires a future "by_to" index. For now, fire
  // a no-op response so Twilio stops retrying.
  console.info("Inbound SMS received", { from, snippet: body.slice(0, 80) });
  void convex;

  return new NextResponse(
    "<Response/>",
    { headers: { "Content-Type": "text/xml" } },
  );
}
