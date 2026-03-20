import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  prompt: z.string().min(10),
  platform: z.string().min(2),
});

type XaiImageResponse = {
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
};
type XaiImageDataItem = {
  url?: string;
  b64_json?: string;
};

function getCandidateModels(): string[] {
  const envModels = (process.env.XAI_IMAGE_MODELS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const defaults = [
    "grok-imagine-image"
  ];

  const seen = new Set<string>();
  return [...envModels, ...defaults].filter((model) => {
    if (seen.has(model)) return false;
    seen.add(model);
    return true;
  });
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "XAI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const models = getCandidateModels();
    let lastError: { status: number; body: string; model: string } | null = null;
    let first: XaiImageDataItem | undefined;
    let selectedModel: string | null = null;

    for (const model of models) {
      const xaiResponse = await fetch("https://api.x.ai/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: parsed.data.prompt,
          n: 1,
        }),
      });

      const rawText = await xaiResponse.text();
      if (!xaiResponse.ok) {
        console.warn("xAI model attempt failed", {
          status: xaiResponse.status,
          model,
          body: rawText,
        });
        lastError = {
          status: xaiResponse.status,
          body: rawText,
          model,
        };
        continue;
      }

      const payload = JSON.parse(rawText) as XaiImageResponse;
      first = payload.data?.[0];
      selectedModel = model;
      break;
    }

    if (!first) {
      console.error("xAI generation failed for all models", {
        lastError,
      });
      return NextResponse.json(
        {
          error:
            lastError
              ? `xAI generation failed (${lastError.status}) using model ${lastError.model}`
              : "xAI generation failed for all candidate models",
        },
        { status: 500 },
      );
    }

    if (first?.url) {
      return NextResponse.json({ imageUrl: first.url, model: selectedModel });
    }

    if (first?.b64_json) {
      return NextResponse.json({
        imageUrl: `data:image/png;base64,${first.b64_json}`,
        model: selectedModel,
      });
    }

    return NextResponse.json(
      { error: "xAI response did not include an image" },
      { status: 500 },
    );
  } catch (error) {
    console.error("Generate graphic route failed", error);
    return NextResponse.json(
      { error: "Failed to generate graphic" },
      { status: 500 },
    );
  }
}
