import { NextResponse } from "next/server";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { requirePlan } from "@/lib/route-auth";
import { getResendClient, getResendFromAddress } from "@/lib/resend";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const bodySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  templateId: z.string().optional(),
  replyTo: z.string().email().optional(),
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

    const resend = getResendClient();
    if (!resend) {
      return NextResponse.json(
        { error: "Resend is not configured. Set RESEND_API_KEY." },
        { status: 500 },
      );
    }

    const from = getResendFromAddress();
    const tagSafeUser = guard.userId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
    const sendResult = await resend.emails.send({
      from,
      to: parsed.data.to,
      subject: parsed.data.subject,
      text: parsed.data.body,
      html: toHtml(parsed.data.body),
      replyTo: parsed.data.replyTo,
      tags: [
        { name: "user", value: tagSafeUser },
        ...(parsed.data.templateId ? [{ name: "template", value: parsed.data.templateId.slice(0, 64) }] : []),
      ],
    });

    if (sendResult.error) {
      return NextResponse.json(
        { error: sendResult.error.message ?? "Resend rejected the send" },
        { status: 502 },
      );
    }

    const providerId = sendResult.data?.id ?? "";
    if (!providerId) {
      return NextResponse.json({ error: "Resend returned no message id" }, { status: 502 });
    }

    const convex = getConvex();
    await convex.mutation(api.outreachSends.recordSend, {
      clerkUserId: guard.userId,
      templateId: parsed.data.templateId as Id<"outreachTemplates"> | undefined,
      channel: "email",
      provider: "resend",
      providerId,
      to: parsed.data.to,
      subject: parsed.data.subject,
      status: "sent",
    });

    return NextResponse.json({ providerId, to: parsed.data.to });
  } catch (error) {
    console.error("Email send failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email send failed" },
      { status: 500 },
    );
  }
}
