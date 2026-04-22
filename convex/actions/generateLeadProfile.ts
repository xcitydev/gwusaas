"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

export const generateLeadProfile = action({
  args: {
    niche: v.string(),
  },
  handler: async (_ctx, { niche }) => {
    const client = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY!});

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are an expert B2B lead generation strategist for a digital marketing agency.

Given this niche: "${niche}", generate a structured lead profile.

Return ONLY valid JSON, no markdown, no explanation:
{
  "icp": "One sentence ideal customer profile",
  "pain_points": ["pain 1", "pain 2", "pain 3"],
  "best_platforms": [
    { "platform": "Instagram", "reason": "why this platform works for this niche" },
    { "platform": "LinkedIn", "reason": "why" },
    { "platform": "Cold Email", "reason": "why" }
  ],
  "dm_opener": "A personalized first DM message (2-3 sentences, conversational, no salesy language)",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "apify_queries": ["search query 1 for Google Maps scraper", "search query 2", "search query 3"],
  "email_subject": "Cold email subject line for this niche"
}`,
        },
      ],
    });

    const firstBlock = response.content[0];
    const text =
      firstBlock && firstBlock.type === "text" ? firstBlock.text : "";

    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    try {
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      return { error: "Failed to parse AI response", raw: text };
    }
  },
});
