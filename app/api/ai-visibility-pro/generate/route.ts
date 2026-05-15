import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import OpenAI from "openai";
import { z } from "zod";
import { api } from "@/convex/_generated/api";

const requestSchema = z.object({
  businessName: z.string().trim().min(1, "businessName is required"),
  industry: z.string().trim().min(1, "industry is required"),
  audience: z.string().trim().min(1, "audience is required"),
  location: z.string().trim().optional(),
  services: z.string().trim().min(1, "services is required"),
});

const responseSchema = z.object({
  queries: z.array(
    z.object({
      query: z.string(),
      answer: z.string(),
      contentBlock: z.object({
        question: z.string(),
        directAnswer: z.string(),
        expanded: z.string(),
        bullets: z.array(z.string()).optional(),
      }),
    })
  ),
  authority: z.object({
    credibility: z.array(z.string()),
    differentiators: z.array(z.string()),
    trustSignals: z.array(z.string()),
  }),
  faqs: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    })
  ),
  externalSignals: z.object({
    websites: z.array(z.string()),
    platforms: z.array(z.string()),
    prStrategies: z.array(z.string()),
  }),
  visibilityScore: z.object({
    score: z.number(),
    explanation: z.string(),
  }),
});

type AiVisibilityProRequest = z.infer<typeof requestSchema>;
type AiVisibilityProResponse = z.infer<typeof responseSchema>;

const SYSTEM_PROMPT =
  "You are an AI Search Optimization expert specializing in ranking businesses inside AI-generated answers (ChatGPT, Perplexity, Google AI).\n\nYour goal is to generate content and strategy that increases the probability that this business is recommended when users ask relevant questions.\n\nYou MUST return ONLY valid JSON. No markdown, no explanations, no extra text.";

const buildUserPrompt = (input: AiVisibilityProRequest): string => {
  const location = input.location?.trim() || "Not specified";
  return `Business Name: ${input.businessName}
Industry: ${input.industry}
Target Audience: ${input.audience}
Location: ${location}
Services/Products: ${input.services}

=== TASK ===

1. Identify 10 high-intent AI search queries people would ask that should trigger this business as a recommendation. Focus on natural language.
2. For EACH query: write a direct, high-quality answer that naturally includes the business as a recommended option. Helpful, not promotional.
3. Generate an "AI-Optimized Content Block" with: question, directAnswer, expanded, bullets (optional).
4. Create a "Brand Authority Layer": credibility (5 items), differentiators (3 items), trustSignals (3 items).
5. Generate FAQs (5 items).
6. Suggest externalSignals: websites, platforms, prStrategies.
7. Output a visibilityScore: score (0-100), explanation.

REQUIRED OUTPUT JSON FORMAT:
{
  "queries": [
    {
      "query": "string",
      "answer": "string",
      "contentBlock": { "question": "string", "directAnswer": "string", "expanded": "string", "bullets": ["string"] }
    }
  ],
  "authority": { "credibility": ["string"], "differentiators": ["string"], "trustSignals": ["string"] },
  "faqs": [{ "question": "string", "answer": "string" }],
  "externalSignals": { "websites": ["string"], "platforms": ["string"], "prStrategies": ["string"] },
  "visibilityScore": { "score": 0, "explanation": "string" }
}`;
};

const tryParseJson = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const generateReport = async (
  client: OpenAI,
  input: AiVisibilityProRequest
): Promise<AiVisibilityProResponse> => {
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      if (attempt === maxRetries) throw new Error("OPENAI_EMPTY_RESPONSE");
      continue;
    }

    const parsed = tryParseJson<unknown>(rawContent);
    if (!parsed) {
      if (attempt === maxRetries) throw new Error("INVALID_JSON_RESPONSE");
      continue;
    }

    const validated = responseSchema.safeParse(parsed);
    if (!validated.success) {
      if (attempt === maxRetries) throw new Error("INVALID_RESPONSE_SHAPE");
      continue;
    }

    return validated.data;
  }

  throw new Error("INVALID_JSON_RESPONSE");
};

export async function POST(req: Request) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validatedInput = requestSchema.safeParse(jsonBody);
  if (!validatedInput.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: validatedInput.error.flatten() },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY environment variable" },
      { status: 500 }
    );
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Auth token missing" }, { status: 401 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);

  const creditsBefore = await convex.query(api.aiVisibilityPro.getMyCredits, {});
  if (!creditsBefore || creditsBefore.credits <= 0) {
    return NextResponse.json(
      { error: "INSUFFICIENT_CREDITS", credits: creditsBefore?.credits ?? 0 },
      { status: 402 }
    );
  }

  let result: AiVisibilityProResponse;
  try {
    const openai = new OpenAI({ apiKey });
    result = await generateReport(openai, validatedInput.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (
      message === "INVALID_JSON_RESPONSE" ||
      message === "INVALID_RESPONSE_SHAPE" ||
      message === "OPENAI_EMPTY_RESPONSE"
    ) {
      return NextResponse.json(
        { error: "OpenAI returned an invalid response" },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 502 }
    );
  }

  try {
    const saveResult = await convex.mutation(
      api.aiVisibilityPro.consumeCreditAndCreateReport,
      {
        businessName: validatedInput.data.businessName,
        industry: validatedInput.data.industry,
        audience: validatedInput.data.audience,
        location: validatedInput.data.location,
        services: validatedInput.data.services,
        result,
      }
    );

    return NextResponse.json(
      {
        reportId: saveResult.reportId,
        creditsRemaining: saveResult.creditsRemaining,
        result,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (message.includes("INSUFFICIENT_CREDITS")) {
      return NextResponse.json(
        { error: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: "Failed to save report" },
      { status: 500 }
    );
  }
}
