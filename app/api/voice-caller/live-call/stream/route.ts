/**
 * WebSocket endpoint expected by Twilio Media Streams. Next.js App Router route
 * handlers cannot terminate a WebSocket upgrade — so this route responds 501
 * with actionable guidance. The real stream handler lives at
 * `lib/voiceCallerStreamEngine.ts` and should be wired into a dedicated Node
 * WebSocket server (see `scripts/voice-caller-ws-server.mjs`) running on the
 * same host, ideally behind the same public URL path.
 *
 * Deployment note: point the `<Stream url>` in `live-call/twiml` at whichever
 * wss:// endpoint actually hosts the engine (e.g. a separate Fly.io / Render
 * service). Update NEXT_PUBLIC_BASE_URL accordingly.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "This endpoint must be served by a dedicated WebSocket process, not by Next.js App Router. Run `node scripts/voice-caller-ws-server.mjs` and point the TwiML <Stream url> at its public wss:// URL.",
    },
    { status: 501 },
  );
}

export const POST = GET;
