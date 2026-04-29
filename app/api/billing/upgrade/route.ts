import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { PLAN_ORDER, type Plan } from "@/lib/plans";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type UpgradeBody = { plan?: Plan };

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as UpgradeBody & { verificationToken?: string };
    const requestedPlan = body.plan;

    // PRODUCTION GATE: Stripe integration needed here
    // In production, real billing MUST use Stripe Checkout/Subscription webhooks.
    if (process.env.NODE_ENV === "production" && !process.env.SKIP_BILLING_VERIFICATION) {
      // This is a placeholder for real Stripe session verification
      // return NextResponse.json({ error: "Payment integration incomplete" }, { status: 501 });
    }

    const verificationToken = body.verificationToken;
    const isValidTestToken =
      process.env.BILLING_VERIFICATION_TOKEN &&
      verificationToken === process.env.BILLING_VERIFICATION_TOKEN;

    // Starter plan is free for trial, elite/growth/white_label require verification
    const requiresVerification = ["growth", "elite", "white_label"].includes(
      requestedPlan as string,
    );

    // Bypass verification in non-production OR if specific flag is set
    const shouldBypassVerification = 
      process.env.NODE_ENV === "development" || 
      process.env.SKIP_BILLING_VERIFICATION === "true";

    if (requiresVerification && !isValidTestToken && !shouldBypassVerification) {
      return NextResponse.json(
        { error: "Payment verification required for this plan" },
        { status: 402 },
      );
    }

    if (
      typeof requestedPlan !== "string" ||
      !PLAN_ORDER.includes(requestedPlan as Plan)
    ) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    const plan = requestedPlan as Plan;

    const client = await clerkClient();

    // 1. Update Clerk public metadata
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { plan },
    });

    // 2. Sync plan to Convex so usage enforcement and UI are in sync
    try {
      await convex.mutation(api.organization.updatePlan, {
        clerkOrgId: userId,
        plan,
      });
    } catch (convexErr) {
      // Non-fatal: Clerk is the primary source. Log and continue.
      console.error("Convex plan sync failed (non-fatal):", convexErr);
    }

    return NextResponse.json({
      success: true,
      plan,
      message: `Plan updated to ${plan}. Changes take effect immediately.`,
    });
  } catch (error: any) {
    console.error("Failed to update billing plan", error);
    if (error.clerkError) {
      console.error("Clerk Error Details:", JSON.stringify(error.errors, null, 2));
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
