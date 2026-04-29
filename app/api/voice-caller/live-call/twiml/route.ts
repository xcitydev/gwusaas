import { NextResponse } from "next/server";

export const runtime = "nodejs";

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildTwiml(url: URL): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const wsBase = baseUrl.replace(/^http/, "ws");
  const streamUrl = new URL(`${wsBase}/api/voice-caller/live-call/stream`);
  const campaignId = url.searchParams.get("campaignId") || "";
  const voiceId = url.searchParams.get("voiceId") || "";
  const leadName = url.searchParams.get("leadName") || "";
  streamUrl.searchParams.set("campaignId", campaignId);
  streamUrl.searchParams.set("voiceId", voiceId);
  streamUrl.searchParams.set("leadName", leadName);

  const firstName = leadName.split(" ")[0] || "there";
  const opener = `Hi ${firstName}, this is Jordan — got 90 seconds?`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(opener)}</Say>
  <Connect>
    <Stream url="${escapeXml(streamUrl.toString())}" />
  </Connect>
</Response>`;
}

function twimlResponse(xml: string) {
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  return twimlResponse(buildTwiml(new URL(req.url)));
}

export async function GET(req: Request) {
  return twimlResponse(buildTwiml(new URL(req.url)));
}
