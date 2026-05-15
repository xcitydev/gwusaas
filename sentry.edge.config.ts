/**
 * Sentry edge-runtime config (middleware.ts, edge route handlers).
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    tracesSampleRate: process.env.VERCEL_ENV === "production" ? 0.05 : 0.5,
  });
}
