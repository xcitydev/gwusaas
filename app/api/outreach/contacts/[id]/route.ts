import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!convex) return NextResponse.json({ error: "Convex URL missing" }, { status: 500 });

    const { id } = await params;
    const body = (await req.json()) as { dmStatus: string; note?: string };
    await convex.mutation("outreachWorkspace:updateContactStatus" as never, {
      contactId: id,
      dmStatus: body.dmStatus,
      note: body.note,
    } as never);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update contact" },
      { status: 500 },
    );
  }
}
