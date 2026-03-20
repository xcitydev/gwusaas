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
    const campaignId = searchParams.get("campaignId");
    const clientId = searchParams.get("clientId");
    if (!campaignId || !clientId) {
      return NextResponse.json(
        { error: "campaignId and clientId are required" },
        { status: 400 },
      );
    }
    const detail = (await convex.query("outreachWorkspace:getCampaignDetail" as never, {
      campaignId,
      clientId,
    } as never)) as { contacts?: unknown[] } | null;
    return NextResponse.json({ contacts: detail?.contacts || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch contacts" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!convex) return NextResponse.json({ error: "Convex URL missing" }, { status: 500 });
    const body = (await req.json()) as { contactId: string; clientId: string };
    const dealId = await convex.mutation("outreachWorkspace:createDealFromContact" as never, {
      contactId: body.contactId,
      clientId: body.clientId,
    } as never);
    return NextResponse.json({ dealId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update contact" },
      { status: 500 },
    );
  }
}
