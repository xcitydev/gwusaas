import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import OpenAI from "openai";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const requestSchema = z.object({
  uploadIds: z.array(z.string()).min(1, "Add at least one upload"),
  brandName: z.string().trim().optional(),
  niche: z.string().trim().optional(),
  brandVoice: z.string().trim().optional(),
  targetPlatforms: z.array(z.string()).optional(),
  weekStartDate: z.string().optional(),
});

const dayEntrySchema = z.object({
  day: z.number(),
  dayLabel: z.string(),
  uploadId: z.string(),
  platform: z.string(),
  format: z.string(), // "reel" | "carousel" | "story" | "post" | "video"
  hook: z.string(),
  caption: z.string(),
  cta: z.string().optional(),
  bestTime: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
});

const responseSchema = z.object({
  summary: z.string(),
  days: z.array(dayEntrySchema),
});

const buildPrompt = (
  uploads: Array<{ id: string; filename: string; mimeType: string; note?: string }>,
  brand: { brandName?: string; niche?: string; brandVoice?: string; targetPlatforms?: string[] }
) => {
  const uploadList = uploads
    .map(
      (u, i) =>
        `${i + 1}. ID: ${u.id} | filename: "${u.filename}" | type: ${u.mimeType}${
          u.note ? ` | user note: ${u.note}` : ""
        }`
    )
    .join("\n");

  const platforms = brand.targetPlatforms?.length
    ? brand.targetPlatforms.join(", ")
    : "Instagram, TikTok, LinkedIn";

  return `Brand: ${brand.brandName || "Unspecified"}
Niche: ${brand.niche || "Unspecified"}
Voice: ${brand.brandVoice || "Friendly and clear"}
Target platforms: ${platforms}

Available media (these are pieces the USER already has — do NOT invent new ones):
${uploadList}

=== TASK ===
Build a 7-day content posting plan that maps each day to ONE of the user's uploaded media items above. You may reuse the same upload across days if you want to repurpose it (e.g. a reel on day 1, a carousel from a still frame on day 3).

For each day, return:
- day: 1..7
- dayLabel: e.g. "Monday — Awareness"
- uploadId: must match one of the IDs above
- platform: one platform from the target list
- format: "reel" | "carousel" | "story" | "post" | "video"
- hook: a scroll-stopping first line (under 15 words)
- caption: full caption ready to post (2-5 short paragraphs)
- cta: clear call-to-action
- bestTime: suggested posting time
- hashtags: 5-8 relevant hashtags

REQUIRED JSON OUTPUT:
{
  "summary": "2-3 sentences on the strategic angle for the week",
  "days": [
    {
      "day": 1,
      "dayLabel": "string",
      "uploadId": "<one of the available IDs>",
      "platform": "string",
      "format": "string",
      "hook": "string",
      "caption": "string",
      "cta": "string",
      "bestTime": "string",
      "hashtags": ["string"]
    }
  ]
}`;
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

  const parsed = requestSchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Auth token missing" }, { status: 401 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);

  // Fetch upload metadata for prompt context
  const allUploads = (await convex.query(api.contentPlans.listMyUploads, {})) as Array<{
    _id: string;
    filename: string;
    mimeType: string;
    note?: string;
  }>;

  const wanted = new Set(parsed.data.uploadIds);
  const uploadsForPrompt = allUploads
    .filter((u) => wanted.has(u._id))
    .map((u) => ({
      id: u._id,
      filename: u.filename,
      mimeType: u.mimeType,
      note: u.note,
    }));

  if (uploadsForPrompt.length === 0) {
    return NextResponse.json(
      { error: "None of the requested uploads were found" },
      { status: 400 }
    );
  }

  let plan: z.infer<typeof responseSchema>;
  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a content strategist. Map user-supplied media to a 7-day posting plan. Return JSON only — no markdown, no extra commentary.",
        },
        {
          role: "user",
          content: buildPrompt(uploadsForPrompt, parsed.data),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty response from OpenAI");

    const parsedJson = JSON.parse(raw);
    const validated = responseSchema.safeParse(parsedJson);
    if (!validated.success) throw new Error("Invalid plan shape");
    plan = validated.data;
  } catch (err) {
    console.error("content-plan/generate failed:", err);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 502 }
    );
  }

  // Save plan
  const weekStartDate =
    parsed.data.weekStartDate ?? new Date().toISOString().slice(0, 10);

  const saveResult = await convex.mutation(api.contentPlans.savePlan, {
    weekStartDate,
    brandName: parsed.data.brandName,
    niche: parsed.data.niche,
    brandVoice: parsed.data.brandVoice,
    uploadIds: parsed.data.uploadIds as Id<"contentPlanUploads">[],
    plan,
    status: "ready",
  });

  return NextResponse.json({
    planId: saveResult.planId,
    plan,
  });
}
