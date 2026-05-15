import "server-only";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export type GHLAuth = {
  apiKey: string;
  locationId: string;
  locationName: string;
  source: "decrypted" | "env_fallback";
};

// In-memory per-process cache so we don't decrypt the GHL key on every
// inbound request from the same user. Keyed on clerkUserId. TTL is short
// (5 min) so disconnect / rotate flows pick up changes quickly without
// needing explicit cache busts. The cache lives per Vercel/Node instance,
// which is fine — at scale you have many instances and a small per-user
// cache hit rate is still a meaningful win on hot conversation polls.
const CACHE_TTL_MS = 5 * 60 * 1000;
const authCache = new Map<string, { value: GHLAuth | null; expiresAt: number }>();

export function invalidateGHLAuthCache(clerkUserId: string): void {
  authCache.delete(clerkUserId);
}

type DecryptedResult = {
  apiKey: string;
  locationId: string;
  locationName: string;
} | null;

type LegacyConnection = {
  locationId: string;
  locationName: string;
  isActive: boolean;
} | null;

const isMissingFunction = (error: unknown, fnName: string): boolean => {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("Could not find public function") &&
    error.message.includes(fnName)
  );
};

/**
 * Resolves the GHL credentials to use for an outgoing request on behalf of a user.
 * Order of preference:
 *   1. Decrypted per-user key from ghlConnections (post-migration).
 *   2. Platform env GHL_API_KEY + the user's stored locationId (legacy/dev).
 * Returns null if no usable credentials exist.
 */
export async function getActiveGHLAuth(
  clerkUserId: string,
): Promise<GHLAuth | null> {
  // Cache hit?
  const cached = authCache.get(clerkUserId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const cache = (value: GHLAuth | null): GHLAuth | null => {
    authCache.set(clerkUserId, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return value;
  };

  // Try the new decrypted-key query first.
  try {
    const result = (await convex.query(
      "ghl:getDecryptedGHLApiKey" as never,
      { clerkUserId } as never,
    )) as DecryptedResult;

    if (result?.apiKey && result.locationId) {
      return cache({
        apiKey: result.apiKey,
        locationId: result.locationId,
        locationName: result.locationName,
        source: "decrypted",
      });
    }
  } catch (error) {
    if (!isMissingFunction(error, "ghl:getDecryptedGHLApiKey")) {
      throw error;
    }
    // fall through to legacy path
  }

  // Legacy fallback: use the env key + the user's stored locationId.
  const envKey = process.env.GHL_API_KEY;
  if (!envKey) return cache(null);

  try {
    const legacy = (await convex.query("ghl:getGHLConnection" as never, {
      clerkUserId,
    } as never)) as LegacyConnection;

    if (legacy?.locationId) {
      return cache({
        apiKey: envKey,
        locationId: legacy.locationId,
        locationName: legacy.locationName,
        source: "env_fallback",
      });
    }
  } catch {
    // ignore — fall through
  }

  return cache(null);
}
