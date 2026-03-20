import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlan } from "@/lib/route-auth";
import { generateJsonWithFallback } from "@/lib/ai";

const bodySchema = z.object({
  idealLeadDescription: z.string().min(2),
  profiles: z.array(
    z.object({
      username: z.string(),
      bio: z.string().optional(),
      followerCount: z.number().optional(),
      isPrivate: z.boolean().optional(),
      isVerified: z.boolean().optional(),
    }),
  ),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("growth");
    if (!guard.ok) return guard.response;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { data } = await generateJsonWithFallback<
      Array<{ username: string; score: number; status: string; reason: string }>
    >({
      system:
        "You are a lead qualification expert. Return JSON array with username, score(0-100), status(unqualified|maybe|qualified|top_lead), reason.",
      messages: [
        {
          role: "user",
          content: `Ideal client: ${parsed.data.idealLeadDescription}\nProfiles: ${JSON.stringify(parsed.data.profiles)}`,
        },
      ],
      traceId: `scraper-qualify:${guard.userId}:${Date.now()}`,
      maxTokens: 1000,
      providerOrder: process.env.PIPELINE_AI_PROVIDER_ORDER || "gemini,anthropic",
    });

    return NextResponse.json({ results: Array.isArray(data) ? data : [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to qualify followers" },
      { status: 500 },
    );
  }
}
