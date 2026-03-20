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

    const campaigns = await convex.query("outreachWorkspace:listCampaigns" as never, {
      clerkUserId: userId,
      clientId,
    } as never);
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch campaigns" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!convex) return NextResponse.json({ error: "Convex URL missing" }, { status: 500 });
    const body = await req.json();
    const id = await convex.mutation("outreachWorkspace:createCampaign" as never, {
      clerkUserId: userId,
      ...body,
    } as never);
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create campaign" },
      { status: 500 },
    );
  }
}
