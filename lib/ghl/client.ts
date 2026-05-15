type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type GhlFetchParams = {
  endpoint: string;
  method?: HttpMethod;
  body?: unknown;
  // Per-request override of the bearer token. When the request is on behalf
  // of a connected business, pass that business's stored API key here so we
  // do not fall back to the platform-wide GHL_API_KEY.
  apiKey?: string;
};

export const GHL_DEFAULT_BASE_URL = "https://services.leadconnectorhq.com";

/**
 * Performs a server-side request to the GoHighLevel API.
 */
export async function ghlFetch<T>({
  endpoint,
  method = "GET",
  body,
  apiKey,
}: GhlFetchParams): Promise<T> {
  const resolvedKey = apiKey ?? process.env.GHL_API_KEY;
  const baseUrl = process.env.GHL_BASE_URL ?? GHL_DEFAULT_BASE_URL;

  if (!resolvedKey) {
    throw new Error(
      "Missing GHL API key — pass apiKey or set GHL_API_KEY environment variable",
    );
  }

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${resolvedKey}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const responseText = await response.text();
  let parsedJson: unknown = null;
  if (responseText) {
    try {
      parsedJson = JSON.parse(responseText) as unknown;
    } catch {
      parsedJson = responseText;
    }
  }

  if (!response.ok) {
    const errorDetails =
      parsedJson && typeof parsedJson === "object"
        ? JSON.stringify(parsedJson)
        : responseText || "No error payload returned";
    throw new Error(
      `GHL request failed (${method} ${normalizedEndpoint}) with ${response.status}: ${errorDetails}`,
    );
  }

  return parsedJson as T;
}
