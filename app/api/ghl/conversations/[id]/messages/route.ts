import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getConversationMessages,
  sendMessage,
  type GHLMessageType,
} from "@/lib/ghl";
import { getActiveGHLAuth } from "@/lib/ghl/serverAuth";

/**
 * Returns the message history of a single GHL conversation.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: conversationId } = await context.params;
  if (!conversationId) {
    return NextResponse.json(
      { success: false, error: "conversationId is required" },
      { status: 400 },
    );
  }

  const ghlAuth = await getActiveGHLAuth(userId);
  if (!ghlAuth) {
    return NextResponse.json(
      {
        success: false,
        error: "No GHL connection found. Connect GoHighLevel in Settings first.",
      },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit"));
  const lastMessageId = searchParams.get("lastMessageId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;

  try {
    const result = await getConversationMessages({
      conversationId,
      apiKey: ghlAuth.apiKey,
      limit:
        Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50,
      lastMessageId,
      type,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("GHL conversation messages GET failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to load messages";
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 },
    );
  }
}

type SendBody = {
  message?: string;
  type?: GHLMessageType;
  contactId?: string;
  subject?: string;
  html?: string;
};

/**
 * Sends a reply into a GHL conversation. The conversation's contactId is
 * required (we get it from the conversation list on the client). Channel
 * defaults to SMS — that's how outbound cold outreach goes today.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: conversationId } = await context.params;
  if (!conversationId) {
    return NextResponse.json(
      { success: false, error: "conversationId is required" },
      { status: 400 },
    );
  }

  const ghlAuth = await getActiveGHLAuth(userId);
  if (!ghlAuth) {
    return NextResponse.json(
      {
        success: false,
        error: "No GHL connection found. Connect GoHighLevel in Settings first.",
      },
      { status: 400 },
    );
  }

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const message = body.message?.trim();
  const contactId = body.contactId?.trim();
  const type: GHLMessageType = body.type ?? "SMS";

  if (!message) {
    return NextResponse.json(
      { success: false, error: "message is required" },
      { status: 400 },
    );
  }
  if (!contactId) {
    return NextResponse.json(
      { success: false, error: "contactId is required" },
      { status: 400 },
    );
  }

  try {
    const result = await sendMessage({
      apiKey: ghlAuth.apiKey,
      type,
      contactId,
      message,
      subject: body.subject,
      html: body.html,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("GHL conversation messages POST failed", error);
    const msg =
      error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 502 },
    );
  }
}
