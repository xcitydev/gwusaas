export interface VideoGenOptions {
  model: string;
  prompt: string;
  imageUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  runwayApiKey?: string;
  replicateApiKey?: string;
}

export interface VideoGenJob {
  jobId: string;
  provider: string;
}

export interface VideoGenResult {
  url: string;
  thumbnailUrl?: string;
}

async function startRunway(opts: VideoGenOptions): Promise<VideoGenJob> {
  if (!opts.runwayApiKey) throw new Error("Runway API key not configured");

  const body: Record<string, unknown> = {
    model: opts.model,
    promptText: opts.prompt,
    duration: opts.duration ?? 5,
    ratio: "1280:720",
  };
  if (opts.imageUrl) body.promptImage = [{ uri: opts.imageUrl, position: "first" }];

  const res = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.runwayApiKey}`,
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string })?.error ?? `Runway ${res.status}`);
  }
  const data = await res.json() as { id: string };
  return { jobId: data.id, provider: "runway" };
}

async function pollRunway(jobId: string, apiKey: string): Promise<VideoGenResult | null> {
  const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${jobId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, "X-Runway-Version": "2024-11-06" },
  });
  if (!res.ok) return null;
  const data = await res.json() as { status: string; output?: string[]; error?: string };
  if (data.status === "SUCCEEDED") return { url: data.output?.[0] ?? "" };
  if (data.status === "FAILED") throw new Error(data.error ?? "Runway task failed");
  return null;
}

async function startReplicate(opts: VideoGenOptions): Promise<VideoGenJob> {
  if (!opts.replicateApiKey) throw new Error("Replicate API key not configured");

  const [owner, ...rest] = opts.model.split("/");
  const modelPath = rest.join("/");

  const input: Record<string, unknown> = { prompt: opts.prompt };
  if (opts.imageUrl) input.image = opts.imageUrl;
  if (opts.duration) input.duration = opts.duration;
  if (opts.width) input.width = opts.width;
  if (opts.height) input.height = opts.height;

  const res = await fetch(`https://api.replicate.com/v1/models/${owner}/${modelPath}/predictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Token ${opts.replicateApiKey}` },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string })?.detail ?? `Replicate ${res.status}`);
  }
  const data = await res.json() as { id: string };
  return { jobId: data.id, provider: "replicate" };
}

async function pollReplicate(jobId: string, apiKey: string): Promise<VideoGenResult | null> {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
    headers: { Authorization: `Token ${apiKey}` },
  });
  if (!res.ok) return null;
  const data = await res.json() as { status: string; output?: unknown; error?: string };
  if (data.status === "succeeded") {
    const output = Array.isArray(data.output) ? data.output[0] : data.output;
    return { url: output as string };
  }
  if (data.status === "failed") throw new Error(data.error ?? "Replicate video failed");
  return null;
}

export async function startVideoGeneration(opts: VideoGenOptions): Promise<VideoGenJob> {
  if (opts.model.startsWith("gen")) return startRunway(opts);
  if (opts.model.includes("/")) return startReplicate(opts);
  throw new Error(`Unknown video model: ${opts.model}`);
}

export async function pollVideoJob(
  jobId: string,
  provider: string,
  apiKeys: { runwayApiKey?: string; replicateApiKey?: string }
): Promise<VideoGenResult | null> {
  if (provider === "runway") return pollRunway(jobId, apiKeys.runwayApiKey ?? "");
  if (provider === "replicate") return pollReplicate(jobId, apiKeys.replicateApiKey ?? "");
  return null;
}
