export type ContentIdeaForImage = {
  title?: string;
  hook?: string;
  formatSuggestion?: string;
  cta?: string;
};

export type ContentIdeaMetadata = {
  niche?: string;
  platform?: string;
  goal?: string;
};

function getPlatformDimensions(platform: string) {
  const normalized = platform.toLowerCase();
  if (normalized.includes("instagram")) {
    return "1080x1350 portrait feed (4:5) or 1080x1080 square";
  }
  if (normalized.includes("linkedin")) {
    return "1200x1200 square feed";
  }
  if (normalized.includes("facebook")) {
    return "1080x1080 square feed";
  }
  if (normalized.includes("youtube")) {
    return "1280x720 thumbnail layout";
  }
  if (normalized.includes("twitter") || normalized.includes("x")) {
    return "1600x900 landscape feed";
  }
  return "platform-native social feed dimensions";
}

export function buildImagePrompt(
  idea: ContentIdeaForImage,
  metadata: ContentIdeaMetadata,
): string {
  const platform = metadata.platform?.trim() || "social media";
  const niche = metadata.niche?.trim() || "general business";
  const goal = metadata.goal?.trim() || "engagement";
  const title = idea.title?.trim() || "Social content graphic";
  const hook = idea.hook?.trim() || title;
  const format = idea.formatSuggestion?.trim() || "single post graphic";
  const cta = idea.cta?.trim() || "Engage with the post";

  const dimensions = getPlatformDimensions(platform);
  const lowerFormat = format.toLowerCase();

  let formatInstruction = "Create a single polished static graphic.";
  if (lowerFormat.includes("carousel")) {
    formatInstruction =
      "Design the first slide of a carousel. Make it a compelling cover slide with clear hierarchy and hook-focused copy.";
  } else if (lowerFormat.includes("video") || lowerFormat.includes("reel")) {
    formatInstruction =
      "Design a thumbnail-style still frame for a short-form video. Strong focal point, high contrast, and readable overlay text.";
  }

  return [
    `Professional social media graphic for ${platform}.`,
    `Niche: ${niche}.`,
    `Topic: "${title}".`,
    `Hook text overlay: "${hook}".`,
    `Visual style: modern, clean, high contrast, premium brand look.`,
    `Format context: ${format}.`,
    `Primary goal: ${goal}.`,
    `CTA context: "${cta}".`,
    formatInstruction,
    `Layout: bold typography, clear visual hierarchy, brand-forward composition.`,
    `Constraints: no watermarks, no stock photo feel, no clutter, no gibberish text.`,
    `Optimize for ${platform} feed dimensions (${dimensions}).`,
  ].join(" ");
}
