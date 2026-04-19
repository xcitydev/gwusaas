export interface ImageGenOptions {
  model: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  openaiApiKey?: string;
  stabilityApiKey?: string;
  replicateApiKey?: string;
}

export interface ImageGenResult {
  url: string;
  width?: number;
  height?: number;
}

async function generateOpenAI(opts: ImageGenOptions): Promise<ImageGenResult> {
  const size =
    opts.model === "dall-e-3"
      ? opts.width === 1792 ? "1792x1024" : "1024x1024"
      : "512x512";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.openaiApiKey}`,
    },
    body: JSON.stringify({ model: opts.model, prompt: opts.prompt, n: 1, size, response_format: "url" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? `OpenAI ${res.status}`);
  }
  const data = await res.json() as { data: Array<{ url: string }> };
  return { url: data.data[0].url };
}

async function generateStability(opts: ImageGenOptions): Promise<ImageGenResult> {
  const isSD3 = opts.model.startsWith("sd3");
  const endpoint = isSD3
    ? "https://api.stability.ai/v2beta/stable-image/generate/sd3"
    : "https://api.stability.ai/v2beta/stable-image/generate/ultra";

  const formData = new FormData();
  formData.append("prompt", opts.prompt);
  if (opts.negativePrompt) formData.append("negative_prompt", opts.negativePrompt);
  if (opts.width) formData.append("width", String(opts.width));
  if (opts.height) formData.append("height", String(opts.height));
  formData.append("output_format", "png");
  if (isSD3) formData.append("model", opts.model);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.stabilityApiKey}`, Accept: "image/*" },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { errors?: string[] })?.errors?.[0] ?? `Stability ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return { url: `data:image/png;base64,${base64}`, width: opts.width, height: opts.height };
}

async function generateReplicate(opts: ImageGenOptions): Promise<ImageGenResult> {
  const [owner, ...rest] = opts.model.split("/");
  const modelPath = rest.join("/");

  const createRes = await fetch(`https://api.replicate.com/v1/models/${owner}/${modelPath}/predictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Token ${opts.replicateApiKey}` },
    body: JSON.stringify({
      input: {
        prompt: opts.prompt,
        ...(opts.negativePrompt ? { negative_prompt: opts.negativePrompt } : {}),
        ...(opts.width ? { width: opts.width } : {}),
        ...(opts.height ? { height: opts.height } : {}),
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error((err as { detail?: string })?.detail ?? `Replicate ${createRes.status}`);
  }

  const prediction = await createRes.json() as { id: string };

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${opts.replicateApiKey}` },
    });
    const pollData = await pollRes.json() as { status: string; output?: unknown; error?: string };
    if (pollData.status === "succeeded") {
      const output = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
      return { url: output as string, width: opts.width, height: opts.height };
    }
    if (pollData.status === "failed") throw new Error(pollData.error ?? "Replicate generation failed");
  }
  throw new Error("Replicate timeout after 90s");
}

export async function generateImage(opts: ImageGenOptions): Promise<ImageGenResult> {
  const { model } = opts;

  if (model.startsWith("dall-e")) {
    if (!opts.openaiApiKey) throw new Error("OpenAI API key not configured");
    return generateOpenAI(opts);
  }

  if (model.startsWith("sd") || model.startsWith("stable-diffusion")) {
    if (!opts.stabilityApiKey) throw new Error("Stability AI API key not configured");
    return generateStability(opts);
  }

  if (model.includes("/")) {
    if (!opts.replicateApiKey) throw new Error("Replicate API key not configured");
    return generateReplicate(opts);
  }

  throw new Error(`Unknown image model: ${model}`);
}
