import { getUserPlan } from "@/lib/plans.server";
import { hasAccess, hasAiAccess, type Plan } from "@/lib/plans";
import { requirePlan, type RouteGuard } from "@/lib/route-auth";
import { NextResponse } from "next/server";

function expectedInternalPipelineToken() {
  const secret = process.env.CLERK_SECRET_KEY || "";
  if (!secret) return null;
  return `pipeline-${secret.slice(0, 24)}`;
}

export function getInternalPipelineHeaderValue() {
  return expectedInternalPipelineToken();
}

async function guardFromInternalHeaders(
  req: Request,
  requiredPlan: Plan,
): Promise<RouteGuard | null> {
  const token = req.headers.get("x-internal-pipeline-token");
  const userId = req.headers.get("x-pipeline-user-id");
  const expectedToken = expectedInternalPipelineToken();

  if (!token || !userId || !expectedToken || token !== expectedToken) {
    return null;
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
      response: NextResponse.json(
        { error: "AI access is not available on this plan" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId, userPlan };
}

export async function requirePipelinePlan(
  req: Request,
  requiredPlan: Plan,
): Promise<RouteGuard> {
  const internal = await guardFromInternalHeaders(req, requiredPlan);
  if (internal) return internal;
  return requirePlan(requiredPlan);
}
