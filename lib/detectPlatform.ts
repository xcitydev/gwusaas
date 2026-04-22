export type Platform =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "twitter"
  | "loom"
  | "spotify"
  | "direct"
  | "unknown";

export function detectPlatform(url: string): Platform {
  if (!url) return "unknown";
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/instagram\.com/.test(url)) return "instagram";
  if (/tiktok\.com/.test(url)) return "tiktok";
  if (/twitter\.com|x\.com/.test(url)) return "twitter";
  if (/loom\.com/.test(url)) return "loom";
  if (/spotify\.com/.test(url)) return "spotify";
  if (/\.(mp3|mp4|wav|m4a|ogg|webm)(\?|$)/i.test(url)) return "direct";
  return "unknown";
}

export function getPlatformLabel(platform: Platform): string {
  const labels: Record<Platform, string> = {
    youtube: "YouTube",
    instagram: "Instagram Reel",
    tiktok: "TikTok",
    twitter: "X / Twitter",
    loom: "Loom",
    spotify: "Spotify Podcast",
    direct: "Direct Audio/Video File",
    unknown: "Unknown Platform",
  };
  return labels[platform];
}

export function getPlatformEmoji(platform: Platform): string {
  const emojis: Record<Platform, string> = {
    youtube: "🎬",
    instagram: "📸",
    tiktok: "🎵",
    twitter: "🐦",
    loom: "🎥",
    spotify: "🎙️",
    direct: "📁",
    unknown: "⚠️",
  };
  return emojis[platform];
}
