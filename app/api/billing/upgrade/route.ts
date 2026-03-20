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

    const body = (await req.json()) as UpgradeBody;
    const requestedPlan = body.plan;
    if (
      typeof requestedPlan !== "string" ||
      !PLAN_ORDER.includes(requestedPlan as Plan)
    ) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    const plan = requestedPlan as Plan;

    const client = await clerkClient();
    const currentUser = await client.users.getUser(userId);

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...currentUser.publicMetadata,
        plan,
      },
    });

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Failed to update billing plan", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 },
    );
  }
}
