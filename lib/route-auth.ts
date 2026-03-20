import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { hasAccess, hasAiAccess, type Plan } from "@/lib/plans";
import { getUserPlan } from "@/lib/plans.server";

export type RouteGuard =
  | { ok: true; userId: string; userPlan: Plan }
  | { ok: false; response: NextResponse };

export async function requirePlan(requiredPlan: Plan): Promise<RouteGuard> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userPlan = await getUserPlan(userId);
  if (!hasAccess(userPlan, requiredPlan)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Plan upgrade required" }, { status: 403 }),
    };
  }

  if (!hasAiAccess(userPlan)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "AI access is not available on this plan" }, { status: 403 }),
    };
  }

  return { ok: true, userId, userPlan };
}
