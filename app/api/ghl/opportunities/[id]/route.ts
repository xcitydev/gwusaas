import { NextResponse } from "next/server";
import { deleteOpportunity, updateOpportunityStage } from "@/lib/ghl";

type Params = { params: Promise<{ id: string }> };

/**
 * Updates the stage of a GHL opportunity.
 */
export async function PUT(
  request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = (await request.json()) as { stageId?: string };
    if (!body?.stageId) {
      return NextResponse.json(
        { success: false, error: "stageId is required" },
        { status: 400 },
      );
    }

    const opportunity = await updateOpportunityStage(id, body.stageId);
    if (!opportunity) {
      return NextResponse.json(
        { success: false, error: "Unable to update opportunity stage" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data: opportunity });
  } catch (error) {
    console.error("GHL opportunity PUT route failed", { error });
    return NextResponse.json(
      { success: false, error: "Failed to update opportunity stage" },
      { status: 500 },
    );
  }
}

/**
 * Deletes a GHL opportunity.
 */
export async function DELETE(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const deleted = await deleteOpportunity(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Unable to delete opportunity" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("GHL opportunity DELETE route failed", { error });
    return NextResponse.json(
      { success: false, error: "Failed to delete opportunity" },
      { status: 500 },
    );
  }
}
