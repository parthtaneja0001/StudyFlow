const STORAGE_KEY = "studyflow:gemini-key";
export const API_KEY_HEADER = "x-gemini-key";

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setApiKey(key: string): void {
  if (typeof window === "undefined") return;
  const trimmed = key.trim();
  if (!trimmed) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, trimmed);
}

export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(Math.max(0, key.length - 8))}${key.slice(-4)}`;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super("No Gemini API key configured");
    this.name = "MissingApiKeyError";
  }
}

export async function fetchWithKey(input: RequestInfo | URL, init: RequestInit = {}) {
  const key = getApiKey();
  if (!key) throw new MissingApiKeyError();

  const headers = new Headers(init.headers ?? {});
  headers.set(API_KEY_HEADER, key);

  return fetch(input, { ...init, headers });
}
