import { NextResponse } from "next/server";
import { requirePlan } from "@/lib/route-auth";
import { searchImages } from "@/lib/apify-images";
import { getUserApiKeys } from "@/lib/convex-media";

export async function POST(req: Request) {
  const guard = await requirePlan("growth");
  if (!guard.ok) return guard.response;

  try {
    const { query, maxResults = 12 } = await req.json() as { query: string; maxResults?: number };
    if (!query?.trim()) return NextResponse.json({ error: "query is required" }, { status: 400 });

    const { apifyApiKey: apiKey } = await getUserApiKeys(guard.userId);
    if (!apiKey) return NextResponse.json({ error: "Apify API key not configured — add it in Settings → Media Studio" }, { status: 500 });

    const images = await searchImages(query, maxResults, apiKey);
    return NextResponse.json({ images });
  } catch (e) {
    console.error("Media search error", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
