import "server-only";

/**
 * Per-route rate limiting using Upstash Redis. Fail-open: if Redis env vars
 * aren't set or the request fails, we allow the request through so dev
 * environments without Upstash configured don't break.
 *
 * Required env (production):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Buckets are per (userId, bucketKey). The bucketKey lets us run multiple
 * limits in parallel against the same user — e.g. a strict per-minute cap
 * on AI calls AND a looser per-day cap.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export type RateLimitBucket = "ai" | "voice" | "ghl" | "scrape" | "media";

type LimitConfig = {
  /** Tokens (requests) allowed in the window. */
  tokens: number;
  /** Window length, e.g. "1 m", "1 h", "1 d". */
  window: `${number} ${"s" | "m" | "h" | "d"}`;
};

/**
 * Default buckets — can be overridden per route. Tuned to match the daily
 * limits in lib/plans.ts roughly (Growth tier × 2 burst headroom).
 */
const DEFAULTS: Record<RateLimitBucket, LimitConfig> = {
  // AI text generation: cheap-ish but spammable. 30/min is plenty for a UI.
  ai: { tokens: 30, window: "1 m" },
  // Voice caller actions: each call costs real money, hold the line tighter.
  voice: { tokens: 10, window: "1 m" },
  // GHL CRM reads/writes: high ceiling because UIs poll.
  ghl: { tokens: 120, window: "1 m" },
  // Scraping: expensive per-call, low frequency expected.
  scrape: { tokens: 5, window: "1 m" },
  // Media generation (image/video): expensive, slow, low frequency.
  media: { tokens: 10, window: "1 m" },
};

const limiterCache = new Map<string, Ratelimit>();

function getLimiter(bucket: RateLimitBucket, override?: LimitConfig): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const cfg = override ?? DEFAULTS[bucket];
  const key = `${bucket}:${cfg.tokens}:${cfg.window}`;
  let limiter = limiterCache.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.fixedWindow(cfg.tokens, cfg.window),
      analytics: true,
      prefix: `gwusaas:rl:${bucket}`,
    });
    limiterCache.set(key, limiter);
  }
  return limiter;
}

export type RateLimitResult = {
  success: boolean;
  /** Tokens remaining in the current window. */
  remaining: number;
  /** Epoch ms when the window resets. */
  reset: number;
  /** Total tokens for the bucket. */
  limit: number;
  /** True when Redis isn't configured — request was allowed without checking. */
  bypassed: boolean;
};

/**
 * Run a rate-limit check for a user against a named bucket.
 * Returns success=true when the request is allowed, success=false when denied.
 */
export async function checkRateLimit(
  userId: string,
  bucket: RateLimitBucket,
  override?: LimitConfig,
): Promise<RateLimitResult> {
  const limiter = getLimiter(bucket, override);
  if (!limiter) {
    return {
      success: true,
      remaining: Number.POSITIVE_INFINITY,
      reset: 0,
      limit: 0,
      bypassed: true,
    };
  }
  try {
    const res = await limiter.limit(userId);
    return {
      success: res.success,
      remaining: res.remaining,
      reset: res.reset,
      limit: res.limit,
      bypassed: false,
    };
  } catch (e) {
    // Fail-open on Redis hiccups — better to drop a check than to wedge the app.
    console.error("[rateLimit] redis failure, failing open", e);
    return {
      success: true,
      remaining: Number.POSITIVE_INFINITY,
      reset: 0,
      limit: 0,
      bypassed: true,
    };
  }
}

/**
 * Convenience: returns a Response with 429 + standard rate-limit headers when
 * the limit is exceeded, or null when the request should proceed.
 */
export function rateLimitResponse(result: RateLimitResult): Response | null {
  if (result.success) return null;
  const retryAfter = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000),
  );
  return new Response(
    JSON.stringify({
      success: false,
      error: `Rate limit exceeded. Try again in ${retryAfter}s.`,
      remaining: result.remaining,
      reset: result.reset,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    },
  );
}
