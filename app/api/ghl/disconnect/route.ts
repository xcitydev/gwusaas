import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { invalidateGHLAuthCache } from "@/lib/ghl/serverAuth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Disconnects the active GHL sub-account for the current user.
 */
export async function POST(): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const result = await convex.mutation("ghl:disconnectGHL" as never, {
      clerkUserId: userId,
    } as never);
    invalidateGHLAuthCache(userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("GHL disconnect mutation failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to disconnect GHL" },
      { status: 500 },
    );
  }
}
