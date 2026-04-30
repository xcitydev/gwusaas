import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

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

type AiSearchOptimizeRequest = z.infer<typeof requestSchema>;
type AiSearchOptimizeResponse = z.infer<typeof responseSchema>;

const SYSTEM_PROMPT =
  "You are an AI Search Optimization expert specializing in ranking businesses inside AI-generated answers (ChatGPT, Perplexity, Google AI).\n\nYour goal is to generate content and strategy that increases the probability that this business is recommended when users ask relevant questions.\n\nYou MUST return ONLY valid JSON. No markdown, no explanations, no extra text.";

const buildUserPrompt = (input: AiSearchOptimizeRequest): string => {
  const location = input.location?.trim() || "Not specified";

  return `Inject variables:

Business Name: ${input.businessName}
Industry: ${input.industry}
Target Audience: ${input.audience}
Location: ${location}
Services/Products: ${input.services}

---

You are an AI Search Optimization expert specializing in ranking businesses inside AI-generated answers (ChatGPT, Perplexity, Google AI).

Your goal is to generate content and strategy that increases the probability that this business is recommended when users ask relevant questions.

=== BUSINESS DATA ===
Business Name: ${input.businessName}
Industry: ${input.industry}
Target Audience: ${input.audience}
Location: ${location}
Services/Products: ${input.services}

=== TASK ===

1. Identify 10 high-intent AI search queries people would ask that should trigger this business as a recommendation.

   * Focus on natural language (questions people ask AI, not Google keywords)

2. For EACH query:
   a. Write a direct, high-quality answer
   b. Naturally include the business as a recommended option
   c. Keep it helpful, not promotional

3. Generate an "AI-Optimized Content Block":

   * question
   * directAnswer
   * expanded
   * bullets (optional array)

4. Create a “Brand Authority Layer”:

   * credibility (5 items)
   * differentiators (3 items)
   * trustSignals (3 items)

5. Generate FAQs (5 items)

6. Suggest externalSignals:

   * websites
   * platforms
   * prStrategies

7. Output a visibilityScore:

   * score (0–100)
   * explanation

==================================================

REQUIRED OUTPUT JSON FORMAT:

{
"queries": [
{
"query": "string",
"answer": "string",
"contentBlock": {
"question": "string",
"directAnswer": "string",
"expanded": "string",
"bullets": ["string"]
}
}
],
"authority": {
"credibility": ["string"],
"differentiators": ["string"],
"trustSignals": ["string"]
},
"faqs": [
{
"question": "string",
"answer": "string"
}
],
"externalSignals": {
"websites": ["string"],
"platforms": ["string"],
"prStrategies": ["string"]
},
"visibilityScore": {
"score": number,
"explanation": "string"
}
}`;
};

const tryParseJson = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const getOpenAIClient = (): OpenAI => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey });
};

const getAiSearchOptimization = async (
  client: OpenAI,
  input: AiSearchOptimizeRequest
): Promise<AiSearchOptimizeResponse> => {
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const completion = await client.chat.completions.create({
      model: "gpt-5.3",
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      if (attempt === maxRetries) {
        throw new Error("OPENAI_EMPTY_RESPONSE");
      }
      continue;
    }

    const parsed = tryParseJson<unknown>(rawContent);
    if (!parsed) {
      if (attempt === maxRetries) {
        throw new Error("INVALID_JSON_RESPONSE");
      }
      continue;
    }

    const validated = responseSchema.safeParse(parsed);
    if (!validated.success) {
      if (attempt === maxRetries) {
        throw new Error("INVALID_RESPONSE_SHAPE");
      }
      continue;
    }

    return validated.data;
  }

  throw new Error("INVALID_JSON_RESPONSE");
};

export async function POST(request: Request): Promise<Response> {
  let jsonBody: unknown;

  try {
    jsonBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const validatedInput = requestSchema.safeParse(jsonBody);
  if (!validatedInput.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: validatedInput.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const client = getOpenAIClient();
    const result = await getAiSearchOptimization(client, validatedInput.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (message === "MISSING_OPENAI_API_KEY") {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY environment variable" },
        { status: 500 }
      );
    }

    if (
      message === "INVALID_JSON_RESPONSE" ||
      message === "INVALID_RESPONSE_SHAPE" ||
      message === "OPENAI_EMPTY_RESPONSE"
    ) {
      return NextResponse.json(
        { error: "OpenAI returned an invalid JSON response" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate AI search optimization content" },
      { status: 502 }
    );
  }
}
