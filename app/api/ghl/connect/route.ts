import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { ghlFetch } from "@/lib/ghl";
import { invalidateGHLAuthCache } from "@/lib/ghl/serverAuth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type ConnectBody = {
  apiKey?: string;
  locationId?: string;
  signupSource?: "existing" | "affiliate";
};

type LocationResponse = {
  location?: { id?: string; name?: string };
  id?: string;
  name?: string;
};

const isLegacySaveConnectionValidatorError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("ArgumentValidationError") &&
    error.message.includes("Object contains extra field") &&
    (error.message.includes("`apiKey`") || error.message.includes("`signupSource`"))
  );
};

/**
 * Connects a business's GoHighLevel sub-account to the platform.
 * Validates the (apiKey, locationId) pair against the GHL API before saving.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: ConnectBody;
  try {
    body = (await request.json()) as ConnectBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const apiKey = body.apiKey?.trim();
  const locationId = body.locationId?.trim();

  if (!apiKey || !locationId) {
    return NextResponse.json(
      { success: false, error: "apiKey and locationId are required" },
      { status: 400 },
    );
  }

  // Verify the (apiKey, locationId) pair by calling an endpoint that works for
  // both Agency and Sub-Account / Private Integration tokens. /contacts/ with
  // limit=1 is the cheapest verification call that requires the locationId
  // and the contacts.readonly scope (which every useful integration has).
  let locationName = `GHL Location ${locationId}`;
  try {
    const params = new URLSearchParams({ locationId, limit: "1" });
    await ghlFetch<unknown>({
      endpoint: `/contacts/?${params.toString()}`,
      method: "GET",
      apiKey,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Verification request failed";
    return NextResponse.json(
      {
        success: false,
        error:
          "Could not verify the GHL credentials. Double-check the API key and Location ID, and make sure the integration has the contacts.readonly scope.",
        details: message,
      },
      { status: 400 },
    );
  }

  // Best-effort: try to fetch the friendly location name. This may 403 for
  // sub-account scoped tokens, in which case we keep the placeholder name.
  try {
    const result = await ghlFetch<LocationResponse>({
      endpoint: `/locations/${locationId}`,
      method: "GET",
      apiKey,
    });
    locationName = result.location?.name ?? result.name ?? locationName;
  } catch {
    // ignore — name is non-essential for the connection itself
  }

  try {
    try {
      await convex.mutation("ghl:saveGHLConnection" as never, {
        clerkUserId: userId,
        locationId,
        locationName,
        apiKey,
        signupSource: body.signupSource ?? "existing",
        isActive: true,
      } as never);
    } catch (error) {
      if (!isLegacySaveConnectionValidatorError(error)) {
        throw error;
      }

      // Backward-compatible fallback for environments still running the older
      // mutation validator that doesn't accept apiKey/signupSource yet.
      await convex.mutation("ghl:saveGHLConnection" as never, {
        clerkUserId: userId,
        locationId,
        locationName,
        isActive: true,
      } as never);
    }
  } catch (error) {
    console.error("GHL connect mutation failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to save GHL connection" },
      { status: 500 },
    );
  }

  // Bust the per-user GHL auth cache so the next /conversations request
  // picks up the new key immediately instead of waiting for the 5-min TTL.
  invalidateGHLAuthCache(userId);

  return NextResponse.json({
    success: true,
    data: { locationId, locationName },
  });
}
