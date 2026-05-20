import { NextResponse } from "next/server";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { requirePlan } from "@/lib/route-auth";
import { getResendClient, getResendFromAddress } from "@/lib/resend";
import { getTwilioClient, getTwilioFromNumber } from "@/lib/twilio-sms";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const emailStepSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

const smsStepSchema = z.object({
  body: z.string().min(1),
});

const recipientSchema = z.object({
  to: z.string().min(3),
  steps: z.array(z.union([emailStepSchema, smsStepSchema])).min(1).max(5),
});

const bodySchema = z.object({
  channel: z.enum(["email", "sms"]),
  templateId: z.string().optional(),
  recipients: z.array(recipientSchema).min(1).max(25),
  // For now we send only the FIRST step per recipient (the initial outreach).
  // Multi-step drips need a scheduler — covered by the multi-channel sequence builder.
  stepIndex: z.number().int().min(0).max(4).default(0),
});

function getConvex(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  return new ConvexHttpClient(url);
}

function toHtml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:Inter,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:#111;white-space:pre-wrap">${escaped}</div>`;
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

    const convex = getConvex();
    const results: Array<{ to: string; ok: boolean; id?: string; error?: string }> = [];

    if (parsed.data.channel === "email") {
      const resend = getResendClient();
      if (!resend) {
        return NextResponse.json(
          { error: "Resend not configured" },
          { status: 500 },
        );
      }
      const from = getResendFromAddress();
      const tagUser = guard.userId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);

      for (const r of parsed.data.recipients) {
        const step = r.steps[parsed.data.stepIndex] as { subject?: string; body: string };
        const subject = "subject" in step && step.subject ? step.subject : "Quick note";
        try {
          const sendResult = await resend.emails.send({
            from,
            to: r.to,
            subject,
            text: step.body,
            html: toHtml(step.body),
            tags: [
              { name: "user", value: tagUser },
              ...(parsed.data.templateId ? [{ name: "template", value: parsed.data.templateId.slice(0, 64) }] : []),
            ],
          });
          if (sendResult.error || !sendResult.data?.id) {
            results.push({ to: r.to, ok: false, error: sendResult.error?.message ?? "no id returned" });
            continue;
          }
          await convex.mutation(api.outreachSends.recordSend, {
            clerkUserId: guard.userId,
            templateId: parsed.data.templateId as Id<"outreachTemplates"> | undefined,
            channel: "email",
            provider: "resend",
            providerId: sendResult.data.id,
            to: r.to,
            subject,
            status: "sent",
          });
          results.push({ to: r.to, ok: true, id: sendResult.data.id });
        } catch (err) {
          results.push({ to: r.to, ok: false, error: err instanceof Error ? err.message : "send failed" });
        }
      }
    } else {
      const client = getTwilioClient();
      const from = getTwilioFromNumber();
      if (!client || !from) {
        return NextResponse.json(
          { error: "Twilio not configured" },
          { status: 500 },
        );
      }
      const base = process.env.NEXT_PUBLIC_BASE_URL;
      const statusCallback = base ? `${base.replace(/\/$/, "")}/api/webhooks/twilio/sms` : undefined;

      for (const r of parsed.data.recipients) {
        const step = r.steps[parsed.data.stepIndex];
        const to = r.to.startsWith("+") ? r.to : `+${r.to}`;
        try {
          const msg = await client.messages.create({
            to,
            from,
            body: step.body,
            ...(statusCallback ? { statusCallback } : {}),
          });
          await convex.mutation(api.outreachSends.recordSend, {
            clerkUserId: guard.userId,
            templateId: parsed.data.templateId as Id<"outreachTemplates"> | undefined,
            channel: "sms",
            provider: "twilio",
            providerId: msg.sid,
            to,
            status: "sent",
          });
          results.push({ to, ok: true, id: msg.sid });
        } catch (err) {
          results.push({ to, ok: false, error: err instanceof Error ? err.message : "send failed" });
        }
      }
    }
    const sent = results.filter((r) => r.ok).length;
    return NextResponse.json({ sent, total: results.length, results });
  } catch (error) {
    console.error("Bulk send failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk send failed" },
      { status: 500 },
    );
  }
}
