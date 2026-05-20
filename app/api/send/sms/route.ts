import { NextResponse } from "next/server";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { requirePlan } from "@/lib/route-auth";
import { getTwilioClient, getTwilioFromNumber } from "@/lib/twilio-sms";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const bodySchema = z.object({
  to: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Use E.164 format like +15551234567"),
  body: z.string().min(1).max(1600),
  templateId: z.string().optional(),
});

function getConvex(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  return new ConvexHttpClient(url);
}

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("starter", { rateLimit: "ai", requireAi: false });
    if (!guard.ok) return guard.response;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const client = getTwilioClient();
    const from = getTwilioFromNumber();
    if (!client || !from) {
      return NextResponse.json(
        {
          error:
            "Twilio is not fully configured (need TWILIO_ACCOUNT_SID, TWILIO_PHONE_NUMBER, and either TWILIO_API_KEY_SID+TWILIO_API_KEY_SECRET or TWILIO_AUTH_TOKEN).",
        },
        { status: 500 },
      );
    }

    const to = parsed.data.to.startsWith("+") ? parsed.data.to : `+${parsed.data.to}`;
    const base = process.env.NEXT_PUBLIC_BASE_URL;
    const statusCallback = base ? `${base.replace(/\/$/, "")}/api/webhooks/twilio/sms` : undefined;

    const msg = await client.messages.create({
      to,
      from,
      body: parsed.data.body,
      ...(statusCallback ? { statusCallback } : {}),
    });

    const convex = getConvex();
    await convex.mutation(api.outreachSends.recordSend, {
      clerkUserId: guard.userId,
      templateId: parsed.data.templateId as Id<"outreachTemplates"> | undefined,
      channel: "sms",
      provider: "twilio",
      providerId: msg.sid,
      to,
      status: "sent",
    });

    return NextResponse.json({ providerId: msg.sid, to });
  } catch (error) {
    console.error("SMS send failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SMS send failed" },
      { status: 500 },
    );
  }
}
