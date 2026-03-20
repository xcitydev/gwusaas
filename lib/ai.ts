import Anthropic from "@anthropic-ai/sdk";
import { type MessageParam } from "@anthropic-ai/sdk/resources";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type AiProvider = "anthropic" | "openai" | "gemini";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const ANTHROPIC_FALLBACK_MODELS = [
  "claude-3-5-sonnet-latest",
  "claude-sonnet-4-20250514",
];

const OPENAI_FALLBACK_MODELS = ["gpt-4o-mini", "gpt-4o"];
const GEMINI_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];
let cachedGeminiModels: string[] | null = null;

function parseProviderOrder(raw: string): AiProvider[] {
  const parsed = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item): item is AiProvider =>
      item === "anthropic" || item === "openai" || item === "gemini");

  return parsed;
}

function getProviderOrder(override?: string): AiProvider[] {
  const parsed = parseProviderOrder(
    override || process.env.AI_PROVIDER_ORDER || "anthropic,openai,gemini",
  );
  if (parsed.length > 0) return parsed;
  return ["anthropic", "openai", "gemini"];
}

function getModelsFromEnvOrFallback(envName: string, fallback: string[]): string[] {
  const envValues = (process.env[envName] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  return [...envValues, ...fallback].filter((model) => {
    if (seen.has(model)) return false;
    seen.add(model);
    return true;
  });
}

function messageContentToText(content: MessageParam["content"]): string {
  if (typeof content === "string") return content;
  return content
    .map((block) => ("text" in block ? block.text : ""))
    .join("\n")
    .trim();
}

function buildUnifiedPrompt(system: string, messages: MessageParam[]): string {
  const parts = [`System:\n${system}\n`];
  for (const message of messages) {
    parts.push(`${message.role.toUpperCase()}:\n${messageContentToText(message.content)}\n`);
  }
  return parts.join("\n");
}

function stripCodeFences(rawText: string): string {
  return rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function parseJsonFromText<T>(rawText: string): T {
  const sanitized = stripCodeFences(rawText);
  try {
    return JSON.parse(sanitized) as T;
  } catch {
    const firstCurly = sanitized.indexOf("{");
    const lastCurly = sanitized.lastIndexOf("}");
    if (firstCurly !== -1 && lastCurly > firstCurly) {
      const candidate = sanitized.slice(firstCurly, lastCurly + 1);
      return JSON.parse(candidate) as T;
    }
    const firstBracket = sanitized.indexOf("[");
    const lastBracket = sanitized.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const candidate = sanitized.slice(firstBracket, lastBracket + 1);
      return JSON.parse(candidate) as T;
    }
    throw new Error("Model response did not contain parseable JSON");
  }
}

function isModelNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const withStatus = error as { status?: number; message?: string };
  if (withStatus.status === 404) return true;
  return (
    typeof withStatus.message === "string" &&
    withStatus.message.toLowerCase().includes("model not found")
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const withMessage = error as { message?: string };
    if (typeof withMessage.message === "string") return withMessage.message;
  }
  return "Unknown error";
}

function sanitizeGeminiModelName(name: string) {
  return name.replace(/^models\//, "").trim();
}

async function listAvailableGeminiModels() {
  if (!geminiClient) return [];
  if (cachedGeminiModels) return cachedGeminiModels;

  try {
    const result = await geminiClient.listModels();
    const models = Array.isArray(result?.models) ? result.models : [];
    const names = models
      .filter((model) =>
        Array.isArray(model?.supportedGenerationMethods) &&
        model.supportedGenerationMethods.includes("generateContent"),
      )
      .map((model) => sanitizeGeminiModelName(String(model?.name || "")))
      .filter(Boolean);
    cachedGeminiModels = names;
    return names;
  } catch (error) {
    console.warn("[AI] unable to list Gemini models, using static fallback", {
      message: errorMessage(error),
    });
    return [];
  }
}

function scoreGeminiModel(model: string) {
  const normalized = model.toLowerCase();
  if (normalized.includes("2.5") && normalized.includes("flash") && normalized.includes("lite")) return 95;
  if (normalized.includes("2.5") && normalized.includes("flash")) return 100;
  if (normalized.includes("2.0") && normalized.includes("flash") && normalized.includes("lite")) return 85;
  if (normalized.includes("2.0") && normalized.includes("flash")) return 90;
  if (normalized.includes("1.5") && normalized.includes("flash")) return 75;
  if (normalized.includes("flash")) return 70;
  if (normalized.includes("pro")) return 50;
  return 10;
}

async function getGeminiModelsFromEnvOrFallback() {
  const configured = getModelsFromEnvOrFallback("GEMINI_MODEL", GEMINI_FALLBACK_MODELS);
  const discovered = await listAvailableGeminiModels();
  const sortedDiscovered = [...discovered].sort(
    (a, b) => scoreGeminiModel(b) - scoreGeminiModel(a),
  );
  const seen = new Set<string>();
  return [...configured, ...sortedDiscovered].filter((model) => {
    const normalized = sanitizeGeminiModelName(model);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

async function generateWithAnthropic(
  system: string,
  messages: MessageParam[],
  maxTokens: number,
): Promise<{ text: string; model: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const models = getModelsFromEnvOrFallback("ANTHROPIC_MODEL", ANTHROPIC_FALLBACK_MODELS);
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages,
      });
      const text = response.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("");
      return { text, model };
    } catch (error) {
      lastError = error;
      if (!isModelNotFoundError(error)) throw error;
    }
  }

  throw lastError ?? new Error("No compatible Anthropic model available");
}

async function generateWithOpenAI(
  system: string,
  messages: MessageParam[],
  maxTokens: number,
): Promise<{ text: string; model: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const models = getModelsFromEnvOrFallback("OPENAI_MODEL", OPENAI_FALLBACK_MODELS);
  let lastError: unknown;
  const userText = messages.map((message) => messageContentToText(message.content)).join("\n\n");

  for (const model of models) {
    try {
      const response = await openai.chat.completions.create({
        model,
        temperature: 0.3,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `${userText}\n\nReturn valid JSON only.` },
        ],
      });
      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error("OpenAI returned empty content");
      return { text, model };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No compatible OpenAI model available");
}

async function generateWithGemini(
  system: string,
  messages: MessageParam[],
  maxTokens: number,
): Promise<{ text: string; model: string }> {
  if (!geminiClient) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const models = await getGeminiModelsFromEnvOrFallback();
  const prompt = `${buildUnifiedPrompt(system, messages)}\n\nReturn valid JSON only.`;
  let lastError: unknown;

  for (const model of models) {
    try {
      const genModel = geminiClient.getGenerativeModel({ model });
      const response = await genModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
        },
      });
      const text = response.response.text();
      if (!text) throw new Error("Gemini returned empty content");
      return { text, model };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No compatible Gemini model available");
}

export async function generateJsonWithFallback<T>({
  system,
  messages,
  traceId,
  maxTokens = 2000,
  providerOrder,
}: {
  system: string;
  messages: MessageParam[];
  traceId?: string;
  maxTokens?: number;
  providerOrder?: string | AiProvider[];
}): Promise<{ data: T; provider: AiProvider; model: string; rawText: string }> {
  const providers = Array.isArray(providerOrder)
    ? providerOrder
    : getProviderOrder(providerOrder);
  const errors: Array<{ provider: AiProvider; message: string }> = [];

  for (const provider of providers) {
    try {
      const result =
        provider === "anthropic"
          ? await generateWithAnthropic(system, messages, maxTokens)
          : provider === "openai"
            ? await generateWithOpenAI(system, messages, maxTokens)
            : await generateWithGemini(system, messages, maxTokens);

      const data = parseJsonFromText<T>(result.text);
      console.info("[AI] generation success", {
        traceId,
        provider,
        model: result.model,
      });
      return { data, provider, model: result.model, rawText: result.text };
    } catch (error) {
      const msg = errorMessage(error);
      errors.push({ provider, message: msg });
      console.error("[AI] provider failure", {
        traceId,
        provider,
        message: msg,
      });
    }
  }

  const joined = errors.map((entry) => `${entry.provider}: ${entry.message}`).join(" | ");
  throw new Error(`All AI providers failed. ${joined}`);
}

async function createAnthropicStream({
  system,
  messages,
  maxTokens,
}: {
  system: string;
  messages: MessageParam[];
  maxTokens: number;
}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const models = getModelsFromEnvOrFallback("ANTHROPIC_MODEL", ANTHROPIC_FALLBACK_MODELS);
  let lastError: unknown;

  for (const model of models) {
    try {
      console.info("[AI] trying anthropic stream model", { model });
      return await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages,
        stream: true,
      });
    } catch (error) {
      lastError = error;
      if (!isModelNotFoundError(error)) throw error;
    }
  }

  throw lastError ?? new Error("No compatible Anthropic stream model available");
}

export async function streamClaudeJson({
  system,
  messages,
  onComplete,
}: {
  system: string;
  messages: MessageParam[];
  onComplete?: (fullText: string) => Promise<void>;
}): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  let stream:
    | Awaited<ReturnType<typeof createAnthropicStream>>
    | null = null;
  let fallbackText: string | null = null;

  try {
    stream = await createAnthropicStream({
      system,
      messages,
      maxTokens: 4096,
    });
  } catch (error) {
    console.error("[AI] anthropic stream failed, using provider fallback", {
      message: errorMessage(error),
    });
    const { data, provider, model } = await generateJsonWithFallback<unknown>({
      system,
      messages,
      traceId: `stream-fallback:${Date.now()}`,
    });
    console.info("[AI] stream fallback provider success", { provider, model });
    fallbackText = JSON.stringify(data, null, 2);
  }

  if (fallbackText !== null) {
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "token", token: fallbackText })}\n\n`,
            ),
          );
          if (onComplete) {
            await onComplete(fallbackText);
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done", text: fallbackText })}\n\n`,
            ),
          );
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: errorMessage(error),
              })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });
  }
  const activeStream = stream;
  if (!activeStream) {
    throw new Error("Streaming provider unavailable");
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let fullText = "";
        for await (const event of activeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const token = event.delta.text;
            fullText += token;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "token", token })}\n\n`,
              ),
            );
          }
        }

        if (onComplete) {
          await onComplete(fullText);
        }
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", text: fullText })}\n\n`,
          ),
        );
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: errorMessage(error),
            })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });
}

export function sseResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

export function parseClaudeJson<T>(rawText: string): T {
  return parseJsonFromText<T>(rawText);
}

export function getAiErrorMessage(error: unknown): string {
  return errorMessage(error);
}
