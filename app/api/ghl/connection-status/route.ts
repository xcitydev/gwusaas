import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type PublicConnection = {
  locationId: string;
  locationName: string;
  isActive: boolean;
  signupSource?: string;
  hasApiKey: boolean;
  createdAt: number;
} | null;

type LegacyConnection = {
  locationId: string;
  locationName: string;
  isActive: boolean;
  createdAt: number;
  encryptedApiKey?: string;
  signupSource?: string;
} | null;

const isMissingPublicFunctionError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("Could not find public function") &&
    error.message.includes("ghl:getMyGHLConnectionPublic")
  );
};

/**
 * Returns the current user's GHL connection status (no secrets).
 */
export async function GET(): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    let connection: PublicConnection;
    try {
      connection = await convex.query("ghl:getMyGHLConnectionPublic" as never, {
        clerkUserId: userId,
      } as never) as PublicConnection;
    } catch (error) {
      if (!isMissingPublicFunctionError(error)) {
        throw error;
      }

      const legacy = await convex.query("ghl:getGHLConnection" as never, {
        clerkUserId: userId,
      } as never) as LegacyConnection;

      connection = legacy
        ? {
            locationId: legacy.locationId,
            locationName: legacy.locationName,
            isActive: legacy.isActive,
            signupSource: legacy.signupSource,
            createdAt: legacy.createdAt,
            hasApiKey: Boolean(legacy.encryptedApiKey),
          }
        : null;
    }

    return NextResponse.json({ success: true, data: connection });
  } catch (error) {
    console.error("GHL connection-status query failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to load connection status" },
      { status: 500 },
    );
  }
}
