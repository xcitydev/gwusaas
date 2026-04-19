import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type KeyRecord = {
  openaiApiKey?: string;
  stabilityApiKey?: string;
  replicateApiKey?: string;
  runwayApiKey?: string;
  apifyApiKey?: string;
};

const KEY_FIELDS: (keyof KeyRecord)[] = [
  "openaiApiKey",
  "stabilityApiKey",
  "replicateApiKey",
  "runwayApiKey",
  "apifyApiKey",
];

function preview(key: string | undefined): string | null {
  if (!key) return null;
  return key.slice(0, 8) + "•••";
}

export async function GET() {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const record: KeyRecord | null = await client.query(
    "userApiKeys:getByUser" as never,
    { userId } as never
  );

  const result: Record<string, { hasKey: boolean; preview: string | null }> = {};
  for (const field of KEY_FIELDS) {
    result[field] = { hasKey: !!(record?.[field]), preview: preview(record?.[field]) };
  }

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const { userId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Partial<KeyRecord>;
  const patch: Partial<KeyRecord> & { userId: string } = { userId };

  for (const field of KEY_FIELDS) {
    if (typeof body[field] === "string" && body[field]) {
      patch[field] = body[field];
    }
  }

  await client.mutation("userApiKeys:upsert" as never, patch as never);

  return NextResponse.json({ ok: true });
}
