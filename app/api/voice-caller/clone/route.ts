import { NextResponse } from "next/server";
import { requireVoiceCallerAccess } from "@/lib/voiceCallerGate";
import { uploadVoiceSample } from "@/lib/supabaseStorage";
import { createVoiceCloneRecord } from "@/lib/voiceCallerConvex";

export const runtime = "nodejs";

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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audioFile = form.get("audioFile");
  const clientIdRaw = form.get("clientId");
  const voiceNameRaw = form.get("voiceName");

  if (!(audioFile instanceof File)) {
    return NextResponse.json({ error: "audioFile is required" }, { status: 400 });
  }
  const voiceName = typeof voiceNameRaw === "string" && voiceNameRaw.trim().length > 0
    ? voiceNameRaw.trim()
    : "My Cloned Voice";
  const clientId =
    typeof clientIdRaw === "string" && clientIdRaw.trim().length > 0
      ? clientIdRaw.trim()
      : guard.userId;

  if (clientId !== guard.userId) {
    return NextResponse.json(
      { error: "clientId does not match signed-in user" },
      { status: 403 },
    );
  }

  try {
    const arrayBuf = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const filename = audioFile.name || `voice-sample-${Date.now()}.mp3`;

    const sampleUrl = await uploadVoiceSample(buffer, filename);

    const elevenForm = new FormData();
    elevenForm.append("name", voiceName);
    elevenForm.append(
      "files",
      new Blob([new Uint8Array(arrayBuf)], {
        type: audioFile.type || "audio/mpeg",
      }),
      filename,
    );

    const elevenRes = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: elevenForm,
    });

    const elevenText = await elevenRes.text();
    if (!elevenRes.ok) {
      return NextResponse.json(
        {
          error: `ElevenLabs voice clone failed (${elevenRes.status}): ${elevenText.slice(0, 500)}`,
        },
        { status: 502 },
      );
    }

    let elevenJson: { voice_id?: string } = {};
    try {
      elevenJson = JSON.parse(elevenText) as { voice_id?: string };
    } catch {
      return NextResponse.json(
        { error: "ElevenLabs response was not JSON" },
        { status: 502 },
      );
    }

    const voiceId = elevenJson.voice_id;
    if (!voiceId) {
      return NextResponse.json(
        { error: "ElevenLabs did not return a voice_id" },
        { status: 502 },
      );
    }

    await createVoiceCloneRecord({ clientId, voiceId, voiceName, sampleUrl });

    return NextResponse.json({ voiceId, sampleUrl, voiceName });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[voice-caller/clone] failed", { message });
    return NextResponse.json({ error: `Voice clone failed: ${message}` }, { status: 500 });
  }
}
