const APIFY_BASE = "https://api.apify.com/v2";

export interface ApifyImage {
  url: string;
  title: string;
  sourceUrl: string;
  width?: number;
  height?: number;
}

async function runActor<T>(
  actorId: string,
  input: Record<string, unknown>,
  apiKey: string,
  timeoutSecs = 60
): Promise<T[]> {
  const res = await fetch(
    `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${apiKey}&timeout=${timeoutSecs}&memory=256`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Apify actor ${actorId} failed: ${res.status} ${err.slice(0, 200)}`);
  }
  return res.json() as Promise<T[]>;
}

export async function searchImages(query: string, maxResults = 12, apiKey: string): Promise<ApifyImage[]> {
  try {
    const results = await runActor<{
      imageUrl?: string; url?: string; title?: string; sourceUrl?: string; width?: number; height?: number;
    }>("apify~bing-images-search", { query, maxResults, safeSearch: "Moderate" }, apiKey, 45);

    return results
      .map((r) => ({ url: r.imageUrl ?? r.url ?? "", title: r.title ?? query, sourceUrl: r.sourceUrl ?? "", width: r.width, height: r.height }))
      .filter((r) => r.url);
  } catch {
    const results = await runActor<{ imageUrl?: string; title?: string; sourceUrl?: string }>(
      "apify~google-images-scraper",
      { queries: [query], maxImagesPerQuery: maxResults },
      apiKey,
      60
    );
    return results
      .map((r) => ({ url: r.imageUrl ?? "", title: r.title ?? query, sourceUrl: r.sourceUrl ?? "" }))
      .filter((r) => r.url);
  }
}
