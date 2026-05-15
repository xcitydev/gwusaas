import type { NextConfig } from "next";

/**
 * Security headers applied to every response. Tuned for the third-party
 * services the app already uses (Clerk, Convex, Vapi/Daily, ElevenLabs,
 * Supabase Storage, GoHighLevel, OpenAI/Anthropic via server-only routes).
 *
 * CSP is *report-only* by default in dev so a missing source doesn't break
 * the app while we tune it. Flip to enforce in production by setting
 * NEXT_PUBLIC_ENFORCE_CSP=1.
 */

const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'", // Next.js inline runtime
    "'unsafe-eval'", // dev / framer-motion / Next dev tools
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://challenges.cloudflare.com", // Clerk Turnstile
  ],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
    "https://*.supabase.co", // user-uploaded media + voice samples
    "https://*.googleusercontent.com",
    "https://*.fbcdn.net",
    "https://*.cdninstagram.com",
    "https://services.leadconnectorhq.com",
    "https:",
  ],
  "media-src": [
    "'self'",
    "blob:",
    "data:",
    "https://*.supabase.co",
    "https://api.elevenlabs.io",
  ],
  "connect-src": [
    "'self'",
    // Convex realtime + HTTP
    "https://*.convex.cloud",
    "wss://*.convex.cloud",
    // Clerk
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://clerk-telemetry.com",
    // Vapi web SDK + Daily.co WebRTC
    "https://api.vapi.ai",
    "wss://api.vapi.ai",
    "https://*.daily.co",
    "wss://*.daily.co",
    // ElevenLabs (some browser-side previews)
    "https://api.elevenlabs.io",
    // Supabase
    "https://*.supabase.co",
    "wss://*.supabase.co",
    // GHL
    "https://services.leadconnectorhq.com",
    // Sentry
    "https://*.sentry.io",
    // Upstash (only if we ever call from browser; safe to allow)
    "https://*.upstash.io",
  ],
  "frame-src": [
    "'self'",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://challenges.cloudflare.com",
  ],
  "worker-src": ["'self'", "blob:"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"], // can't be embedded in another page
};

function buildCsp(): string {
  return Object.entries(cspDirectives)
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ");
}

const securityHeaders = [
  {
    // CSP — enforced when NEXT_PUBLIC_ENFORCE_CSP=1, otherwise report-only.
    key:
      process.env.NEXT_PUBLIC_ENFORCE_CSP === "1"
        ? "Content-Security-Policy"
        : "Content-Security-Policy-Report-Only",
    value: buildCsp(),
  },
  // No browser sniffing of MIME types.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't allow framing (also enforced via CSP frame-ancestors).
  { key: "X-Frame-Options", value: "DENY" },
  // HSTS — 2 years, include subdomains, preload-eligible.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Referrer policy — send origin only on cross-origin so we don't leak paths.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permissions: lock down what features any JS can request.
  // We allow microphone (Vapi web call) but block camera/geo/payment by default.
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), payment=(), microphone=(self)",
  },
];

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
