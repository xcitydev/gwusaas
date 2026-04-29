import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const VOICE_SAMPLES_BUCKET = "voice-samples";
const VOICE_CAMPAIGNS_BUCKET = "voice-campaigns";

let cachedClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

async function ensureBucket(bucket: string): Promise<void> {
  const client = getSupabaseClient();
  const { data: existing } = await client.storage.getBucket(bucket);
  if (existing) return;
  await client.storage.createBucket(bucket, { public: true });
}

function inferContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".webm")) return "audio/webm";
  return "application/octet-stream";
}

async function uploadToBucket(
  bucket: string,
  file: Buffer | Uint8Array,
  filename: string,
): Promise<string> {
  const client = getSupabaseClient();
  await ensureBucket(bucket);

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${Date.now()}-${safeName}`;

  const { error } = await client.storage.from(bucket).upload(objectPath, file, {
    contentType: inferContentType(filename),
    upsert: false,
  });

  if (error) {
    throw new Error(`Supabase upload failed (${bucket}): ${error.message}`);
  }

  const { data: publicUrl } = client.storage.from(bucket).getPublicUrl(objectPath);
  if (!publicUrl?.publicUrl) {
    throw new Error("Supabase upload succeeded but public URL was not returned.");
  }
  return publicUrl.publicUrl;
}

/**
 * Upload a user-supplied voice sample (e.g. a 30-second recording) used to clone
 * a voice with ElevenLabs. Returns the public URL of the stored sample.
 */
export async function uploadVoiceSample(
  file: Buffer,
  filename: string,
): Promise<string> {
  return uploadToBucket(VOICE_SAMPLES_BUCKET, file, filename);
}

/**
 * Upload the rendered TTS audio for a campaign (used as the playback URL for
 * voicemail drops or as the agent opener). Returns the public URL.
 */
export async function uploadCampaignAudio(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  return uploadToBucket(VOICE_CAMPAIGNS_BUCKET, buffer, filename);
}
