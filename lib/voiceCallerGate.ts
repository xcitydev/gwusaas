import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { normalizePlan, type Plan } from "@/lib/plans";
import { getUserPlan } from "@/lib/plans.server";
import {
  checkRateLimit,
  rateLimitResponse,
  type RateLimitBucket,
} from "@/lib/rateLimit";

export const VOICE_CALLER_ALLOWED_PLANS: Plan[] = ["growth", "elite", "white_label"];

type SessionClaims = { metadata?: { plan?: unknown } } | null | undefined;

/**
 * Pure predicate used server-side (and in unit tests) to decide whether
 * a Clerk session is allowed into the Voice Caller module.
 */
export function checkVoiceCallerAccess(sessionClaims: SessionClaims): boolean {
  const plan = normalizePlan(sessionClaims?.metadata?.plan);
  return VOICE_CALLER_ALLOWED_PLANS.includes(plan);
}

export type VoiceCallerGuard =
  | { ok: true; userId: string; userPlan: Plan }
  | { ok: false; response: NextResponse };

export type VoiceCallerGuardOptions = {
  /** When set, also runs a per-user rate limit against this bucket. */
  rateLimit?: RateLimitBucket;
};

/**
 * Drop-in guard for every voice-caller API route.
 * Verifies Clerk session + that the user is on growth / elite / white_label.
 * Optionally applies a per-user rate limit on a named bucket.
 */
export async function requireVoiceCallerAccess(
  options: VoiceCallerGuardOptions = {},
): Promise<VoiceCallerGuard> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userPlan = await getUserPlan(userId);
  if (!VOICE_CALLER_ALLOWED_PLANS.includes(userPlan)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Voice Caller requires the Growth plan or higher. Upgrade to unlock AI cold calling.",
        },
        { status: 403 },
      ),
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

  return { ok: true, userId, userPlan };
}
