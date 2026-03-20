import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlan } from "@/lib/route-auth";
import {
  runContentPipelineMutation,
  runContentPipelineQuery,
} from "@/lib/content-pipeline";

const bodySchema = z.object({
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientBusinessName: z.string().optional(),
  plan: z.enum(["starter", "growth", "elite"]),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("white_label");
    if (!guard.ok) return guard.response;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const invite = (await runContentPipelineMutation("whitelabel:inviteClient", {
      agencyUserId: guard.userId,
      clientName: parsed.data.clientName,
      clientEmail: parsed.data.clientEmail,
      clientBusinessName: parsed.data.clientBusinessName,
      plan: parsed.data.plan,
    })) as { clientId: string; inviteToken: string };

    const config = (await runContentPipelineQuery("whitelabel:getConfig", {
      userId: guard.userId,
    })) as { customDomain?: string } | null;

    const origin = new URL(req.url).origin;
    const baseUrl = config?.customDomain
      ? `https://${config.customDomain}`
      : origin;
    const inviteUrl = `${baseUrl}/join?token=${invite.inviteToken}`;

    // Hook your email provider here. For now, we log for delivery tracing.
    console.info("Whitelabel invite prepared", {
      to: parsed.data.clientEmail,
      inviteUrl,
      plan: parsed.data.plan,
      agencyUserId: guard.userId,
    });

    return NextResponse.json({
      success: true,
      inviteUrl,
      clientId: invite.clientId,
    });
  } catch (error) {
    console.error("Failed to create invite", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send invite",
      },
      { status: 500 },
    );
  }
}
