import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVoiceCallerAccess } from "@/lib/voiceCallerGate";
import { uploadCampaignAudio } from "@/lib/supabaseStorage";
import { updateCampaignAudio } from "@/lib/voiceCallerConvex";

export const runtime = "nodejs";

const bodySchema = z.object({
  voiceId: z.string().min(1),
  scriptText: z.string().min(1),
  campaignId: z.string().min(1),
});

export async function POST(req: Request) {
  const guard = await requireVoiceCallerAccess();
  if (!guard.ok) return guard.response;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(body.voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: body.scriptText,
          model_id: "eleven_turbo_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.85 },
        }),
      },
    );

    if (!ttsRes.ok) {
      const errText = await ttsRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: `ElevenLabs TTS failed (${ttsRes.status}): ${errText.slice(0, 400)}`,
        },
        { status: 502 },
      );
    }

    const arrayBuffer = await ttsRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `campaign-${body.campaignId}-${Date.now()}.mp3`;

    const audioUrl = await uploadCampaignAudio(buffer, filename);

    try {
      await updateCampaignAudio(body.campaignId, audioUrl);
    } catch (error) {
      console.warn("[voice-caller/generate-audio] updateCampaignAudio failed", {
        campaignId: body.campaignId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return NextResponse.json({ audioUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Generate audio failed: ${message}` },
      { status: 500 },
    );
  }
}
