"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

type SocialLink = {
  url?: string;
  type?: string;
  quality?: string;
  ext?: string;
};

type SocialDownloaderResponse = {
  links?: SocialLink[];
  url?: string;
  success?: boolean;
  error?: string;
  message?: string;
  source?: string;
  title?: string;
};

function pickMediaLink(links: SocialLink[]): SocialLink | undefined {
  const hasAudioExt = (s?: string) =>
    !!s && /\.(mp3|m4a|wav|ogg|aac|opus|webm)(\?|$)/i.test(s);
  const hasVideoExt = (s?: string) =>
    !!s && /\.(mp4|mov|webm)(\?|$)/i.test(s);
  const isAudioType = (s?: string) => !!s && /audio/i.test(s);
  const isVideoType = (s?: string) => !!s && /video|mp4/i.test(s);

  return (
    links.find((l) => isAudioType(l.type) || hasAudioExt(l.url) || hasAudioExt(l.ext)) ||
    links.find((l) => isVideoType(l.type) || hasVideoExt(l.url) || hasVideoExt(l.ext)) ||
    links.find((l) => !!l.url)
  );
}

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

export const transcribeUrl = action({
  args: {
    url: v.string(),
    platform: v.string(),
  },
  handler: async (_ctx, { url, platform }) => {
    const assemblyKey = process.env.ASSEMBLYAI_API_KEY;
    if (!assemblyKey) {
      throw new Error(
        "ASSEMBLYAI_API_KEY is not set on the Convex deployment. Run `npx convex env set ASSEMBLYAI_API_KEY <key>`.",
      );
    }

    let audioUrl = url;

    const needsResolver = [
      "youtube",
      "instagram",
      "tiktok",
      "twitter",
      "loom",
      "spotify",
      "unknown",
    ].includes(platform);

    if (needsResolver) {
      const rapidKey = process.env.RAPIDAPI_KEY;
      if (!rapidKey) {
        throw new Error(
          "RAPIDAPI_KEY is not set on the Convex deployment. Run `npx convex env set RAPIDAPI_KEY <key>`.",
        );
      }

      const dlRes = await fetch(
        `https://social-media-video-downloader.p.rapidapi.com/smvd/get/all?url=${encodeURIComponent(url)}`,
        {
          headers: {
            "X-RapidAPI-Key": rapidKey,
            "X-RapidAPI-Host": "social-media-video-downloader.p.rapidapi.com",
          },
        },
      );
      if (!dlRes.ok) {
        if (dlRes.status === 403) {
          throw new Error(
            "RapidAPI returned 403 Forbidden. Your key is valid but you haven't " +
              "subscribed to the 'Social Media Video Downloader' API. " +
              "Visit https://rapidapi.com/ and click 'Subscribe to Test' on that API (Basic/Free plan works), then retry.",
          );
        }
        if (dlRes.status === 401) {
          throw new Error(
            "RapidAPI returned 401 Unauthorized. Check that RAPIDAPI_KEY is set correctly on the Convex deployment.",
          );
        }
        if (dlRes.status === 429) {
          throw new Error(
            "RapidAPI returned 429 Too Many Requests. You've hit your monthly quota on the 'Social Media Video Downloader' API — upgrade the plan on RapidAPI or wait until it resets.",
          );
        }
        const errBody = await dlRes.text().catch(() => "");
        throw new Error(
          `Social downloader request failed (${dlRes.status} ${dlRes.statusText})${errBody ? `: ${errBody.slice(0, 200)}` : ""}`,
        );
      }
      const dlData = (await dlRes.json()) as SocialDownloaderResponse;
      if (dlData.success === false) {
        throw new Error(
          `Downloader refused this URL: ${dlData.error || dlData.message || "unknown reason"}`,
        );
      }
      const links = Array.isArray(dlData.links) ? dlData.links : [];
      const picked = pickMediaLink(links);
      if (picked?.url) {
        audioUrl = picked.url;
      } else {
        throw new Error(
          `Could not extract a media URL from ${platform}. ` +
            `The social downloader returned no usable links ` +
            `(${dlData.error || dlData.message || "empty response"}). ` +
            `For Loom/Spotify podcasts, try a direct MP3 URL instead.`,
        );
      }
    }

    const submitRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: assemblyKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: audioUrl,
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
        const text = pollData.text ?? "";
        return {
          transcript: text,
          words: pollData.words ?? [],
          duration: pollData.audio_duration ?? 0,
          language: pollData.language_code ?? null,
          resolvedAudioUrl: audioUrl,
        };
      }

      if (pollData.status === "error") {
        throw new Error(`Transcription failed: ${pollData.error ?? "unknown"}`);
      }
    }

    throw new Error("Transcription timed out after ~3 minutes");
  },
});
