import "server-only";
import { Redis } from "@upstash/redis";
import { PLAN_LIMITS, type Plan, type PlanLimits } from "@/lib/plans";

/**
 * Daily usage enforcement (per user, per metric). Sits next to the
 * existing Convex `userUsage` table — Convex remains the source of truth
 * for the UI display, but THIS helper guarantees server-side enforcement
 * so a malicious user calling the API directly can't bypass plan caps.
 *
 * Backed by Upstash Redis. Fail-open if Redis isn't configured.
 *
 * Keys: gwusaas:usage:<userId>:<metric>:<YYYY-MM-DD>
 * TTL : 36 hours (covers timezone edge cases + late-night requests).
 */

const KEY_TTL_SECONDS = 36 * 60 * 60;

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export type UsageMetric = keyof PlanLimits;

export type UsageResult = {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  bypassed: boolean;
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Atomically check and consume one unit of quota. Returns allowed=false
 * if the user is over the daily limit for their plan.
 *
 * Increments first, checks against the limit, decrements if over (so the
 * counter doesn't drift). This is racy in theory under heavy concurrency
 * but the worst case is a 1-2 request overshoot — acceptable for usage
 * caps where the UI also enforces.
 */
export async function enforceUsage(
  userId: string,
  metric: UsageMetric,
  plan: Plan,
  increment = 1,
): Promise<UsageResult> {
  const limit = PLAN_LIMITS[plan][metric];
  const r = getRedis();
  if (!r) {
    return {
      allowed: true,
      limit,
      used: 0,
      remaining: limit,
      bypassed: true,
    };
  }
  const key = `gwusaas:usage:${userId}:${metric}:${todayUtc()}`;
  try {
    const after = await r.incrby(key, increment);
    await r.expire(key, KEY_TTL_SECONDS);
    if (after > limit) {
      // Roll back so the recorded number reflects what was actually allowed.
      await r.decrby(key, increment);
      return {
        allowed: false,
        limit,
        used: limit,
        remaining: 0,
        bypassed: false,
      };
    }
    return {
      allowed: true,
      limit,
      used: after,
      remaining: Math.max(0, limit - after),
      bypassed: false,
    };
  } catch (e) {
    console.error("[usageEnforce] redis error, failing open", e);
    return {
      allowed: true,
      limit,
      used: 0,
      remaining: limit,
      bypassed: true,
    };
  }
}

/** Read-only — useful for showing remaining quota without consuming. */
export async function readUsage(
  userId: string,
  metric: UsageMetric,
  plan: Plan,
): Promise<UsageResult> {
  const limit = PLAN_LIMITS[plan][metric];
  const r = getRedis();
  if (!r) {
    return {
      allowed: true,
      limit,
      used: 0,
      remaining: limit,
      bypassed: true,
    };
  }
  const key = `gwusaas:usage:${userId}:${metric}:${todayUtc()}`;
  try {
    const raw = await r.get<string | number>(key);
    const used = typeof raw === "number" ? raw : Number(raw) || 0;
    return {
      allowed: used < limit,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      bypassed: false,
    };
  } catch (e) {
    console.error("[usageEnforce] redis error, failing open", e);
    return {
      allowed: true,
      limit,
      used: 0,
      remaining: limit,
      bypassed: true,
    };
  }
}
