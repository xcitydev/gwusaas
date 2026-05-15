import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sendMessage, type GHLMessageType } from "@/lib/ghl";
import { getActiveGHLAuth } from "@/lib/ghl/serverAuth";
import { uploadCampaignAudio } from "@/lib/supabaseStorage";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getConvexServerClient } from "@/lib/convexServer";

export const runtime = "nodejs";

/**
 * Sends an AI-generated voice note into a GHL conversation, in the user's
 * cloned voice. Pipeline:
 *   1. Auth + GHL connection check.
 *   2. Look up the user's active voice clone in Convex (voiceClones table).
 *   3. Synthesize the reply text via ElevenLabs TTS using that voice_id.
 *   4. Upload the resulting MP3 to Supabase Storage (public URL).
 *   5. POST the message to GHL with the public MP3 URL in `attachments`.
 *
 * GHL renders the attachment as a playable media on the recipient's phone
 * (MMS for SMS contacts, native audio for IG/WhatsApp).
 */

const ELEVEN_TTS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";

type Body = {
  /** Reply text to be spoken in the cloned voice. */
  text?: string;
  /** Channel of the original conversation (defaults to SMS). */
  channel?: GHLMessageType;
  /** Contact to send the message to. Required by GHL. */
  contactId?: string;
  /** Optional: text shown alongside the audio (some channels render it). */
  caption?: string;
};

type VoiceClone = {
  voiceId: string;
  voiceName: string;
} | null;

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

  // Voice replies are the most expensive endpoint (ElevenLabs TTS + Supabase
  // upload + GHL send). Use the strict voice bucket.
  const rl = await checkRateLimit(userId, "voice");
  const denied = rateLimitResponse(rl);
  if (denied) return denied as unknown as NextResponse;

  const { id: conversationId } = await context.params;
  if (!conversationId) {
    return NextResponse.json(
      { success: false, error: "conversationId is required" },
      { status: 400 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const text = body.text?.trim();
  const contactId = body.contactId?.trim();
  const channel: GHLMessageType = body.channel ?? "SMS";

  if (!text) {
    return NextResponse.json(
      { success: false, error: "text is required" },
      { status: 400 },
    );
  }
  if (!contactId) {
    return NextResponse.json(
      { success: false, error: "contactId is required" },
      { status: 400 },
    );
  }

  // ── 1. GHL auth ──
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

  // ── 2. Fetch the user's active voice clone from Convex ──
  let clone: VoiceClone = null;
  try {
    const convex = getConvexServerClient();
    clone = (await convex.query("voiceCaller:getVoiceClone" as never, {
      clientId: userId,
    } as never)) as VoiceClone;
  } catch (e) {
    console.error("[ghl/voice-reply] convex query failed", e);
    return NextResponse.json(
      { success: false, error: "Could not look up your active voice clone" },
      { status: 500 },
    );
  }
  if (!clone || !clone.voiceId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "No active voice clone found. Go to Settings → Voice and clone your voice first.",
      },
      { status: 400 },
    );
  }

  // ── 3. ElevenLabs TTS ──
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenKey) {
    return NextResponse.json(
      { success: false, error: "ELEVENLABS_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let audioBuffer: Buffer;
  try {
    const ttsRes = await fetch(`${ELEVEN_TTS_BASE}/${clone.voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      return NextResponse.json(
        {
          success: false,
          error: `ElevenLabs TTS failed (${ttsRes.status}): ${errText.slice(0, 400)}`,
        },
        { status: 502 },
      );
    }

    const arrayBuf = await ttsRes.arrayBuffer();
    audioBuffer = Buffer.from(arrayBuf);
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: `TTS request failed: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 502 },
    );
  }

  // ── 4. Upload the MP3 to public storage ──
  let publicAudioUrl: string;
  try {
    publicAudioUrl = await uploadCampaignAudio(
      audioBuffer,
      `voice-reply-${conversationId}-${Date.now()}.mp3`,
    );
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: `Audio upload failed: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 500 },
    );
  }

  // ── 5. Send via GHL with the audio as an attachment ──
  // The `message` field is required by GHL even when sending media. Use the
  // caption if provided, otherwise a single space so SMS renders cleanly.
  const messageText = body.caption?.trim() || " ";

  try {
    const result = await sendMessage({
      apiKey: ghlAuth.apiKey,
      type: channel,
      contactId,
      message: messageText,
      attachments: [publicAudioUrl],
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        audioUrl: publicAudioUrl,
        voiceId: clone.voiceId,
        voiceName: clone.voiceName,
      },
    });
  } catch (e) {
    console.error("[ghl/voice-reply] send failed", e);
    return NextResponse.json(
      {
        success: false,
        error: `GHL send failed: ${e instanceof Error ? e.message : String(e)}`,
        // Surface the audio URL so the user can still grab it manually if needed.
        audioUrl: publicAudioUrl,
      },
      { status: 502 },
    );
  }
}
