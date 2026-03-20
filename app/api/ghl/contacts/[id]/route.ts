import { NextResponse } from "next/server";
import {
  deleteContact,
  getContactById,
  updateContact,
  type UpdateContactInput,
} from "@/lib/ghl";

type Params = { params: Promise<{ id: string }> };

/**
 * Returns a single GHL contact by ID.
 */
export async function GET(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const contact = await getContactById(id);
    if (!contact) {
      return NextResponse.json(
        { success: false, error: "Contact not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: contact });
  } catch (error) {
    console.error("GHL contact GET by ID route failed", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch contact" },
      { status: 500 },
    );
  }
}

/**
 * Updates an existing GHL contact.
 */
export async function PUT(
  request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateContactInput;
    const contact = await updateContact(id, body);
    if (!contact) {
      return NextResponse.json(
        { success: false, error: "Unable to update contact" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data: contact });
  } catch (error) {
    console.error("GHL contact PUT route failed", { error });
    return NextResponse.json(
      { success: false, error: "Failed to update contact" },
      { status: 500 },
    );
  }
}

/**
 * Deletes a GHL contact.
 */
export async function DELETE(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const deleted = await deleteContact(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Unable to delete contact" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("GHL contact DELETE route failed", { error });
    return NextResponse.json(
      { success: false, error: "Failed to delete contact" },
      { status: 500 },
    );
  }
}
