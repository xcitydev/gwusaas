import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (_auth, req) => {
  const requestHeaders = new Headers(req.headers);
  const host = req.headers.get("host")?.split(":")[0] || "";
  requestHeaders.set("x-wl-host", host);

  const isDefaultHost =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host === "app.boolspace.com";

  requestHeaders.set("x-wl-custom-domain", isDefaultHost ? "0" : "1");

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
