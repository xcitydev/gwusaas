import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { hasAccess, hasAiAccess, type Plan } from "@/lib/plans";
import { getUserPlan } from "@/lib/plans.server";
import {
  checkRateLimit,
  rateLimitResponse,
  type RateLimitBucket,
} from "@/lib/rateLimit";
import { enforceUsage, type UsageMetric } from "@/lib/usageEnforce";

export type RouteGuard =
  | { ok: true; userId: string; userPlan: Plan }
  | { ok: false; response: NextResponse };

export type RequirePlanOptions = {
  /** When set, also runs a per-user rate limit against this bucket. */
  rateLimit?: RateLimitBucket;
  /** When false, skips the AI-access check (use for non-AI routes that still want plan + rate limit). */
  requireAi?: boolean;
  /**
   * When set, enforces (and consumes) one unit of the user's daily quota
   * for the metric. Returns 429 when the daily cap is hit. Convex
   * userUsage table is the UI source of truth; this Redis-backed check
   * gives us guaranteed server-side enforcement.
   */
  consumeUsage?: UsageMetric;
};

export async function requirePlan(
  requiredPlan: Plan,
  options: RequirePlanOptions = {},
): Promise<RouteGuard> {
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

  // Default behavior preserved: AI check runs unless explicitly disabled.
  if (options.requireAi !== false && !hasAiAccess(userPlan)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "AI access is not available on this plan" }, { status: 403 }),
    };
  }

  if (options.rateLimit) {
    const rl = await checkRateLimit(userId, options.rateLimit);
    const denied = rateLimitResponse(rl);
    if (denied) {
      return {
        ok: false,
        response: NextResponse.json(
          await denied.json(),
          { status: 429, headers: denied.headers },
        ),
      };
    }
  }

  if (options.consumeUsage) {
    const usage = await enforceUsage(userId, options.consumeUsage, userPlan);
    if (!usage.allowed) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: `Daily limit reached for ${options.consumeUsage} (${usage.used}/${usage.limit}). Upgrade your plan or come back tomorrow.`,
            metric: options.consumeUsage,
            limit: usage.limit,
            used: usage.used,
          },
          { status: 429 },
        ),
      };
    }
  }

  return { ok: true, userId, userPlan };
}
