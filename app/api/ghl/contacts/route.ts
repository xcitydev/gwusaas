import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createContact, getContacts, type CreateContactInput } from "@/lib/ghl";

/**
 * Returns all GHL contacts for a location.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId") || process.env.GHL_LOCATION_ID;
    const limitParam = searchParams.get("limit");

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: "locationId is required" },
        { status: 400 },
      );
    }

    const parsedLimit = limitParam ? Number(limitParam) : undefined;
    const limit = Number.isFinite(parsedLimit) && parsedLimit ? parsedLimit : 100;
    const contacts = await getContacts(locationId, limit);
    return NextResponse.json({ success: true, data: contacts });
  } catch (error) {
    console.error("GHL contacts GET route failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch contacts";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/**
 * Creates a new GHL contact.
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

    const body = (await request.json()) as CreateContactInput;
    const locationId = body?.locationId || process.env.GHL_LOCATION_ID;

    if (!locationId || !body?.firstName) {
      return NextResponse.json(
        { success: false, error: "locationId and firstName are required" },
        { status: 400 },
      );
    }

    const contact = await createContact(locationId, { ...body, locationId });
    if (!contact) {
      return NextResponse.json(
        { success: false, error: "Unable to create contact" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data: contact });
  } catch (error) {
    console.error("GHL contacts POST route failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to create contact" },
      { status: 500 },
    );
  }
}
