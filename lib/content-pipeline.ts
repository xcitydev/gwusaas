import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { type MessageParam } from "@anthropic-ai/sdk/resources";
import { generateJsonWithFallback } from "@/lib/ai";

export type ViralTopicInput = {
  platform: string;
  topic: string;
  viralReason: string;
  sourceUrl?: string;
};

export type RefinedTopicInput = {
  platform: string;
  dayNumber: number;
  topicTitle: string;
  topicAngle: string;
};

export type GeneratedTopicContent = Record<string, string>;

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

function stripCodeFences(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```[a-zA-Z0-9_-]*\s*/m, "")
      .replace(/```$/m, "")
      .trim();
  }
  return trimmed;
}

function extractBalancedJsonCandidates(text: string, startChar: "{" | "[") {
  const endChar = startChar === "{" ? "}" : "]";
  const candidates: string[] = [];

  for (let start = text.indexOf(startChar); start !== -1; start = text.indexOf(startChar, start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i += 1) {
      const char = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === "\"") {
          inString = false;
        }
        continue;
      }

      if (char === "\"") {
        inString = true;
        continue;
      }

      if (char === startChar) {
        depth += 1;
        continue;
      }
      if (char === endChar) {
        depth -= 1;
        if (depth === 0) {
          candidates.push(text.slice(start, i + 1));
          break;
        }
      }
    }
  }

  return candidates;
}

function parseJsonFromText<T>(raw: string): T {
  const text = stripCodeFences(raw);
  try {
    return JSON.parse(text) as T;
  } catch (directError) {
    const candidates = [
      ...extractBalancedJsonCandidates(text, "["),
      ...extractBalancedJsonCandidates(text, "{"),
    ].sort((a, b) => b.length - a.length);

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // Try next candidate.
      }
    }

    throw new Error(
      `Failed to parse AI response as JSON. ${
        directError instanceof Error ? directError.message : "Unknown parse error"
      }`,
    );
  }
}

function extractAnthropicText(payload: AnthropicResponse): string {
  return (
    payload.content
      ?.filter((item) => item.type === "text" && typeof item.text === "string")
      .map((item) => item.text?.trim() || "")
      .join("\n")
      .trim() || ""
  );
}

function getXaiImageModelCandidates() {
  const fromEnv = (process.env.XAI_IMAGE_MODELS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const defaults = [
    "grok-2-image-1212",
    "grok-imagine-image",
    "grok-image",
    "grok-image-latest",
    "grok-2-image-latest",
    "grok-2-image",
  ];

  const seen = new Set<string>();
  return [...fromEnv, ...defaults].filter((model) => {
    if (seen.has(model)) return false;
    seen.add(model);
    return true;
  });
}

export async function callClaudeJson<T>({
  system,
  userMessage,
  maxTokens = 4000,
  enableWebSearch = false,
}: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  enableWebSearch?: boolean;
}): Promise<T> {
  // Web search currently requires Anthropic tools, so keep this path Claude-only.
  if (!enableWebSearch) {
    const messages: MessageParam[] = [{ role: "user", content: userMessage }];
    const pipelineProviderOrder =
      process.env.PIPELINE_AI_PROVIDER_ORDER || "gemini,anthropic,openai";
    const { data, provider, model } = await generateJsonWithFallback<T>({
      system,
      messages,
      traceId: `pipeline:${Date.now()}`,
      maxTokens,
      providerOrder: pipelineProviderOrder,
    });
    console.info("Pipeline AI provider success", { provider, model });
    return data;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      ...(enableWebSearch
        ? { "anthropic-beta": "interleaved-thinking-2025-05-14" }
        : {}),
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      ...(enableWebSearch
        ? {
            tools: [{ type: "web_search_20250305", name: "web_search" }],
          }
        : {}),
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  const payload = (await response.json()) as AnthropicResponse;
  if (!response.ok) {
    const message = payload.error?.message || "Claude request failed";
    throw new Error(message);
  }

  const text = extractAnthropicText(payload);
  if (!text) throw new Error("Claude returned empty content");
  return parseJsonFromText<T>(text);
}

export async function generateImageFromPrompt(prompt: string) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return undefined;

  let lastError = "Image generation failed";

  for (const model of getXaiImageModelCandidates()) {
    const response = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        response_format: "url",
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: Array<{ url?: string; b64_json?: string }>; error?: string }
      | null;

    if (!response.ok) {
      lastError = payload?.error || `xAI request failed with ${response.status}`;
      continue;
    }

    const first = payload?.data?.[0];
    if (first?.url) return first.url;
    if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  }

  throw new Error(lastError);
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export async function runContentPipelineMutation(
  name: string,
  args: Record<string, unknown>,
) {
  if (!convexClient) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return convexClient.mutation(name as never, args as never);
}

export async function runContentPipelineQuery(
  name: string,
  args: Record<string, unknown>,
) {
  if (!convexClient) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return convexClient.query(name as never, args as never);
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
