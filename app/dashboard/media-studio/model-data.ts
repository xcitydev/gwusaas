export const IMAGE_MODELS = [
  { id: "dall-e-3", name: "DALL-E 3", provider: "openai", description: "Best prompt adherence, high detail", badge: "Popular" },
  { id: "dall-e-2", name: "DALL-E 2", provider: "openai", description: "Fast and affordable OpenAI images", badge: "Fast" },
  { id: "sd3.5-large", name: "Stable Diffusion 3.5 Large", provider: "stability", description: "Stability AI's most capable model", badge: undefined },
  { id: "stable-diffusion-xl-1024-v1-0", name: "SDXL 1.0", provider: "stability", description: "High-res detailed Stable Diffusion", badge: "Fast" },
  { id: "black-forest-labs/flux-1.1-pro", name: "FLUX 1.1 Pro", provider: "replicate", description: "Photorealistic, highest quality FLUX", badge: "Best" },
  { id: "black-forest-labs/flux-schnell", name: "FLUX Schnell", provider: "replicate", description: "Ultra-fast FLUX for rapid iteration", badge: "Fastest" },
  { id: "ideogram-ai/ideogram-v3-turbo", name: "Ideogram V3 Turbo", provider: "replicate", description: "Excellent text-in-image and design", badge: "Text" },
  { id: "bytedance/seedream-3.0", name: "Seedream 3.0", provider: "replicate", description: "Realistic lighting, textures, faces", badge: undefined },
  { id: "recraft-ai/recraft-v3", name: "Recraft V4", provider: "replicate", description: "Art-direction and design quality", badge: "Design" },
  { id: "google/imagen-3", name: "Imagen 3", provider: "replicate", description: "Google's photorealistic image model", badge: "New" },
];

export const VIDEO_MODELS = [
  { id: "gen4_turbo", name: "Runway Gen-4 Turbo", provider: "runway", description: "Runway's fastest cinematic video model", badge: "Popular" },
  { id: "kwaivgi/kling-v2.5-turbo-pro", name: "Kling 2.5 Turbo Pro", provider: "replicate", description: "Cinematic video from text or images", badge: "Cinematic" },
  { id: "lightricks/ltx-video", name: "LTX Video", provider: "replicate", description: "DiT-based real-time video generation", badge: "Fast" },
  { id: "wavespeedai/wan-2.1-t2v-480p", name: "Wan 2.1", provider: "replicate", description: "Open-source, beats proprietary models", badge: "Open Source" },
  { id: "minimax/hailuo-02", name: "Hailuo 2", provider: "replicate", description: "Text-to-video and image-to-video at 768p", badge: undefined },
  { id: "google/veo-3", name: "Google Veo 3", provider: "replicate", description: "Google's cinematic video with native audio", badge: "New" },
];

export const PROVIDER_LABELS: Record<string, { label: string; color: string }> = {
  openai: { label: "OpenAI", color: "bg-green-600" },
  stability: { label: "Stability AI", color: "bg-violet-600" },
  replicate: { label: "Replicate", color: "bg-indigo-600" },
  runway: { label: "Runway ML", color: "bg-teal-600" },
  collage: { label: "Collage", color: "bg-zinc-500" },
};

export const BADGE_COLORS: Record<string, string> = {
  Popular: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Best: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  Fast: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Fastest: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  New: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Text: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  Design: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  Cinematic: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Open Source": "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};
