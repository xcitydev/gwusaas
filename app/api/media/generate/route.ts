import { NextResponse } from "next/server";
import { requirePlan } from "@/lib/route-auth";
import { generateImage } from "@/lib/providers/generate-image";
import { startVideoGeneration } from "@/lib/providers/generate-video";
import { createMediaGeneration, toMediaItem, getUserApiKeys } from "@/lib/convex-media";

export async function POST(req: Request) {
  const guard = await requirePlan("growth");
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json() as {
      type: string; provider: string; model: string; prompt: string;
      negativePrompt?: string; width?: number; height?: number;
      imageUrl?: string; duration?: number;
    };

    const { type, provider, model, prompt, negativePrompt, width, height, imageUrl, duration } = body;

    if (!type || !model || !prompt) {
      return NextResponse.json({ error: "type, model, and prompt are required" }, { status: 400 });
    }

    const apiKeys = await getUserApiKeys(guard.userId);

    if (type === "image") {
      const result = await generateImage({ model, prompt, negativePrompt, width, height, ...apiKeys });
      const id = await createMediaGeneration({
        userId: guard.userId,
        type: "image",
        provider,
        model,
        prompt,
        negativePrompt,
        status: "completed",
        resultUrl: result.url,
        width: result.width,
        height: result.height,
      });
      return NextResponse.json(toMediaItem({
        _id: id, userId: guard.userId, type: "image", provider, model, prompt,
        status: "completed", resultUrl: result.url, width: result.width, height: result.height,
        createdAt: Date.now(),
      }));
    }

    if (type === "video") {
      const job = await startVideoGeneration({ model, prompt, imageUrl, duration, ...apiKeys });
      const id = await createMediaGeneration({
        userId: guard.userId,
        type: "video",
        provider,
        model,
        prompt,
        duration,
        status: "processing",
        metadata: { jobId: job.jobId, provider: job.provider },
      });
      return NextResponse.json(toMediaItem({
        _id: id, userId: guard.userId, type: "video", provider, model, prompt,
        duration, status: "processing", metadata: { jobId: job.jobId, provider: job.provider },
        createdAt: Date.now(),
      }));
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) {
    console.error("Media generate error", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
