import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getConvexServerClient } from "@/lib/convexServer";

export const runtime = "nodejs";

/**
 * Attribute the current user as a referral of <code>referralCode</code>.
 *
 * Called by the client after sign-up completes. The flow is:
 *   1. User visits /sign-up?ref=ref-XYZ → ReferralCapture stores code in localStorage
 *   2. Clerk completes sign-up + redirects to /dashboard
 *   3. ReferralAttribute (mounted in dashboard layout) reads localStorage
 *      and POSTs the code here, then clears localStorage
 *
 * Idempotent: the Convex mutation guards on `by_referred` so a duplicate
 * call is a no-op.
 */

type Body = { referralCode?: string };

export async function POST(req: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = (body.referralCode ?? "").trim().toLowerCase();
  if (!code || !code.startsWith("ref-")) {
    return NextResponse.json(
      { error: "Missing or malformed referralCode" },
      { status: 400 },
    );
  }

  // Pull lightweight user details for the referral row so the referrer's
  // history table shows something meaningful.
  let email: string | undefined;
  let name: string | undefined;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    email = user.primaryEmailAddress?.emailAddress;
    name =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      undefined;
  } catch {
    // Non-fatal — attribution still works without these.
  }

  try {
    const convex = getConvexServerClient();
    const result = (await convex.mutation(
      "referrals:attributeReferral" as never,
      {
        referralCode: code,
        referredClerkUserId: userId,
        referredEmail: email,
        referredName: name,
      } as never,
    )) as
      | {
          ok: true;
          alreadyAttributed: boolean;
          referrerClerkUserId?: string;
          referralId?: string;
        }
      | { ok: false; error: string };

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    console.error("[referrals/attribute] convex mutation failed", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
