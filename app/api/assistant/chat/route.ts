import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  buildFeatureCatalogForPrompt,
  findFeature,
} from "@/lib/assistant/features";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL_ID =
  process.env.ASSISTANT_MODEL?.trim() || "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are the in-app assistant for a SaaS that helps small businesses grow.

Your job is to help users find and use the right feature. Be brief, direct, and friendly.

Available features:
${buildFeatureCatalogForPrompt()}

How to help:
1. When a user wants to do something, identify the matching feature.
2. Call the navigateTo tool with the feature id. This returns the route, a label, and concrete instructions for that feature.
3. After the tool returns, give a 1-2 sentence reply telling them what to do once they land on the page. Use the howTo from the tool result. Do not repeat the route — the UI already shows a "Take me there" button.
4. If no feature matches, ask one clarifying question. Do not invent features that aren't in the catalog.
5. Never make up routes or feature names. Always use navigateTo.
6. Keep replies under 3 sentences unless the user asks for detail.`;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY is not configured", { status: 500 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic(MODEL_ID),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    stopWhen: stepCountIs(4),
    tools: {
      navigateTo: tool({
        description:
          "Look up a feature in the catalog by id or natural-language query, returning the route, label, and how-to instructions. Use this whenever the user wants to do something in the app.",
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              "Either an exact feature id from the catalog (e.g. 'outreach', 'voice-caller') or a short natural-language phrase (e.g. 'find customers', 'phone calls').",
            ),
        }),
        execute: async ({ query }) => {
          const feature = findFeature(query);
          if (!feature) {
            return {
              found: false,
              message: `No feature matched "${query}". Ask the user to be more specific.`,
            };
          }
          return {
            found: true,
            id: feature.id,
            label: feature.label,
            href: feature.href,
            howTo: feature.howTo,
            requiredPlan: feature.requiredPlan,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
