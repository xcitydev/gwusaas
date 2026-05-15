import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchConversations } from "@/lib/ghl";
import { getActiveGHLAuth } from "@/lib/ghl/serverAuth";

/**
 * Lists GoHighLevel conversations for the current user's connected sub-account.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const ghlAuth = await getActiveGHLAuth(userId);
  if (!ghlAuth) {
    return NextResponse.json(
      {
        success: false,
        error: "No GHL connection found. Connect GoHighLevel in Settings first.",
      },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit"));
  const status = searchParams.get("status") as
    | "all"
    | "unread"
    | "read"
    | "starred"
    | "recents"
    | null;
  const query = searchParams.get("query") ?? undefined;

  try {
    const result = await searchConversations({
      apiKey: ghlAuth.apiKey,
      locationId: ghlAuth.locationId,
      limit:
        Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50,
      status: status ?? "all",
      sort: "desc",
      sortBy: "last_message_date",
      query,
    });

    return NextResponse.json({
      success: true,
      data: {
        conversations: result.conversations,
        total: result.total,
        locationId: ghlAuth.locationId,
        locationName: ghlAuth.locationName,
      },
    });
  } catch (error) {
    console.error("GHL conversations GET failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to load conversations";
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 },
    );
  }
}
