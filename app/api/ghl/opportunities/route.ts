import { NextResponse } from "next/server";
import {
  createOpportunity,
  getOpportunities,
  type CreateOpportunityInput,
} from "@/lib/ghl";

/**
 * Returns all GHL opportunities for a location.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const pipelineId = searchParams.get("pipelineId") ?? undefined;

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: "locationId query param is required" },
        { status: 400 },
      );
    }

    const opportunities = await getOpportunities(locationId, pipelineId);
    return NextResponse.json({ success: true, data: opportunities });
  } catch (error) {
    console.error("GHL opportunities GET route failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch opportunities" },
      { status: 500 },
    );
  }
}

/**
 * Creates a new GHL opportunity.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as CreateOpportunityInput;
    if (
      !body?.name ||
      !body?.pipelineId ||
      !body?.pipelineStageId ||
      !body?.contactId ||
      !body?.locationId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "name, pipelineId, pipelineStageId, contactId, and locationId are required",
        },
        { status: 400 },
      );
    }

    const opportunity = await createOpportunity(body);
    if (!opportunity) {
      return NextResponse.json(
        { success: false, error: "Unable to create opportunity" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data: opportunity });
  } catch (error) {
    console.error("GHL opportunities POST route failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to create opportunity" },
      { status: 500 },
    );
  }
}
