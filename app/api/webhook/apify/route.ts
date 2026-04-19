import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Apify Webhook Receiver
 * Expected payload (customized via Apify 'on finish' webhook):
 * {
 *   "clerkUserId": "user_...",
 *   "clientId": "...",
 *   "sourceAccount": "@username",
 *   "results": [...]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Apify Webhook Received:", body);

    const { clerkUserId, clientId, sourceAccount, results } = body;

    if (!clerkUserId || !clientId || !results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: "Invalid payload. Missing required fields: clerkUserId, clientId, results" },
        { status: 400 }
      );
    }

    // Map Apify results to Convex schema
    const formattedFollowers = results.slice(0, 100).map((r: any) => ({
      instagramUsername: r.username || r.instagramUsername || "unknown",
      fullName: r.fullName || r.name || "",
      followerCount: r.followersCount || r.followerCount || 0,
      bio: r.biography || r.bio || "",
      profileUrl: r.url || r.profileUrl || "",
      isPrivate: !!r.isPrivate,
      isVerified: !!r.isVerified,
      qualificationScore: calculateScore(r),
      qualificationStatus: determineStatus(r),
      qualificationReason: "Automatically qualified via Apify scrape",
    }));

    // Save to Convex
    await convex.mutation(api.outreachWorkspace.saveScrapedFollowers, {
      clerkUserId,
      clientId,
      sourceAccount: sourceAccount || "Apify Import",
      followers: formattedFollowers,
    });

    // Update job status if job ID provided
    if (body.runId) {
       // Logic to update scrapeJobs table could go here
    }

    return NextResponse.json({ success: true, count: formattedFollowers.length });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculateScore(r: any) {
  let score = 50; // Base score
  if (r.followersCount > 1000) score += 10;
  if (r.isVerified) score += 20;
  if (r.biography && r.biography.length > 20) score += 10;
  return Math.min(score, 100);
}

function determineStatus(r: any) {
  if (r.isVerified) return "qualified";
  if (r.followersCount > 500) return "maybe";
  return "unqualified";
}
