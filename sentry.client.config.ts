/**
 * Sentry browser-side config. Loaded by Next.js automatically via the
 * `instrumentation-client.ts` import. No-ops if SENTRY_DSN is unset so
 * dev keeps working without an account.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    // Error sampling: send everything in dev/staging, 50% in prod to keep
    // quotas sane until we know the actual error volume at 30K+ MAU.
    sampleRate:
      process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? 0.5 : 1.0,
    // Trace sampling (perf): much lower; perf data piles up fast.
    tracesSampleRate:
      process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? 0.05 : 0.5,
    // Don't ship session replays unless we explicitly want to — they're
    // pricey and bandwidth-heavy.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Filter out noise that we don't control.
    ignoreErrors: [
      // Browser extensions / network blips
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
    ],
  });
}
