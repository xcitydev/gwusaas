/**
 * Sentry Node-runtime config (route handlers, server actions, server
 * components, Node middleware). Loaded by Next.js via instrumentation.ts.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    sampleRate: process.env.VERCEL_ENV === "production" ? 1.0 : 1.0,
    tracesSampleRate: process.env.VERCEL_ENV === "production" ? 0.05 : 0.5,
    // Don't capture noisy expected errors that we already handle.
    ignoreErrors: [
      "Rate limit exceeded",
      "Plan upgrade required",
      "Unauthorized",
    ],
  });
}
