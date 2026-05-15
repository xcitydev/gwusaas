import { NextResponse } from "next/server";
import { requireVoiceCallerAccess } from "@/lib/voiceCallerGate";

export const runtime = "nodejs";

/**
 * Diagnostic endpoint for the browser-based Vapi tab.
 *
 * Uses the SERVER-side VAPI_API_KEY to introspect the Vapi org and tell the
 * caller exactly why their browser call is being ejected. Specifically:
 *   - Is the server key valid and reaching the right org?
 *   - Does the publishable key the browser is using actually exist in this
 *     org, and is it of type "publishable" (not "private")?
 *   - What allowedOrigins does the publishable key permit?
 *
 * Pass the publishable key the browser is using as a query param so we can
 * locate it server-side: GET /api/voice-caller/vapi/diagnose?publicKey=…
 *
 * No secret material is ever returned — only metadata (id, type, origins).
 */

const VAPI_BASE = "https://api.vapi.ai";

type ApiKeyEntry = {
  id?: string;
  key?: string;
  type?: string;
  name?: string;
  allowedOrigins?: string[];
  origins?: string[];
  createdAt?: string;
};

function maskKey(key: string): string {
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export async function GET(req: Request): Promise<NextResponse> {
  const guard = await requireVoiceCallerAccess();
  if (!guard.ok) return guard.response;

  const serverKey = process.env.VAPI_API_KEY;
  if (!serverKey) {
    return NextResponse.json(
      {
        ok: false,
        step: "server-key-missing",
        error:
          "VAPI_API_KEY (server-side, private) is not set in .env.local. The browser tab needs this on the backend to run diagnostics.",
      },
      { status: 200 },
    );
  }

  const url = new URL(req.url);
  const publicKeyToCheck = (url.searchParams.get("publicKey") ?? "").trim();

  // ── Step 1: Confirm the SERVER key reaches the org ──
  let orgReachable = false;
  let assistantCount: number | null = null;
  let serverKeyError: string | null = null;
  try {
    const aRes = await fetch(`${VAPI_BASE}/assistant`, {
      headers: { Authorization: `Bearer ${serverKey}` },
      cache: "no-store",
    });
    if (!aRes.ok) {
      const text = await aRes.text();
      serverKeyError = `Vapi /assistant returned ${aRes.status}: ${text.slice(0, 250)}`;
    } else {
      orgReachable = true;
      const list = (await aRes.json()) as unknown;
      assistantCount = Array.isArray(list) ? list.length : 0;
    }
  } catch (e) {
    serverKeyError = e instanceof Error ? e.message : String(e);
  }

  if (!orgReachable) {
    return NextResponse.json(
      {
        ok: false,
        step: "server-key-invalid",
        error: serverKeyError,
        hint: "VAPI_API_KEY in .env.local is wrong or revoked. Copy the SERVER (Private) key from Vapi → Org → API Keys and update it.",
      },
      { status: 200 },
    );
  }

  // ── Step 2: List the org's API keys and locate the publishable one ──
  let allKeys: ApiKeyEntry[] = [];
  let listKeysError: string | null = null;
  try {
    // Vapi exposes the keys under /api-key in current versions.
    const kRes = await fetch(`${VAPI_BASE}/api-key`, {
      headers: { Authorization: `Bearer ${serverKey}` },
      cache: "no-store",
    });
    if (kRes.ok) {
      const json = (await kRes.json()) as ApiKeyEntry[] | { data?: ApiKeyEntry[] };
      allKeys = Array.isArray(json) ? json : (json.data ?? []);
    } else {
      listKeysError = `GET /api-key returned ${kRes.status}`;
    }
  } catch (e) {
    listKeysError = e instanceof Error ? e.message : String(e);
  }

  // Summarize the keys we found (without leaking secrets).
  const keyLineup = allKeys.map((k) => ({
    id: k.id,
    name: k.name,
    type: k.type,
    keyPreview: k.key ? maskKey(k.key) : null,
    allowedOrigins: k.allowedOrigins ?? k.origins ?? null,
  }));

  // ── Step 3: If we got a candidate public key, check it ──
  let publicKeyAnalysis:
    | {
        found: boolean;
        type?: string;
        looksLikePrivateKey?: boolean;
        allowedOrigins?: string[] | null;
        keyId?: string;
        keyName?: string;
        verdict: string;
      }
    | null = null;

  if (publicKeyToCheck) {
    const match = allKeys.find((k) => k.key === publicKeyToCheck);
    if (!match) {
      // Vapi's /api-key endpoint typically only returns PRIVATE keys; the
      // publishable key is managed via Org → API Keys in the UI and isn't
      // exposed here. So "not found" is inconclusive, not a failure.
      publicKeyAnalysis = {
        found: false,
        verdict:
          "Couldn't verify the public key via Vapi's /api-key endpoint — that endpoint typically only lists private keys, so this check is inconclusive. If you copied the value from Vapi dashboard → Org Settings → API Keys → Public Key (with Origins: All domains allowed), it's correct. Move on to testing with an assistantId.",
      };
    } else {
      const looksLikePrivate =
        (match.type ?? "").toLowerCase().includes("priv") ||
        (match.type ?? "").toLowerCase().includes("secret");
      const origins = match.allowedOrigins ?? match.origins ?? null;
      const verdictParts: string[] = [];

      if (looksLikePrivate) {
        verdictParts.push(
          `The key in NEXT_PUBLIC_VAPI_PUBLIC_KEY is a PRIVATE key (type="${match.type}"). The browser SDK must use the PUBLISHABLE key — that's why Vapi is ejecting the meeting. Replace the env var with the publishable key.`,
        );
      } else {
        verdictParts.push(
          `Key is found and is publishable (type="${match.type ?? "unknown"}"). Good.`,
        );
      }

      if (origins && origins.length > 0) {
        const localhostListed = origins.some((o) =>
          /localhost|127\.0\.0\.1/i.test(o),
        );
        if (!localhostListed) {
          verdictParts.push(
            `Allowed origins is locked to ${JSON.stringify(origins)} — your dev origin (e.g. http://localhost:3000) is NOT on that list, so Vapi is ejecting the call. Add localhost to the public key's allowed origins or use an unrestricted publishable key for development.`,
          );
        } else {
          verdictParts.push("Localhost is in the allowed origins list. Good.");
        }
      } else {
        verdictParts.push(
          "No allowed-origins restriction set on this key (or the field isn't returned by the API), so origin is not the issue.",
        );
      }

      publicKeyAnalysis = {
        found: true,
        type: match.type,
        looksLikePrivateKey: looksLikePrivate,
        allowedOrigins: origins,
        keyId: match.id,
        keyName: match.name,
        verdict: verdictParts.join(" "),
      };
    }
  }

  return NextResponse.json({
    ok: true,
    orgReachable: true,
    assistantCount,
    listKeysError,
    keyCount: allKeys.length,
    keys: keyLineup,
    publicKeyMasked: publicKeyToCheck ? maskKey(publicKeyToCheck) : null,
    publicKeyAnalysis,
  });
}
