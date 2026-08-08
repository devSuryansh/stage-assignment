/** Safe JSON parse for fetch responses that may be HTML error pages. */
export async function readJsonResponse<T = unknown>(
  res: Response,
): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (contentType.includes("application/json") || raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error(
        `Server returned invalid JSON (HTTP ${res.status}). ${raw.slice(0, 160)}`,
      );
    }
  }

  const title = raw.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  throw new Error(
    title
      ? `Server error (HTTP ${res.status}): ${title}`
      : `Server returned HTML instead of JSON (HTTP ${res.status}). The API route likely crashed or timed out.`,
  );
}
