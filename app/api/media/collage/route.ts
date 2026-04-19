import { NextResponse } from "next/server";
import { requirePlan } from "@/lib/route-auth";
import { createCollage, addCaptionToImage } from "@/lib/collage";
import { createMediaGeneration } from "@/lib/convex-media";

export async function POST(req: Request) {
  const guard = await requirePlan("growth");
  if (!guard.ok) return guard.response;

  try {
    const { images, columns = 3, caption } = await req.json() as {
      images: string[]; columns?: number; caption?: string;
    };

    if (!images?.length) return NextResponse.json({ error: "images is required" }, { status: 400 });

    let buf = await createCollage({ images, columns });
    if (caption) buf = await addCaptionToImage(buf, caption);

    const base64 = buf.toString("base64");
    const url = `data:image/jpeg;base64,${base64}`;

    const id = await createMediaGeneration({
      userId: guard.userId,
      type: "image",
      provider: "collage",
      model: "sharp-collage",
      prompt: caption ? `Collage: ${caption}` : "Image collage",
      status: "completed",
      resultUrl: url,
    });

    return NextResponse.json({ id, url });
  } catch (e) {
    console.error("Collage error", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
