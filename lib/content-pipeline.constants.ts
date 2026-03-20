export const SUPPORTED_PIPELINE_PLATFORMS = [
  "youtube",
  "instagram",
  "tiktok",
  "substack",
  "reddit",
] as const;

export type SupportedPipelinePlatform =
  (typeof SUPPORTED_PIPELINE_PLATFORMS)[number];
