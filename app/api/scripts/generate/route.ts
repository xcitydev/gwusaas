import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlan } from "@/lib/route-auth";
import { generateJsonWithFallback } from "@/lib/ai";

const bodySchema = z.object({
  what: z.string().min(2),
  who: z.string().min(2),
  goal: z.string().min(2),
  tone: z.string().min(2),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("starter");
    if (!guard.ok) return guard.response;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { data } = await generateJsonWithFallback<{ scripts: Array<{ script: string }> }>({
      system:
        "You write short DM scripts for lead outreach. Return only JSON with { scripts: [{script:string},{script:string},{script:string}] }.",
      messages: [
        {
          role: "user",
          content: `Client business: ${parsed.data.what}
Target audience: ${parsed.data.who}
Goal: ${parsed.data.goal}
Tone: ${parsed.data.tone}

Generate 3 script variations.`,
        },
      ],
      traceId: `script-generator:${guard.userId}:${Date.now()}`,
      maxTokens: 1200,
    });

    return NextResponse.json({ scripts: data.scripts || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate script" },
      { status: 500 },
    );
  }
}
