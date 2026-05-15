import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Idempotent webhook processing. Each provider (GHL, Vapi, Apify) retries
 * webhook deliveries on timeout. Without dedupe we get double-billed
 * actions, duplicate call logs, and inflated metrics.
 *
 * Usage:
 *   const fresh = await isFreshWebhookEvent("vapi", call.id);
 *   if (!fresh) return NextResponse.json({ ok: true, deduped: true });
 *   // ...do the work...
 *
 * Backed by Upstash Redis with `SET NX EX` for atomic test-and-set.
 * Fails OPEN: if Redis isn't configured we let the event through. That
 * matches our rate-limit behavior — better to over-deliver than to drop
 * webhook events on Redis hiccups, since most providers retry anyway.
 */

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 3; // 3 days — covers Vapi/GHL retry windows

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export type WebhookSource =
  | "vapi"
  | "ghl"
  | "apify"
  | "twilio"
  | string;

/**
 * Atomically claim an event ID. Returns true if this is the first time
 * we've seen it (callers should process), false if it's a retry.
 *
 * eventId should be a stable provider-supplied ID (Vapi callId+messageType,
 * GHL message-id, Apify run-id, etc.) so retries collapse on the same key.
 */
export async function isFreshWebhookEvent(
  source: WebhookSource,
  eventId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<boolean> {
  if (!eventId) return true;
  const r = getRedis();
  if (!r) return true; // fail open
  try {
    const key = `gwusaas:webhook:${source}:${eventId}`;
    // SET key value NX EX ttl — returns "OK" only if the key didn't exist.
    const result = await r.set(key, "1", { nx: true, ex: ttlSeconds });
    return result === "OK";
  } catch (e) {
    console.error("[webhookIdempotency] redis failure, failing open", e);
    return true;
  }
}
