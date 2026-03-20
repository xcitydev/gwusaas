import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJsonWithFallback, getAiErrorMessage } from "@/lib/ai";
import { requirePlan } from "@/lib/route-auth";
import { scrapeUrl } from "@/lib/firecrawl";
import { saveAiGenerationHistory } from "@/lib/convex-history";

const bodySchema = z.object({
  url: z.string().url(),
  method: z.enum(["firecrawl", "apify"]).default("firecrawl"),
  apifyActorId: z.string().optional(),
  businessType: z.string().optional(),
  targetGeo: z.string().optional(),
  offer: z.string().optional(),
  maxItems: z.number().int().min(1).max(100).optional(),
});

type ScrapeWithApifyResult = {
  selectedActor: string;
  scraped: string;
};

function dedupe(values: Array<string | undefined>) {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    if (!value) return false;
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function getActorCandidates(url: string, actorId?: string) {
  const lower = url.toLowerCase();
  const defaults = [
    process.env.APIFY_DEFAULT_ACTOR_ID,
    "apify/google-maps-scraper",
    "apify/instagram-scraper",
    "apify/facebook-pages-scraper",
    "apify/linkedin-company-scraper",
    "apify/website-content-crawler",
  ];

  const googleMaps = ["apify/google-maps-scraper", "apify/website-content-crawler"];
  const social = [
    "apify/linkedin-company-scraper",
    "apify/instagram-scraper",
    "apify/facebook-pages-scraper",
  ];

  if (
    lower.includes("google.com/maps") ||
    lower.includes("maps.google") ||
    lower.includes("g.page")
  ) {
    return dedupe([actorId, ...googleMaps, ...defaults]);
  }

  if (
    lower.includes("linkedin.com") ||
    lower.includes("instagram.com") ||
    lower.includes("facebook.com")
  ) {
    return dedupe([actorId, ...social, ...defaults]);
  }

  return dedupe([actorId, ...defaults]);
}

async function scrapeWithApify(
  url: string,
  actorId?: string,
  maxItems = 25,
): Promise<ScrapeWithApifyResult> {
  const token = process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY;
  if (!token) {
    throw new Error("APIFY_API_TOKEN is not configured");
  }

  const candidates = getActorCandidates(url, actorId);
  if (candidates.length === 0) {
    throw new Error(
      "No Apify actor configured. Provide apifyActorId or APIFY_DEFAULT_ACTOR_ID.",
    );
  }

  let lastError = "Apify scrape failed";

  for (const candidate of candidates) {
    const response = await fetch(
      `https://api.apify.com/v2/acts/${candidate}/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: [{ url }],
          maxItems,
        }),
      },
    );

    const raw = await response.text();
    if (!response.ok) {
      lastError = `Apify actor ${candidate} failed (${response.status}): ${raw}`;
      console.warn("Apify actor candidate failed", { candidate, status: response.status });
      continue;
    }

    const parsed = JSON.parse(raw) as unknown;
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const limited = items.slice(0, maxItems);
    return {
      selectedActor: candidate,
      scraped: JSON.stringify(limited),
    };
  }

  throw new Error(lastError);
}

const extractSystemPrompt =
  "You are a lead intelligence analyst. Return JSON array of up to 50 lead objects. Each object must include: company, contactName, contactRole, email, phone, website, location, painPoint, outreachAngle, confidence (1-100), sourceEvidence. Use only evidence from scraped content. If a field is missing, use empty string.";

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("growth");
    if (!guard.ok) return guard.response;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    let scraped = "";
    let selectedActor: string | undefined;
    if (parsed.data.method === "apify") {
      const apifyResult = await scrapeWithApify(
        parsed.data.url,
        parsed.data.apifyActorId,
        parsed.data.maxItems ?? 25,
      );
      scraped = apifyResult.scraped;
      selectedActor = apifyResult.selectedActor;
    } else {
      scraped = await scrapeUrl(parsed.data.url);
    }

    const traceId = `lead-gen-scrape:${guard.userId}:${Date.now()}`;
    const { data, provider, model, rawText } = await generateJsonWithFallback<unknown[]>({
      system: extractSystemPrompt,
      messages: [
        {
          role: "user",
          content:
            `Source URL: ${parsed.data.url}\n` +
            `Collection method: ${parsed.data.method}\n` +
            `Business type: ${parsed.data.businessType ?? "N/A"}\n` +
            `Target geography: ${parsed.data.targetGeo ?? "N/A"}\n` +
            `Offer: ${parsed.data.offer ?? "N/A"}\n` +
            `Selected Apify actor: ${selectedActor ?? "N/A"}\n` +
            `Scraped content:\n${scraped}\n\n` +
            "Extract lead opportunities as JSON only.",
        },
      ],
      traceId,
    });

    const generationId = await saveAiGenerationHistory({
      userId: guard.userId,
      type: "lead-gen-scrape",
      input: {
        ...parsed.data,
        selectedActor,
      },
      output: data,
    });

    const leads = (Array.isArray(data) ? data : []).map((item) => {
      const row = item as Record<string, unknown>;
      return {
        company: String(row.company ?? ""),
        contactName: String(row.contactName ?? ""),
        contactRole: String(row.contactRole ?? ""),
        email: String(row.email ?? ""),
        phone: String(row.phone ?? ""),
        website: String(row.website ?? ""),
        location: String(row.location ?? ""),
        painPoint: String(row.painPoint ?? ""),
        outreachAngle: String(row.outreachAngle ?? ""),
        confidence: Number(row.confidence ?? 0),
        sourceEvidence: String(row.sourceEvidence ?? ""),
      };
    });

    console.info("Lead scrape extracted", {
      traceId,
      provider,
      model,
      selectedActor,
      rawPreview: rawText.slice(0, 300),
    });

    return NextResponse.json({ leads, generationId, selectedActor });
  } catch (error) {
    console.error("Lead scrape failed", error);
    return NextResponse.json(
      { error: `Lead scrape failed: ${getAiErrorMessage(error)}` },
      { status: 500 },
    );
  }
}
