import { ConvexHttpClient } from "convex/browser";

type SaveSeoAuditArgs = {
  userId: string;
  url: string;
  result: unknown;
};

type SaveKeywordArgs = {
  userId: string;
  topic: string;
  keywords: unknown[];
};

type SaveAiGenerationArgs = {
  userId: string;
  type: string;
  input: unknown;
  output: unknown;
};

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;

async function runMutation(name: string, args: Record<string, unknown>) {
  if (!convexClient) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return convexClient.mutation(name as never, args as never);
}

export async function saveSeoAuditHistory(args: SaveSeoAuditArgs) {
  return runMutation("aiHistory:saveSeoAudit", args as Record<string, unknown>);
}

export async function saveKeywordHistory(args: SaveKeywordArgs) {
  return runMutation(
    "aiHistory:saveKeywordResearch",
    args as Record<string, unknown>,
  );
}

export async function saveAiGenerationHistory(args: SaveAiGenerationArgs) {
  return runMutation(
    "aiHistory:saveAiGeneration",
    args as Record<string, unknown>,
  );
}
