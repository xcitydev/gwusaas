import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = convexUrl ? new ConvexHttpClient(convexUrl) : null;

function getClient() {
  if (!client) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  return client;
}

type CreateArgs = {
  userId: string;
  type: string;
  provider: string;
  model: string;
  prompt: string;
  negativePrompt?: string;
  status: string;
  resultUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: unknown;
  error?: string;
};

type UpdateArgs = {
  id: string;
  status?: string;
  resultUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  metadata?: unknown;
};

export type MediaRecord = {
  _id: string;
  userId: string;
  type: string;
  provider: string;
  model: string;
  prompt: string;
  status: string;
  resultUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: { jobId?: string; provider?: string };
  error?: string;
  createdAt: number;
};

export function toMediaItem(r: MediaRecord) {
  return {
    id: r._id,
    type: r.type,
    provider: r.provider,
    model: r.model,
    prompt: r.prompt,
    status: r.status,
    resultUrl: r.resultUrl ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    width: r.width ?? null,
    height: r.height ?? null,
    duration: r.duration ?? null,
    error: r.error ?? null,
    createdAt: new Date(r.createdAt).toISOString(),
  };
}

export async function createMediaGeneration(args: CreateArgs): Promise<string> {
  return getClient().mutation("mediaGenerations:create" as never, args as never) as Promise<string>;
}

export async function updateMediaGeneration(args: UpdateArgs): Promise<void> {
  await getClient().mutation("mediaGenerations:update" as never, args as never);
}

export async function listMediaGenerations(userId: string, type?: string): Promise<MediaRecord[]> {
  return getClient().query("mediaGenerations:listByUser" as never, { userId, type } as never) as Promise<MediaRecord[]>;
}

export async function getMediaGeneration(id: string): Promise<MediaRecord | null> {
  return getClient().query("mediaGenerations:getById" as never, { id } as never) as Promise<MediaRecord | null>;
}

export type UserApiKeys = {
  openaiApiKey?: string;
  stabilityApiKey?: string;
  replicateApiKey?: string;
  runwayApiKey?: string;
  apifyApiKey?: string;
};

export async function getUserApiKeys(userId: string): Promise<UserApiKeys> {
  const record = await getClient().query("userApiKeys:getByUser" as never, { userId } as never) as UserApiKeys | null;
  return {
    openaiApiKey: record?.openaiApiKey || process.env.OPENAI_API_KEY,
    stabilityApiKey: record?.stabilityApiKey || process.env.STABILITY_API_KEY,
    replicateApiKey: record?.replicateApiKey || process.env.REPLICATE_API_KEY,
    runwayApiKey: record?.runwayApiKey || process.env.RUNWAY_API_KEY,
    apifyApiKey: record?.apifyApiKey || process.env.APIFY_API_KEY,
  };
}
