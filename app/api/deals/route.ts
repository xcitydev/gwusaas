import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!convex) return NextResponse.json({ error: "Convex URL missing" }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const deals = await convex.query("outreachWorkspace:listDeals" as never, { clientId } as never);
    return NextResponse.json({ deals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch deals" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!convex) return NextResponse.json({ error: "Convex URL missing" }, { status: 500 });
    const body = (await req.json()) as {
      dealId: string;
      stage?: string;
      dealValue?: number;
      notes?: string;
      lostReason?: string;
    };
    await convex.mutation("outreachWorkspace:updateDeal" as never, body as never);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update deal" },
      { status: 500 },
    );
  }
}
