import { v } from "convex/values";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Webhook endpoint for Apify to send IG metrics
 * Expected payload:
 * {
 *   secret: string,
 *   projectId: string,
 *   date: string (YYYY-MM-DD),
 *   followers: number,
 *   posts: number,
 *   likes: number,
 *   comments: number,
 *   reach?: number,
 *   profileVisits?: number,
 *   websiteClicks?: number,
 *   dmLeads?: number
 * }
 */
export const apifyIngest = httpAction(async (ctx, request) => {
  // Only allow POST
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    
    // Validate secret
    const expectedSecret = process.env.WEBHOOK_APIFY_SECRET;
    if (!expectedSecret || body.secret !== expectedSecret) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Validate required fields
    if (!body.projectId || !body.date || typeof body.followers !== "number") {
      return new Response("Invalid payload", { status: 400 });
    }

    // Call the internal mutation to upsert metrics
    await ctx.runMutation(internal.metrics.upsertDailyInternal, {
      projectId: body.projectId as any,
      date: body.date,
      followers: body.followers,
      posts: body.posts || 0,
      likes: body.likes || 0,
      comments: body.comments || 0,
      reach: body.reach,
      profileVisits: body.profileVisits,
      websiteClicks: body.websiteClicks,
      dmLeads: body.dmLeads,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

