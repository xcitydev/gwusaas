type FirecrawlResponse = {
  success?: boolean;
  data?: {
    markdown?: string;
    content?: string;
    metadata?: Record<string, unknown>;
  };
};

export async function scrapeUrl(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not configured");
  }

  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl scrape failed with status ${response.status}`);
  }

  const payload = (await response.json()) as FirecrawlResponse;
  const content = payload.data?.markdown ?? payload.data?.content ?? "";
  if (!content) {
    throw new Error("Firecrawl returned empty content");
  }
  return content;
}
