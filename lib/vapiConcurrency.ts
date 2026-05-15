import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Org-wide Vapi concurrent-call accounting. Vapi caps concurrent calls per
 * org (10 by default — see Org Settings → Call Concurrency Limit). Without
 * a precheck, the 11th launch fails on Vapi's side AFTER we've already
 * created the campaign + seeded a log row, leaving stale state.
 *
 * Strategy: counter in Redis at `gwusaas:vapi:active`. Incremented when we
 * call Vapi /call, decremented when end-of-call-report fires. The
 * end-of-call decrement also runs on a TTL-based safety net so a missed
 * webhook can't permanently leak the counter — every increment carries a
 * 30-minute expiry (longest realistic call), and we re-up that expiry on
 * reads so an active long call doesn't time out.
 *
 * Fails OPEN: if Redis isn't configured we let launches through. The
 * downside is we then rely on Vapi's own 429.
 */

const COUNTER_KEY = "gwusaas:vapi:active";
const MAX_CALL_TTL_SECONDS = 30 * 60;

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function getCap(): number {
  const raw = process.env.VAPI_CONCURRENT_CALL_LIMIT;
  const parsed = raw ? Number(raw) : 10;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export type ConcurrencyCheck = {
  allowed: boolean;
  active: number;
  limit: number;
  bypassed: boolean;
};

/**
 * Check the current active count without modifying it. Use this before
 * launching to surface a clear "queue full" error rather than letting Vapi
 * 429 us mid-loop.
 */
export async function checkVapiConcurrency(): Promise<ConcurrencyCheck> {
  const r = getRedis();
  const limit = getCap();
  if (!r) return { allowed: true, active: 0, limit, bypassed: true };
  try {
    const raw = (await r.get<string | number>(COUNTER_KEY)) ?? 0;
    const active = typeof raw === "number" ? raw : Number(raw) || 0;
    return { allowed: active < limit, active, limit, bypassed: false };
  } catch (e) {
    console.error("[vapiConcurrency] read failed, failing open", e);
    return { allowed: true, active: 0, limit, bypassed: true };
  }
}

/**
 * Atomically reserve a slot. Returns true if reservation succeeded; false
 * means we hit the cap and the caller should reject the launch.
 */
export async function reserveVapiSlot(): Promise<ConcurrencyCheck> {
  const r = getRedis();
  const limit = getCap();
  if (!r) return { allowed: true, active: 0, limit, bypassed: true };
  try {
    const next = await r.incr(COUNTER_KEY);
    // Refresh expiry — keeps the counter from drifting if a webhook misses.
    await r.expire(COUNTER_KEY, MAX_CALL_TTL_SECONDS);
    if (next > limit) {
      // Roll back our increment.
      await r.decr(COUNTER_KEY);
      return { allowed: false, active: limit, limit, bypassed: false };
    }
    return { allowed: true, active: next, limit, bypassed: false };
  } catch (e) {
    console.error("[vapiConcurrency] reserve failed, failing open", e);
    return { allowed: true, active: 0, limit, bypassed: true };
  }
}

/**
 * Release a slot when a call ends. Call this from the end-of-call webhook.
 * Floors at zero so a stray webhook doesn't drive the counter negative.
 */
export async function releaseVapiSlot(): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    const value = await r.decr(COUNTER_KEY);
    if (typeof value === "number" && value < 0) {
      await r.set(COUNTER_KEY, 0);
    }
  } catch (e) {
    console.error("[vapiConcurrency] release failed", e);
  }
}
