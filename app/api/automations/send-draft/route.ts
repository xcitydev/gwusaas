import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { Id } from "@/convex/_generated/dataModel";
import { sendPendingDraft } from "@/lib/automations/dispatcher";

export const runtime = "nodejs";

/**
 * Approve + send a pending automation draft. The Convex draft row is
 * marked `sent` once the GHL send succeeds.
 *
 * POST body: { draftId: Id<"automationDrafts"> }
 */
export async function POST(req: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let draftId: Id<"automationDrafts"> | undefined;
  try {
    const body = (await req.json()) as { draftId?: string };
    if (!body.draftId) {
      return NextResponse.json(
        { error: "draftId is required" },
        { status: 400 },
      );
    }
    draftId = body.draftId as Id<"automationDrafts">;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const result = await sendPendingDraft({
    clerkUserId: userId,
    draftId,
  });

  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }
  return NextResponse.json({ success: true, result });
}
