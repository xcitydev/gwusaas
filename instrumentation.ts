/**
 * Next.js instrumentation hook — loaded once per process at startup.
 * We use it to register the right Sentry config for the current runtime
 * (node / edge). Required by Next.js since Sentry SDK v8.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  // Forward route-handler errors to Sentry with route context.
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request, context);
}
