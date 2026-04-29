#!/usr/bin/env node
/**
 * Standalone WebSocket bridge between Twilio Media Streams and the voice-caller
 * engine (lib/voiceCallerStreamEngine.ts). Run alongside `next dev` or in its
 * own Node service in production:
 *
 *   node --experimental-vm-modules scripts/voice-caller-ws-server.mjs
 *
 * It listens on VOICE_CALLER_WS_PORT (default 3001) at the path
 * /api/voice-caller/live-call/stream. Expose it publicly (ngrok, Fly, Render,
 * etc.) and set NEXT_PUBLIC_BASE_URL to the https host so the TwiML route
 * rewrites it to wss://.
 *
 * NOTE: The engine itself is TypeScript. This script assumes you've either:
 *   1. Built the project (next build), producing a compiled version, OR
 *   2. Run it via `tsx` / `ts-node` in development.
 *
 *   With tsx:  npx tsx scripts/voice-caller-ws-server.mjs
 */

import http from "node:http";
import { WebSocketServer } from "ws";

const port = Number(process.env.VOICE_CALLER_WS_PORT || 3001);

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("voice-caller ws server running");
});

const wss = new WebSocketServer({ server, path: "/api/voice-caller/live-call/stream" });

wss.on("connection", async (ws, req) => {
  const url = new URL(req.url || "/", "http://localhost");
  const campaignId = url.searchParams.get("campaignId") || "";
  const voiceId = url.searchParams.get("voiceId") || "";
  const leadName = url.searchParams.get("leadName") || "";

  try {
    const { handleTwilioSocket } = await import("../lib/voiceCallerStreamEngine.ts");
    await handleTwilioSocket(ws, { campaignId, voiceId, leadName });
  } catch (error) {
    console.error("Failed to load voiceCallerStreamEngine", error);
    ws.close();
  }
});

server.listen(port, () => {
  console.log(`[voice-caller] ws server listening on :${port}`);
});
