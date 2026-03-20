type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type GhlFetchParams = {
  endpoint: string;
  method?: HttpMethod;
  body?: unknown;
};

/**
 * Performs a server-side request to the GoHighLevel API.
 */
export async function ghlFetch<T>({
  endpoint,
  method = "GET",
  body,
}: GhlFetchParams): Promise<T> {
  const apiKey = process.env.GHL_API_KEY;
  const baseUrl = process.env.GHL_BASE_URL;

  if (!apiKey || !baseUrl) {
    throw new Error("Missing GHL_API_KEY or GHL_BASE_URL environment variables");
  }

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
