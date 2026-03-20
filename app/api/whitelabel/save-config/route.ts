import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlan } from "@/lib/route-auth";
import { runContentPipelineMutation } from "@/lib/content-pipeline";

const bodySchema = z.object({
  userId: z.string(),
  agencyName: z.string().min(2),
  platformName: z.string().min(2),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().min(4),
  secondaryColor: z.string().min(4),
  customDomain: z.string().optional(),
  supportEmail: z.string().optional(),
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

    const id = await runContentPipelineMutation("whitelabel:saveConfig", parsed.data);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save config" },
      { status: 500 },
    );
  }
}
