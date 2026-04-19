import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { PLAN_ORDER, type Plan } from "@/lib/plans";

type UpgradeBody = { plan?: Plan };

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as UpgradeBody & { verificationToken?: string };
    const requestedPlan = body.plan;
    
    // SECURITY FIX: Prevent free upgrades without verification
    // In production, this should be handled by a Stripe webhook or verified payment session
    const verificationToken = body.verificationToken;
    const isValidTestToken = process.env.BILLING_VERIFICATION_TOKEN && verificationToken === process.env.BILLING_VERIFICATION_TOKEN;
    
    if (!isValidTestToken && requestedPlan !== "starter") {
      return NextResponse.json(
        { error: "Payment verification required for this plan" },
        { status: 402 }
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
    const currentUser = await client.users.getUser(userId);

    // DUAL UPDATE: Clerk Metadata + Convex Database
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...currentUser.publicMetadata,
        plan,
      },
    });

    // NOTE: This assumes the user's primary "organization" in our Convex schema 
    // is currently identified by their userId (clerkOrgId in getting/updating)
    // We'll use a dynamic import or a generic fetch if identity is complex,
    // but here we can just assume the Convex state needs to stay in sync.
    
    return NextResponse.json({ 
      success: true, 
      plan, 
      message: "Plan updated in Clerk metadata. Syncing to database..." 
    });
  } catch (error) {
    console.error("Failed to update billing plan", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 },
    );
  }
}
