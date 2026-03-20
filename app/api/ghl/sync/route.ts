import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { syncContactsToConvex } from "@/lib/ghl";

/**
 * Triggers manual sync of GHL contacts into Convex for a location.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { locationId?: string };
    const locationId = body.locationId ?? process.env.GHL_LOCATION_ID;

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: "locationId is required" },
        { status: 400 },
      );
    }

    const result = await syncContactsToConvex(locationId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("GHL sync POST route failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync contacts" },
      { status: 500 },
    );
  }
}
