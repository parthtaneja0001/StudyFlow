/**
 * Client-side helpers for generation requests.
 * The Gemini key now lives server-side in the user's profile row — the browser
 * never sees it after it's been saved, so `fetchWithKey` just forwards the
 * request (auth is via Supabase cookies).
 */
export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    if (res.status === 504) {
      throw new Error(
        "Request timed out (>60s). Try a narrower topic, use outline/cheatsheet style, or retry."
      );
    }
    if (res.status >= 500) {
      throw new Error(`Server error (${res.status}). Please try again in a minute.`);
    }
    throw new Error(`Unexpected response (${res.status}). Please try again.`);
  }
  if (!res.ok) {
    const msg =
      typeof parsed === "object" && parsed && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return parsed as T;
}
