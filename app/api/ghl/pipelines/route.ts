import { NextResponse } from "next/server";
import { getPipelines } from "@/lib/ghl";

/**
 * Returns all GHL pipelines for a location.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: "locationId query param is required" },
        { status: 400 },
      );
    }

    const pipelines = await getPipelines(locationId);
    return NextResponse.json({ success: true, data: pipelines });
  } catch (error) {
    console.error("GHL pipelines GET route failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pipelines" },
      { status: 500 },
    );
  }
}
