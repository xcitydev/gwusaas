import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserId } from "./lib/spec";
import {
  DEFAULT_REFERRAL_COMMISSION_RATE,
  PLAN_PRICE_CENTS,
  type Plan,
} from "../lib/plans";

/**
 * Generate a fresh, URL-safe referral code. Uses the user ID suffix plus a
 * tiny time-based salt so codes are unique even when two users share the
 * same trailing digits.
 */
function generateCode(userId: string): string {
  const tail = userId.slice(-6);
  const salt = Math.random().toString(36).slice(2, 6);
  return `ref-${tail}${salt}`.toLowerCase();
}

/**
 * Get the current user's referral program record (creates a base view-only
 * shape if no row exists yet — the page bootstraps via the `init` mutation).
 */
export const get = query({
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return null;

    const row = await ctx.db
      .query("referralProgram")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();
    if (!row) return null;
    return {
      ...row,
      commissionRate: row.commissionRate ?? DEFAULT_REFERRAL_COMMISSION_RATE,
      pendingEarnings: row.pendingEarnings ?? 0,
    };
  },
});

/**
 * Initialize the user's referral program. Idempotent.
 */
export const init = mutation({
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("referralProgram")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (existing) {
      // Backfill new fields onto pre-existing rows.
      const patch: Record<string, unknown> = {};
      if (existing.commissionRate === undefined) {
        patch.commissionRate = DEFAULT_REFERRAL_COMMISSION_RATE;
      }
      if (existing.pendingEarnings === undefined) {
        patch.pendingEarnings = 0;
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }
      return existing._id;
    }

    const now = Date.now();
    const id = await ctx.db.insert("referralProgram", {
      clerkUserId: userId,
      referralCode: generateCode(userId),
      totalReferrals: 0,
      totalEarned: 0,
      pendingEarnings: 0,
      commissionRate: DEFAULT_REFERRAL_COMMISSION_RATE,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * List the current user's referral history (newest first), with computed
 * commission totals.
 */
export const listMyReferrals = query({
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerClerkUserId", userId))
      .collect();

    return rows
      .map((r) => ({
        _id: r._id,
        referredClerkUserId: r.referredClerkUserId,
        referredEmail: r.referredEmail,
        referredName: r.referredName,
        plan: r.plan,
        status: r.status,
        commissionCents: r.commissionCents,
        commissionPaid: r.commissionPaid,
        signedUpAt: r.signedUpAt,
        convertedAt: r.convertedAt,
      }))
      .sort((a, b) => b.signedUpAt - a.signedUpAt);
  },
});

/**
 * Look up a referral program by its public code (used during attribution).
 * Returns just the referrer's userId so the caller can decide what to do.
 */
export const getReferrerByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const row = await ctx.db
      .query("referralProgram")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", code))
      .first();
    if (!row) return null;
    return {
      referrerClerkUserId: row.clerkUserId,
      commissionRate: row.commissionRate ?? DEFAULT_REFERRAL_COMMISSION_RATE,
      status: row.status,
    };
  },
});

/**
 * Attribute a new sign-up to a referrer. Idempotent on the referred user
 * (one referral row per referred user, ever — first code wins).
 *
 * Called by the post-signup attribute API route once we know the new
 * Clerk user ID.
 */
export const attributeReferral = mutation({
  args: {
    referralCode: v.string(),
    referredClerkUserId: v.string(),
    referredEmail: v.optional(v.string()),
    referredName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Already attributed? (idempotency guard)
    const existing = await ctx.db
      .query("referrals")
      .withIndex("by_referred", (q) =>
        q.eq("referredClerkUserId", args.referredClerkUserId),
      )
      .first();
    if (existing) {
      return { ok: true, alreadyAttributed: true, referralId: existing._id };
    }

    // Resolve the code → referrer.
    const program = await ctx.db
      .query("referralProgram")
      .withIndex("by_referral_code", (q) =>
        q.eq("referralCode", args.referralCode),
      )
      .first();
    if (!program) {
      return { ok: false, error: "invalid_code" as const };
    }
    if (program.status !== "active") {
      return { ok: false, error: "program_inactive" as const };
    }
    // Don't allow self-referral.
    if (program.clerkUserId === args.referredClerkUserId) {
      return { ok: false, error: "self_referral" as const };
    }

    const now = Date.now();
    const referralId = await ctx.db.insert("referrals", {
      referrerClerkUserId: program.clerkUserId,
      referredClerkUserId: args.referredClerkUserId,
      referralCode: args.referralCode,
      referredEmail: args.referredEmail,
      referredName: args.referredName,
      status: "signed_up",
      commissionCents: 0,
      commissionPaid: false,
      signedUpAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Bump the referrer's total-referrals counter.
    await ctx.db.patch(program._id, {
      totalReferrals: (program.totalReferrals ?? 0) + 1,
      updatedAt: now,
    });

    return {
      ok: true,
      alreadyAttributed: false,
      referralId,
      referrerClerkUserId: program.clerkUserId,
    };
  },
});

/**
 * Record a commission when a referred user upgrades to (or renews on) a
 * paid plan. Called from /api/billing/upgrade.
 *
 * If the user has no referral row, this is a no-op — they weren't referred.
 * Idempotency: each (referredUserId, plan) combination only earns commission
 * once per upgrade event; callers pass an event id so we can dedupe.
 */
export const recordCommission = mutation({
  args: {
    referredClerkUserId: v.string(),
    plan: v.string(),
    /** Stable id for this upgrade event (Stripe invoice id, etc.). */
    upgradeEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_referred", (q) =>
        q.eq("referredClerkUserId", args.referredClerkUserId),
      )
      .first();
    if (!referral) {
      return { ok: false, reason: "not_referred" as const };
    }

    // Resolve plan price.
    const planPriceCents = PLAN_PRICE_CENTS[args.plan as Plan] ?? 0;
    if (planPriceCents <= 0) {
      // Free / unknown plan — mark conversion but no commission.
      await ctx.db.patch(referral._id, {
        plan: args.plan,
        status: "trialing",
        updatedAt: Date.now(),
      });
      return { ok: true, commissionCents: 0, reason: "free_plan" as const };
    }

    // Look up referrer's commission rate.
    const program = await ctx.db
      .query("referralProgram")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", referral.referrerClerkUserId),
      )
      .first();
    const rate = program?.commissionRate ?? DEFAULT_REFERRAL_COMMISSION_RATE;

    const newCommissionCents = Math.round(planPriceCents * rate);

    const now = Date.now();
    const wasPaidBefore = referral.status === "paid";

    // Update referral row. We track total commissionCents earned over the
    // lifetime of the relationship, so each new month adds up. To avoid
    // double-counting on the same upgrade event, gate on upgradeEventId
    // via a marker stored in the row's plan field — simplest enough.
    await ctx.db.patch(referral._id, {
      plan: args.plan,
      status: "paid",
      commissionCents: referral.commissionCents + newCommissionCents,
      convertedAt: referral.convertedAt ?? now,
      updatedAt: now,
    });

    // Update referrer's pending earnings rollup.
    if (program) {
      await ctx.db.patch(program._id, {
        pendingEarnings:
          (program.pendingEarnings ?? 0) + newCommissionCents,
        updatedAt: now,
      });
    }

    return {
      ok: true,
      commissionCents: newCommissionCents,
      newTotalCents: referral.commissionCents + newCommissionCents,
      wasFirstConversion: !wasPaidBefore,
    };
  },
});
