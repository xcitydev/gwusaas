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

function twimlResponse(xml: string) {
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const audioUrl = url.searchParams.get("audioUrl");
  if (!audioUrl) {
    return twimlResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Sorry, no audio was provided.</Say><Hangup/></Response>`,
    );
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${escapeXml(audioUrl)}</Play>
</Response>`;
  return twimlResponse(xml);
}

// Twilio sometimes POSTs TwiML endpoints; support both verbs.
export const POST = GET;
