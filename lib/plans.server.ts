import "server-only";
import { auth } from "@clerk/nextjs/server";
import { normalizePlan, type Plan } from "@/lib/plans";

/**
 * Maps Clerk Billing plan keys (configured in the Clerk dashboard) to our
 * internal `Plan` enum used by gating logic. Keep this in sync with the
 * plans listed in Clerk → Configure → Billing → Subscription plans.
 *
 * Listed highest → lowest tier so the first match wins.
 */
const CLERK_PLAN_KEYS: Array<{ clerkKey: string; plan: Plan }> = [
  { clerkKey: "white_label", plan: "white_label" },
  { clerkKey: "director_elite", plan: "elite" },
  { clerkKey: "commander_growth", plan: "growth" },
  { clerkKey: "operative_starter", plan: "starter" },
  { clerkKey: "free_user", plan: "free" },
];

/**
 * Reads the current user's plan exclusively from Clerk session claims —
 * `auth().has({ plan: ... })` for Clerk Billing, with a legacy
 * `sessionClaims.metadata.plan` fallback. No backend API call is made,
 * which means this can never throw a network error.
 *
 * The `userId` arg is accepted for backwards compatibility but unused —
 * the plan always comes from the active request's session.
 */
export async function getUserPlan(_userId: string): Promise<Plan> {
  try {
    const { has, sessionClaims } = await auth();

    if (has) {
      for (const { clerkKey, plan } of CLERK_PLAN_KEYS) {
        if (has({ plan: clerkKey })) return plan;
      }
    }

    const claimsPlan =
      (sessionClaims as { metadata?: { plan?: unknown }; plan?: unknown } | null)
        ?.metadata?.plan ??
      (sessionClaims as { plan?: unknown } | null)?.plan;
    if (typeof claimsPlan === "string") return normalizePlan(claimsPlan);
  } catch (error) {
    console.warn("[getUserPlan] session lookup failed, defaulting to free", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return "free";
}
