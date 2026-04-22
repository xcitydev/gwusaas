"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

const MODE_INSTRUCTIONS: Record<string, string> = {
  script:
    "Rewrite this as a clean, engaging video script. Fix filler words (um, uh, like), add clear paragraph breaks, bold the key points with **markdown**. Keep the speaker's voice but make it broadcast-ready.",
  hook:
    "Extract and rewrite the single strongest hook from this transcript — the most attention-grabbing 1-3 sentences to use as an opening for a social media video. Return only the hook, no preamble.",
  email:
    "Convert this transcript into a clean, professional email or newsletter. Add a subject line at the top (prefixed with 'Subject:'), a proper greeting, a structured body, and a clear CTA at the end.",
  caption:
    "Turn this transcript into an Instagram/TikTok caption. Max 150 words, punchy opener on line 1, short paragraphs, and a line of 5-8 relevant hashtags at the very end.",
  thread:
    "Convert this into a Twitter/X thread. Each tweet max 280 chars. Number them 1/, 2/, etc. Put each tweet on its own paragraph separated by a blank line. Strong opener tweet, final tweet ends with a CTA.",
};

export const refineTranscript = action({
  args: {
    transcript: v.string(),
    mode: v.string(),
  },
  handler: async (_ctx, { transcript, mode }) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set on the Convex deployment. Run `npx convex env set ANTHROPIC_API_KEY <key>`.",
      );
    }

    const client = new Anthropic();
    const instruction = MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.script;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `${instruction}

RAW TRANSCRIPT:
${transcript}`,
        },
      ],
    });

    const first = response.content[0];
    return first && first.type === "text" ? first.text : "";
  },
});
