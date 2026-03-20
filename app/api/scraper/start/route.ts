import { NextResponse } from "next/server";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { requirePlan } from "@/lib/route-auth";
import { generateJsonWithFallback } from "@/lib/ai";

const bodySchema = z.object({
  clientId: z.string().min(1),
  sourceAccount: z.string().min(2),
  idealLeadDescription: z.string().min(2),
  limit: z.number().int().min(50).max(5000).default(500),
});

type RawFollower = {
  username?: string;
  fullName?: string;
  biography?: string;
  followersCount?: number;
  isPrivate?: boolean;
  isVerified?: boolean;
  url?: string;
};

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

function toChunks<T>(rows: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}

async function qualifyFollowers(
  guardUserId: string,
  idealLeadDescription: string,
  profiles: RawFollower[],
) {
  const chunks = toChunks(profiles, 20);
  const qualified: Array<{
    instagramUsername: string;
    fullName?: string;
    followerCount?: number;
    bio?: string;
    profileUrl?: string;
    isPrivate: boolean;
    isVerified: boolean;
    qualificationScore: number;
    qualificationStatus: "unqualified" | "maybe" | "qualified" | "top_lead";
    qualificationReason: string;
  }> = [];

  for (const [index, chunk] of chunks.entries()) {
    const { data } = await generateJsonWithFallback<
      Array<{ username: string; score: number; status: string; reason: string }>
    >({
      system:
        "You are a lead qualification expert for Instagram outreach. Return ONLY JSON array of {username,score,status,reason}. Status must be one of unqualified, maybe, qualified, top_lead.",
      messages: [
        {
          role: "user",
          content: `Ideal client: ${idealLeadDescription}\n\nProfiles:\n${JSON.stringify(
            chunk.map((p) => ({
              username: p.username,
              bio: p.biography || "",
              followerCount: p.followersCount || 0,
              isPrivate: Boolean(p.isPrivate),
              isVerified: Boolean(p.isVerified),
            })),
          )}`,
        },
      ],
      traceId: `scraper-qualify:${guardUserId}:${Date.now()}:${index}`,
      maxTokens: 1000,
      providerOrder: process.env.PIPELINE_AI_PROVIDER_ORDER || "gemini,anthropic",
    });

    const byUsername = new Map(
      chunk
        .filter((row) => row.username)
        .map((row) => [String(row.username).toLowerCase(), row]),
    );
    for (const row of Array.isArray(data) ? data : []) {
      const username = String(row.username || "").toLowerCase();
      if (!username || !byUsername.has(username)) continue;
      const source = byUsername.get(username)!;
      qualified.push({
        instagramUsername: username,
        fullName: source.fullName,
        followerCount: source.followersCount,
        bio: source.biography,
        profileUrl: source.url,
        isPrivate: Boolean(source.isPrivate),
        isVerified: Boolean(source.isVerified),
        qualificationScore: Number(row.score || 0),
        qualificationStatus: (row.status || "maybe") as
          | "unqualified"
          | "maybe"
          | "qualified"
          | "top_lead",
        qualificationReason: String(row.reason || ""),
      });
    }

    if (index < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return qualified;
}

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("growth");
    if (!guard.ok) return guard.response;
    if (!convex) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_CONVEX_URL is not configured" },
        { status: 500 },
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const token = process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY;
    if (!token) return NextResponse.json({ error: "APIFY_API_TOKEN is missing" }, { status: 500 });

    const actor = "datadoping/instagram-followers-s";
    await convex.mutation("outreachWorkspace:saveScrapeJob" as never, {
      clerkUserId: guard.userId,
      clientId: parsed.data.clientId,
      sourceAccount: parsed.data.sourceAccount,
      status: "running",
      totalFound: 0,
      totalQualified: 0,
    } as never);

    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [parsed.data.sourceAccount.replace(/^@/, "")],
          maxItems: parsed.data.limit,
        }),
      },
    );
    if (!apifyRes.ok) {
      const body = await apifyRes.text();
      throw new Error(`Apify scrape failed: ${body}`);
    }
    const raw = (await apifyRes.json()) as RawFollower[];
    const followers = Array.isArray(raw) ? raw : [];
    const qualified = await qualifyFollowers(
      guard.userId,
      parsed.data.idealLeadDescription,
      followers,
    );

    await convex.mutation("outreachWorkspace:saveScrapedFollowers" as never, {
      clerkUserId: guard.userId,
      clientId: parsed.data.clientId,
      sourceAccount: parsed.data.sourceAccount,
      followers: qualified,
    } as never);

    await convex.mutation("outreachWorkspace:saveScrapeJob" as never, {
      clerkUserId: guard.userId,
      clientId: parsed.data.clientId,
      sourceAccount: parsed.data.sourceAccount,
      status: "complete",
      totalFound: followers.length,
      totalQualified: qualified.filter((q) => q.qualificationScore >= 60).length,
      completedAt: Date.now(),
    } as never);

    return NextResponse.json({ totalFound: followers.length, totalQualified: qualified.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scrape followers" },
      { status: 500 },
    );
  }
}
