"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

type AssemblyAISubmitResponse = {
  id?: string;
  error?: string;
};

type AssemblyAIWord = {
  text: string;
  start: number;
  end: number;
  confidence: number;
};

type AssemblyAIPollResponse = {
  status: "queued" | "processing" | "completed" | "error";
  text?: string;
  words?: AssemblyAIWord[];
  audio_duration?: number;
  language_code?: string;
  error?: string;
};

type TranscribeResult = {
  transcript: string;
  words: AssemblyAIWord[];
  duration: number;
  language: string | null;
  resolvedAudioUrl: string;
  source:
    | "youtube-captions"
    | "youtube-assemblyai"
    | "instagram-assemblyai"
    | "tiktok-assemblyai"
    | "facebook-assemblyai"
    | "rapidapi-assemblyai"
    | "assemblyai";
};

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

function extractYouTubeVideoId(input: string): string | null {
  try {
    const u = new URL(input);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{6,}$/.test(v)) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) =>
        ["shorts", "embed", "live", "watch", "v"].includes(p),
      );
      if (idx >= 0 && parts[idx + 1]) {
        const id = parts[idx + 1];
        if (/^[A-Za-z0-9_-]{6,}$/.test(id)) return id;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function extractInstagramShortcode(input: string): string | null {
  try {
    const u = new URL(input);
    if (!/instagram\.com$/.test(u.hostname.replace(/^www\./, ""))) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) =>
      ["reel", "reels", "p", "tv"].includes(p),
    );
    if (idx >= 0 && parts[idx + 1]) {
      const code = parts[idx + 1];
      if (/^[A-Za-z0-9_-]{5,20}$/.test(code)) return code;
    }
    return null;
  } catch {
    return null;
  }
}

type CaptionTrack = {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
  name?: { simpleText?: string };
  vssId?: string;
};

type Json3Event = {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: Array<{ utf8?: string }>;
};

type Json3Response = {
  events?: Json3Event[];
};

type PlayerResponse = {
  playabilityStatus?: {
    status?: string;
    reason?: string;
  };
  videoDetails?: {
    lengthSeconds?: string;
    title?: string;
    isLiveContent?: boolean;
  };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
};

function pickCaptionTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  if (!tracks.length) return null;
  return (
    tracks.find((t) => t.languageCode === "en" && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode?.startsWith("en") && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode === "en") ||
    tracks.find((t) => t.languageCode?.startsWith("en")) ||
    tracks.find((t) => t.kind !== "asr") ||
    tracks[0] ||
    null
  );
}

const INNERTUBE_CLIENTS = [
  {
    name: "ANDROID",
    body: {
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "19.09.37",
          androidSdkVersion: 30,
          hl: "en",
          gl: "US",
          userAgent:
            "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
        },
      },
    },
    userAgent:
      "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
  },
  {
    name: "IOS",
    body: {
      context: {
        client: {
          clientName: "IOS",
          clientVersion: "19.09.3",
          deviceModel: "iPhone14,3",
          hl: "en",
          gl: "US",
          userAgent:
            "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
        },
      },
    },
    userAgent:
      "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
  },
  {
    name: "WEB",
    body: {
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20240101.00.00",
          hl: "en",
          gl: "US",
        },
      },
    },
    userAgent: BROWSER_HEADERS["User-Agent"],
  },
] as const;

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

async function fetchPlayerResponse(videoId: string): Promise<{
  player: PlayerResponse;
  client: string;
}> {
  const errors: string[] = [];

  for (const client of INNERTUBE_CLIENTS) {
    try {
      const res = await fetch(
        `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}&prettyPrint=false`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": client.userAgent,
            "Accept-Language": "en-US,en;q=0.9",
            Origin: "https://www.youtube.com",
            Referer: "https://www.youtube.com/",
          },
          body: JSON.stringify({ ...client.body, videoId }),
        },
      );
      if (!res.ok) {
        errors.push(`${client.name}: HTTP ${res.status}`);
        continue;
      }
      const data = (await res.json()) as PlayerResponse;
      const status = data.playabilityStatus?.status ?? "";
      if (status && status !== "OK") {
        errors.push(
          `${client.name}: ${status}${data.playabilityStatus?.reason ? ` – ${data.playabilityStatus.reason}` : ""}`,
        );
        continue;
      }
      const tracks =
        data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks && tracks.length > 0) {
        return { player: data, client: client.name };
      }
      errors.push(`${client.name}: no captionTracks in response`);
    } catch (e) {
      errors.push(
        `${client.name}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  throw new Error(
    `Could not get captions from any YouTube InnerTube client. Diagnostics: ${errors.join(" | ")}`,
  );
}

async function fetchYouTubeCaptions(videoId: string): Promise<{
  text: string;
  segments: Array<{ text: string; start: number; duration: number }>;
  language: string | null;
  duration: number;
}> {
  const { player } = await fetchPlayerResponse(videoId);

  const tracks =
    player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  const track = pickCaptionTrack(tracks);
  if (!track?.baseUrl) {
    throw new Error(
      "This YouTube video has no captions available. Try a different video that shows the CC button on YouTube, or paste a direct MP3/MP4 URL.",
    );
  }

  const sep = track.baseUrl.includes("?") ? "&" : "?";
  const captionsUrl = `${track.baseUrl}${sep}fmt=json3`;

  const cRes = await fetch(captionsUrl, { headers: BROWSER_HEADERS });
  if (!cRes.ok) {
    throw new Error(
      `YouTube caption fetch failed (${cRes.status} ${cRes.statusText}).`,
    );
  }
  const cData = (await cRes.json()) as Json3Response;
  const events = cData.events ?? [];

  const segments: Array<{ text: string; start: number; duration: number }> = [];
  for (const ev of events) {
    if (!ev.segs) continue;
    const text = ev.segs
      .map((s) => s.utf8 ?? "")
      .join("")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    segments.push({
      text,
      start: (ev.tStartMs ?? 0) / 1000,
      duration: (ev.dDurationMs ?? 0) / 1000,
    });
  }

  if (segments.length === 0) {
    throw new Error("YouTube caption track was empty.");
  }

  const fullText = segments
    .map((s) => s.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const last = segments[segments.length - 1];
  const fallbackDuration = last ? last.start + last.duration : 0;
  const lengthFromMeta = Number(player.videoDetails?.lengthSeconds ?? "0");

  return {
    text: fullText,
    segments,
    language: track.languageCode || null,
    duration: Number.isFinite(lengthFromMeta) && lengthFromMeta > 0
      ? lengthFromMeta
      : fallbackDuration,
  };
}

type RapidAudioEntry = {
  url?: string;
  label?: string;
  bitrate?: number | string;
  duration?: number | string;
};

type RapidVideoEntry = {
  url?: string;
  label?: string;
  quality?: string;
};

type RapidContentsItem = {
  audios?: RapidAudioEntry[];
  videos?: RapidVideoEntry[];
};

type RapidDetailsResponse = {
  error?: unknown;
  contents?: RapidContentsItem[];
  metadata?: {
    title?: string;
    duration?: number | string;
    lengthSeconds?: number | string;
  };
  message?: string;
};

function parseKbpsFromLabel(label: string | undefined): number {
  if (!label) return Number.POSITIVE_INFINITY;
  const m = label.match(/([\d.]+)\s*k(?:B|b)ps/i);
  if (!m) return Number.POSITIVE_INFINITY;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function pickBestAudio(audios: RapidAudioEntry[]): RapidAudioEntry | null {
  const withUrl = audios.filter((a) => typeof a.url === "string" && a.url);
  if (withUrl.length === 0) return null;

  const score = (a: RapidAudioEntry): number => {
    const label = (a.label ?? "").toLowerCase();
    let s = 0;
    if (/english[_\s(]*us[)_\s]*/.test(label) && /original/.test(label)) s += 1000;
    else if (/english/.test(label) && /original/.test(label)) s += 800;
    else if (/original/.test(label)) s += 500;
    else if (/english/.test(label)) s += 200;
    const kbps = parseKbpsFromLabel(a.label);
    if (Number.isFinite(kbps)) s -= kbps;
    return s;
  };

  return withUrl.slice().sort((a, b) => score(b) - score(a))[0] ?? null;
}

function parseHeightFromLabel(label: string | undefined): number {
  if (!label) return Number.POSITIVE_INFINITY;
  const m = label.match(/(\d{3,4})p/i);
  if (!m) return Number.POSITIVE_INFINITY;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function pickBestVideo(videos: RapidVideoEntry[]): RapidVideoEntry | null {
  const withUrl = videos.filter((v) => typeof v.url === "string" && v.url);
  if (withUrl.length === 0) return null;
  return withUrl
    .slice()
    .sort(
      (a, b) =>
        parseHeightFromLabel(a.label ?? a.quality) -
        parseHeightFromLabel(b.label ?? b.quality),
    )[0] ?? null;
}

async function resolveAudioViaRapidApi(
  videoId: string,
  rapidKey: string,
): Promise<{ audioUrl: string; title?: string; lengthSeconds?: number }> {
  const qs = new URLSearchParams({
    videoId,
    urlAccess: "proxied",
    renderableFormats: "",
    getTranscript: "false",
  }).toString();

  const res = await fetch(
    `https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details?${qs}`,
    {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": rapidKey,
        "X-RapidAPI-Host": "social-media-video-downloader.p.rapidapi.com",
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 403)
      throw new Error(
        "RapidAPI returned 403 Forbidden. Subscribe to the 'Social Media Video Downloader' API on RapidAPI (Basic/Free plan).",
      );
    if (res.status === 401)
      throw new Error("RapidAPI returned 401 Unauthorized. Check RAPIDAPI_KEY on Convex.");
    if (res.status === 429)
      throw new Error("RapidAPI returned 429 Too Many Requests. Monthly quota exceeded.");
    throw new Error(
      `RapidAPI details failed (${res.status} ${res.statusText})${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }

  const data = (await res.json()) as RapidDetailsResponse;

  const errVal = data.error;
  const hasErr =
    (typeof errVal === "string" && errVal.trim().length > 0) ||
    (errVal && typeof errVal === "object");
  if (hasErr) {
    throw new Error(
      `RapidAPI returned an error: ${typeof errVal === "string" ? errVal : JSON.stringify(errVal).slice(0, 300)}`,
    );
  }

  const container = data.contents?.[0];
  const audios = container?.audios ?? [];
  const pick = pickBestAudio(audios);

  if (!pick?.url) {
    throw new Error(
      `RapidAPI did not return a usable audio URL (got ${audios.length} audio entries). The video may be restricted or the plan may not include audio streams.`,
    );
  }

  const rawLen = data.metadata?.lengthSeconds ?? data.metadata?.duration;
  const lengthSeconds =
    typeof rawLen === "number"
      ? rawLen
      : typeof rawLen === "string"
        ? Number(rawLen)
        : undefined;

  return {
    audioUrl: pick.url!,
    title: data.metadata?.title,
    lengthSeconds:
      lengthSeconds && Number.isFinite(lengthSeconds) && lengthSeconds > 0
        ? lengthSeconds
        : undefined,
  };
}

async function resolveInstagramMedia(
  shortcode: string,
  rapidKey: string,
): Promise<{ mediaUrl: string; title?: string; lengthSeconds?: number }> {
  const qs = new URLSearchParams({
    shortcode,
    urlAccess: "proxied",
    renderableFormats: "720p,highres",
  }).toString();

  const res = await fetch(
    `https://social-media-video-downloader.p.rapidapi.com/instagram/v3/media/post/details?${qs}`,
    {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": rapidKey,
        "X-RapidAPI-Host": "social-media-video-downloader.p.rapidapi.com",
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 403)
      throw new Error(
        "RapidAPI returned 403 Forbidden. Subscribe to the 'Social Media Video Downloader' API on RapidAPI.",
      );
    if (res.status === 401)
      throw new Error("RapidAPI returned 401 Unauthorized. Check RAPIDAPI_KEY on Convex.");
    if (res.status === 429)
      throw new Error("RapidAPI returned 429 Too Many Requests. Monthly quota exceeded.");
    throw new Error(
      `Instagram details failed (${res.status} ${res.statusText})${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }

  const data = (await res.json()) as RapidDetailsResponse;

  const errVal = data.error;
  const hasErr =
    (typeof errVal === "string" && errVal.trim().length > 0) ||
    (errVal && typeof errVal === "object");
  if (hasErr) {
    throw new Error(
      `RapidAPI returned an error for Instagram shortcode "${shortcode}": ${typeof errVal === "string" ? errVal : JSON.stringify(errVal).slice(0, 300)}`,
    );
  }

  const container = data.contents?.[0];
  const audios = container?.audios ?? [];
  const videos = container?.videos ?? [];

  const audioPick = pickBestAudio(audios);
  const videoPick = pickBestVideo(videos);
  const pick = audioPick ?? videoPick;

  if (!pick?.url) {
    throw new Error(
      `RapidAPI did not return a usable media URL for Instagram post "${shortcode}" (got ${audios.length} audio + ${videos.length} video entries). The post may be private, image-only, or restricted.`,
    );
  }

  const rawLen = data.metadata?.lengthSeconds ?? data.metadata?.duration;
  const lengthSeconds =
    typeof rawLen === "number"
      ? rawLen
      : typeof rawLen === "string"
        ? Number(rawLen)
        : undefined;

  return {
    mediaUrl: pick.url,
    title: data.metadata?.title,
    lengthSeconds:
      lengthSeconds && Number.isFinite(lengthSeconds) && lengthSeconds > 0
        ? lengthSeconds
        : undefined,
  };
}

async function resolveTikTokMedia(
  postUrl: string,
  rapidKey: string,
): Promise<{ mediaUrl: string; title?: string; lengthSeconds?: number }> {
  const qs = new URLSearchParams({
    url: postUrl,
    urlAccess: "proxied",
    renderableFormats: "720p,highres",
  }).toString();

  const res = await fetch(
    `https://social-media-video-downloader.p.rapidapi.com/tiktok/v3/post/details?${qs}`,
    {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": rapidKey,
        "X-RapidAPI-Host": "social-media-video-downloader.p.rapidapi.com",
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 403)
      throw new Error(
        "RapidAPI returned 403 Forbidden. Subscribe to the 'Social Media Video Downloader' API on RapidAPI.",
      );
    if (res.status === 401)
      throw new Error("RapidAPI returned 401 Unauthorized. Check RAPIDAPI_KEY on Convex.");
    if (res.status === 429)
      throw new Error("RapidAPI returned 429 Too Many Requests. Monthly quota exceeded.");
    throw new Error(
      `TikTok details failed (${res.status} ${res.statusText})${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }

  const data = (await res.json()) as RapidDetailsResponse;

  const errVal = data.error;
  const hasErr =
    (typeof errVal === "string" && errVal.trim().length > 0) ||
    (errVal && typeof errVal === "object");
  if (hasErr) {
    throw new Error(
      `RapidAPI returned an error for TikTok URL "${postUrl}": ${typeof errVal === "string" ? errVal : JSON.stringify(errVal).slice(0, 300)}`,
    );
  }

  const container = data.contents?.[0];
  const audios = container?.audios ?? [];
  const videos = container?.videos ?? [];

  const audioPick = pickBestAudio(audios);
  const videoPick = pickBestVideo(videos);
  const pick = audioPick ?? videoPick;

  if (!pick?.url) {
    throw new Error(
      `RapidAPI did not return a usable media URL for TikTok post (got ${audios.length} audio + ${videos.length} video entries). The post may be private or region-restricted.`,
    );
  }

  const rawLen = data.metadata?.lengthSeconds ?? data.metadata?.duration;
  const lengthSeconds =
    typeof rawLen === "number"
      ? rawLen
      : typeof rawLen === "string"
        ? Number(rawLen)
        : undefined;

  return {
    mediaUrl: pick.url,
    title: data.metadata?.title,
    lengthSeconds:
      lengthSeconds && Number.isFinite(lengthSeconds) && lengthSeconds > 0
        ? lengthSeconds
        : undefined,
  };
}

async function resolveFacebookMedia(
  postUrl: string,
  rapidKey: string,
): Promise<{ mediaUrl: string; title?: string; lengthSeconds?: number }> {
  const qs = new URLSearchParams({
    url: postUrl,
    urlAccess: "proxied",
    renderableFormats: "720p,highres",
  }).toString();

  const res = await fetch(
    `https://social-media-video-downloader.p.rapidapi.com/facebook/v1/post/details?${qs}`,
    {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": rapidKey,
        "X-RapidAPI-Host": "social-media-video-downloader.p.rapidapi.com",
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 403)
      throw new Error(
        "RapidAPI returned 403 Forbidden. Subscribe to the 'Social Media Video Downloader' API on RapidAPI.",
      );
    if (res.status === 401)
      throw new Error("RapidAPI returned 401 Unauthorized. Check RAPIDAPI_KEY on Convex.");
    if (res.status === 429)
      throw new Error("RapidAPI returned 429 Too Many Requests. Monthly quota exceeded.");
    throw new Error(
      `Facebook details failed (${res.status} ${res.statusText})${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }

  const data = (await res.json()) as RapidDetailsResponse;

  const errVal = data.error;
  const hasErr =
    (typeof errVal === "string" && errVal.trim().length > 0) ||
    (errVal && typeof errVal === "object");
  if (hasErr) {
    throw new Error(
      `RapidAPI returned an error for Facebook URL "${postUrl}": ${typeof errVal === "string" ? errVal : JSON.stringify(errVal).slice(0, 300)}`,
    );
  }

  const container = data.contents?.[0];
  const audios = container?.audios ?? [];
  const videos = container?.videos ?? [];

  const audioPick = pickBestAudio(audios);
  const videoPick = pickBestVideo(videos);
  const pick = audioPick ?? videoPick;

  if (!pick?.url) {
    throw new Error(
      `RapidAPI did not return a usable media URL for Facebook post (got ${audios.length} audio + ${videos.length} video entries). The post may be private, text-only, or restricted.`,
    );
  }

  const rawLen = data.metadata?.lengthSeconds ?? data.metadata?.duration;
  const lengthSeconds =
    typeof rawLen === "number"
      ? rawLen
      : typeof rawLen === "string"
        ? Number(rawLen)
        : undefined;

  return {
    mediaUrl: pick.url,
    title: data.metadata?.title,
    lengthSeconds:
      lengthSeconds && Number.isFinite(lengthSeconds) && lengthSeconds > 0
        ? lengthSeconds
        : undefined,
  };
}

const MAX_AUDIO_BYTES = 200 * 1024 * 1024;

async function uploadAudioToAssemblyAI(
  sourceUrl: string,
  assemblyKey: string,
): Promise<string> {
  const audioRes = await fetch(sourceUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "identity",
    },
  });

  if (!audioRes.ok) {
    if (audioRes.status === 403) {
      throw new Error(
        `Failed to download audio (403 Forbidden). The signed URL is bound to the original requester's IP. ` +
          `Ensure the RapidAPI call uses urlAccess=proxied (which routes audio through their proxy) — currently configured that way. ` +
          `If you still see this, the proxied token may have expired between the details call and the download.`,
      );
    }
    throw new Error(
      `Failed to download audio from resolver (${audioRes.status} ${audioRes.statusText}). The signed URL may have expired or be IP-restricted.`,
    );
  }

  const contentLength = Number(audioRes.headers.get("content-length") ?? "0");
  if (contentLength && contentLength > MAX_AUDIO_BYTES) {
    throw new Error(
      `Audio file is too large to proxy (${Math.round(contentLength / (1024 * 1024))}MB > ${MAX_AUDIO_BYTES / (1024 * 1024)}MB). Try a shorter video.`,
    );
  }

  const audioBuffer = await audioRes.arrayBuffer();
  if (audioBuffer.byteLength === 0) {
    throw new Error("Audio resolver returned an empty body.");
  }
  if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
    throw new Error(
      `Audio file is too large (${Math.round(audioBuffer.byteLength / (1024 * 1024))}MB). Try a shorter video.`,
    );
  }

  const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      authorization: assemblyKey,
      "content-type": "application/octet-stream",
    },
    body: audioBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => "");
    throw new Error(
      `AssemblyAI upload failed (${uploadRes.status}): ${errText.slice(0, 300)}`,
    );
  }

  const uploadData = (await uploadRes.json()) as { upload_url?: string };
  if (!uploadData.upload_url) {
    throw new Error("AssemblyAI upload succeeded but returned no upload_url.");
  }
  return uploadData.upload_url;
}

async function transcribeWithAssemblyAI(
  audioUrl: string,
  assemblyKey: string,
  options: { proxyThroughUpload?: boolean } = {},
): Promise<TranscribeResult> {
  const effectiveUrl = options.proxyThroughUpload
    ? await uploadAudioToAssemblyAI(audioUrl, assemblyKey)
    : audioUrl;

  const submitRes = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      authorization: assemblyKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      audio_url: effectiveUrl,
      speech_models: ["universal-2"],
      language_detection: true,
      punctuate: true,
      format_text: true,
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => "");
    throw new Error(
      `AssemblyAI submission failed (${submitRes.status}): ${errText.slice(0, 300)}`,
    );
  }

  const submitData = (await submitRes.json()) as AssemblyAISubmitResponse;
  const transcriptId = submitData.id;
  if (!transcriptId) {
    throw new Error(
      `AssemblyAI submission failed: ${submitData.error || "missing transcript id"}`,
    );
  }

  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const pollRes = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      {
        headers: { authorization: assemblyKey },
      },
    );
    if (!pollRes.ok) {
      const errText = await pollRes.text().catch(() => "");
      throw new Error(
        `AssemblyAI poll failed (${pollRes.status}): ${errText.slice(0, 200)}`,
      );
    }
    const pollData = (await pollRes.json()) as AssemblyAIPollResponse;

    if (pollData.status === "completed") {
      const allWords = pollData.words ?? [];
      const MAX_WORDS = 4000;
      const words =
        allWords.length > MAX_WORDS ? allWords.slice(0, MAX_WORDS) : allWords;
      return {
        transcript: pollData.text ?? "",
        words,
        duration: pollData.audio_duration ?? 0,
        language: pollData.language_code ?? null,
        resolvedAudioUrl: audioUrl,
        source: "assemblyai",
      };
    }

    if (pollData.status === "error") {
      throw new Error(`Transcription failed: ${pollData.error ?? "unknown"}`);
    }
  }

  throw new Error("Transcription timed out after ~3 minutes");
}

export const transcribeUrl = action({
  args: {
    url: v.string(),
    platform: v.string(),
  },
  handler: async (_ctx, { url, platform }): Promise<TranscribeResult> => {
    if (platform === "youtube") {
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        throw new Error(
          `Could not parse a YouTube video ID from: ${url}. Expected youtube.com/watch?v=…, youtu.be/…, or youtube.com/shorts/….`,
        );
      }

      try {
        const captions = await fetchYouTubeCaptions(videoId);

        return {
          transcript: captions.text,
          words: [],
          duration: captions.duration,
          language: captions.language,
          resolvedAudioUrl: url,
          source: "youtube-captions",
        };
      } catch (captionErr) {
        const assemblyKey = process.env.ASSEMBLYAI_API_KEY;
        const rapidKey = process.env.RAPIDAPI_KEY;
        if (!assemblyKey || !rapidKey) {
          const missing = [
            !assemblyKey ? "ASSEMBLYAI_API_KEY" : null,
            !rapidKey ? "RAPIDAPI_KEY" : null,
          ]
            .filter(Boolean)
            .join(" and ");
          throw new Error(
            `Captions unavailable for this video and the audio-fallback path is not configured. Set ${missing} on the Convex deployment (\`npx convex env set ...\`). Captions error: ${captionErr instanceof Error ? captionErr.message : String(captionErr)}`,
          );
        }

        const resolved = await resolveAudioViaRapidApi(videoId, rapidKey);
        const result = await transcribeWithAssemblyAI(
          resolved.audioUrl,
          assemblyKey,
          { proxyThroughUpload: true },
        );
        return {
          ...result,
          duration: result.duration || resolved.lengthSeconds || 0,
          resolvedAudioUrl: resolved.audioUrl,
          source: "youtube-assemblyai",
        };
      }
    }

    const assemblyKey = process.env.ASSEMBLYAI_API_KEY;
    if (!assemblyKey) {
      throw new Error(
        "ASSEMBLYAI_API_KEY is not set on the Convex deployment. Run `npx convex env set ASSEMBLYAI_API_KEY <key>`.",
      );
    }

    if (platform === "instagram") {
      const shortcode = extractInstagramShortcode(url);
      if (!shortcode) {
        throw new Error(
          `Could not parse an Instagram shortcode from: ${url}. Expected instagram.com/reel/…, instagram.com/p/…, or instagram.com/tv/….`,
        );
      }

      const rapidKey = process.env.RAPIDAPI_KEY;
      if (!rapidKey) {
        throw new Error(
          "RAPIDAPI_KEY is not set on the Convex deployment. Run `npx convex env set RAPIDAPI_KEY <key>`.",
        );
      }

      const resolved = await resolveInstagramMedia(shortcode, rapidKey);
      const result = await transcribeWithAssemblyAI(resolved.mediaUrl, assemblyKey, {
        proxyThroughUpload: true,
      });
      return {
        ...result,
        duration: result.duration || resolved.lengthSeconds || 0,
        resolvedAudioUrl: resolved.mediaUrl,
        source: "instagram-assemblyai",
      };
    }

    if (platform === "tiktok") {
      const rapidKey = process.env.RAPIDAPI_KEY;
      if (!rapidKey) {
        throw new Error(
          "RAPIDAPI_KEY is not set on the Convex deployment. Run `npx convex env set RAPIDAPI_KEY <key>`.",
        );
      }

      const resolved = await resolveTikTokMedia(url, rapidKey);
      const result = await transcribeWithAssemblyAI(resolved.mediaUrl, assemblyKey, {
        proxyThroughUpload: true,
      });
      return {
        ...result,
        duration: result.duration || resolved.lengthSeconds || 0,
        resolvedAudioUrl: resolved.mediaUrl,
        source: "tiktok-assemblyai",
      };
    }

    if (platform === "facebook") {
      const rapidKey = process.env.RAPIDAPI_KEY;
      if (!rapidKey) {
        throw new Error(
          "RAPIDAPI_KEY is not set on the Convex deployment. Run `npx convex env set RAPIDAPI_KEY <key>`.",
        );
      }

      const resolved = await resolveFacebookMedia(url, rapidKey);
      const result = await transcribeWithAssemblyAI(resolved.mediaUrl, assemblyKey, {
        proxyThroughUpload: true,
      });
      return {
        ...result,
        duration: result.duration || resolved.lengthSeconds || 0,
        resolvedAudioUrl: resolved.mediaUrl,
        source: "facebook-assemblyai",
      };
    }

    if (platform === "direct") {
      return await transcribeWithAssemblyAI(url, assemblyKey);
    }

    const platformLabel =
      platform === "unknown"
        ? "this link"
        : platform.charAt(0).toUpperCase() + platform.slice(1);
    throw new Error(
      `We don't currently support ${platformLabel}. Supported platforms are YouTube, Instagram, TikTok, Facebook, and direct media URLs (MP3/MP4/WAV/M4A/OGG/WEBM).`,
    );
  },
});
