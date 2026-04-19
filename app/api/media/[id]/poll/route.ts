import { NextResponse } from "next/server";
import { requirePlan } from "@/lib/route-auth";
import { pollVideoJob } from "@/lib/providers/generate-video";
import { getMediaGeneration, updateMediaGeneration, toMediaItem, getUserApiKeys } from "@/lib/convex-media";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePlan("growth");
  if (!guard.ok) return guard.response;

  const { id } = await params;

  try {
    const record = await getMediaGeneration(id);
    if (!record || record.userId !== guard.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (record.status !== "processing") return NextResponse.json(toMediaItem(record));

    const metadata = record.metadata as { jobId?: string; provider?: string } | undefined;
    if (!metadata?.jobId || !metadata?.provider) {
      return NextResponse.json(toMediaItem(record));
    }

    const apiKeys = await getUserApiKeys(guard.userId);

    const result = await pollVideoJob(metadata.jobId, metadata.provider, apiKeys);

    if (result) {
      await updateMediaGeneration({ id, status: "completed", resultUrl: result.url, thumbnailUrl: result.thumbnailUrl });
      const updated = { ...record, status: "completed", resultUrl: result.url, thumbnailUrl: result.thumbnailUrl };
      return NextResponse.json(toMediaItem(updated));
    }

    return NextResponse.json(toMediaItem(record));
  } catch (e) {
    console.error("Media poll error", e);
    await updateMediaGeneration({ id, status: "failed", error: String(e) }).catch(() => {});
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
