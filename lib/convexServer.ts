import "server-only";
import { ConvexHttpClient } from "convex/browser";

/**
 * Singleton Convex HTTP client for server-side use (route handlers, server
 * components, server actions). Avoids creating a new client per request,
 * which matters at scale: each `new ConvexHttpClient()` allocates a fresh
 * HTTP agent and re-runs URL parsing.
 *
 * NEXT_PUBLIC_CONVEX_URL is intentionally read at import time — if it's
 * missing in production we want the process to fail fast on first import,
 * not silently degrade on the first request.
 */

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url) {
  // Don't throw at import-time — that would break `next build` on machines
  // without env vars. Throw lazily instead, only when something tries to use
  // the client.
  console.warn(
    "[convexServer] NEXT_PUBLIC_CONVEX_URL is not set. Convex calls will fail until it's configured.",
  );
}

let cached: ConvexHttpClient | null = null;

export function getConvexServerClient(): ConvexHttpClient {
  if (cached) return cached;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not configured. Set it in your environment to use the Convex server client.",
    );
  }
  cached = new ConvexHttpClient(url);
  return cached;
}
