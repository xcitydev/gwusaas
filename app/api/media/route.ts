import { NextResponse } from "next/server";
import { requirePlan } from "@/lib/route-auth";
import { listMediaGenerations, toMediaItem } from "@/lib/convex-media";

export async function GET(req: Request) {
  const guard = await requirePlan("growth");
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? undefined;

  try {
    const records = await listMediaGenerations(guard.userId, type);
    return NextResponse.json(records.map(toMediaItem));
  } catch (e) {
    console.error("Media list error", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
