import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlan } from "@/lib/route-auth";
import { runContentPipelineMutation } from "@/lib/content-pipeline";

const bodySchema = z.object({
  userId: z.string(),
  domain: z.string().min(3),
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
    if (parsed.data.userId !== guard.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const result = (await runContentPipelineMutation(
      "whitelabel:saveDomainVerification",
      parsed.data,
    )) as { txtRecord: string };

    return NextResponse.json({ success: true, txtRecord: result.txtRecord });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to setup domain" },
      { status: 500 },
    );
  }
}
