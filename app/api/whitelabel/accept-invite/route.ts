import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runContentPipelineMutation } from "@/lib/content-pipeline";

const bodySchema = z.object({
  inviteToken: z.string().min(4),
  clerkUserId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const authState = await auth();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const clerkUserId = parsed.data.clerkUserId || authState.userId;
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = (await runContentPipelineMutation("whitelabel:acceptInvite", {
      inviteToken: parsed.data.inviteToken,
      clerkUserId,
    })) as { agencyUserId: string; plan: string };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to accept invite", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to accept invite",
      },
      { status: 500 },
    );
  }
}
