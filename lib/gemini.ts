import { GoogleGenerativeAI, SchemaType, type GenerativeModel } from "@google/generative-ai";

export const API_KEY_HEADER = "x-gemini-key";

export const MODEL_ID = "gemini-2.5-flash";

export class MissingKeyError extends Error {
  constructor(message = "Gemini API key missing. Add it in Settings.") {
    super(message);
    this.name = "MissingKeyError";
  }
}

/**
 * Resolve the API key for this request.
 * Priority: request header (user-provided) → process.env.GEMINI_API_KEY (local dev fallback).
 * Throws MissingKeyError if neither exists.
 */
export function resolveApiKey(req: Request): string {
  const headerKey = req.headers.get(API_KEY_HEADER)?.trim();
  const envKey = process.env.GEMINI_API_KEY?.trim();
  const key = headerKey || envKey;
  if (!key) throw new MissingKeyError();
  return key;
}

/** Build a fresh GenerativeAI client per request with the user's key. */
export function createClient(key: string) {
  return new GoogleGenerativeAI(key);
}

/**
 * Convert a Gemini SDK error into a concise, user-facing message.
 * Returns null if it's not a recognized Gemini error (caller falls back to raw).
 */
export function friendlyGeminiError(err: unknown): { message: string; status: number } | null {
  const raw = err instanceof Error ? err.message : String(err);

  if (isQuotaError(err)) {
    return {
      message:
        "Your Gemini API quota is exhausted for this model. Check usage at aistudio.google.com or try again tomorrow.",
      status: 429,
    };
  }
  if (isRateLimit(err)) {
    return {
      message: "Too many requests to Gemini. Wait a few seconds and try again.",
      status: 429,
    };
  }
  if (isCapacityError(err)) {
    return {
      message: "Gemini is overloaded right now. We retried automatically — try again in a minute.",
      status: 503,
    };
  }
  if (/API key not valid|API_KEY_INVALID|\[(400|401|403) /.test(raw)) {
    return {
      message: "Gemini rejected the API key. Update it in Settings.",
      status: 401,
    };
  }
  return null;
}

function isCapacityError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\[(500|502|503|504) /.test(msg);
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (!/\[429 /.test(msg)) return false;
  return /quota|limit:\s*0|free_tier_requests/i.test(msg);
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\[429 /.test(msg) && !isQuotaError(err);
}

/** True if it's worth retrying with backoff. Quota errors are not transient. */
function isRetryable(err: unknown): boolean {
  return isCapacityError(err) || isRateLimit(err);
}

export async function generateWithRetry(
  model: GenerativeModel,
  input: Parameters<GenerativeModel["generateContent"]>[0],
  opts: { retries?: number; baseDelayMs?: number } = {}
) {
  const { retries = 3, baseDelayMs = 800 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await model.generateContent(input);
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryable(err)) throw err;
      const delay = baseDelayMs * 2 ** attempt + Math.random() * 250;
      console.warn(
        `[gemini] transient error on attempt ${attempt + 1}/${retries + 1}, retrying in ${Math.round(delay)}ms`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export const syllabusSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: "Course title" },
    code: { type: SchemaType.STRING, description: "Course code e.g. CS 101" },
    instructor: { type: SchemaType.STRING },
    term: { type: SchemaType.STRING, description: "Semester/term e.g. Fall 2025" },
    description: { type: SchemaType.STRING, description: "Short course description (1-2 sentences)" },
    textbook: { type: SchemaType.STRING, description: "Primary textbook name and author" },
    gradingPolicy: { type: SchemaType.STRING, description: "Short grading policy summary" },
    weeks: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          week: { type: SchemaType.NUMBER },
          startDate: { type: SchemaType.STRING, description: "ISO date YYYY-MM-DD" },
          endDate: { type: SchemaType.STRING, description: "ISO date YYYY-MM-DD" },
          topic: { type: SchemaType.STRING },
          readings: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                source: { type: SchemaType.STRING, description: "Textbook or resource name" },
                chapters: { type: SchemaType.STRING, description: "e.g. Ch. 3-4" },
                pages: { type: SchemaType.STRING, description: "e.g. pp. 45-72" },
                estimatedMinutes: { type: SchemaType.NUMBER },
              },
              required: ["title", "source"],
            },
          },
          objectives: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["week", "startDate", "endDate", "topic", "readings", "objectives"],
      },
    },
  },
  required: ["title", "weeks"],
} as const;

export const flashcardsSchema = {
  type: SchemaType.OBJECT,
  properties: {
    flashcards: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          front: { type: SchemaType.STRING, description: "Question or prompt" },
          back: { type: SchemaType.STRING, description: "Answer or explanation" },
          topic: { type: SchemaType.STRING },
          chapter: { type: SchemaType.STRING },
          difficulty: {
            type: SchemaType.STRING,
            enum: ["easy", "medium", "hard"],
          },
        },
        required: ["front", "back", "topic", "difficulty"],
      },
    },
  },
  required: ["flashcards"],
} as const;

export const quizSchema = {
  type: SchemaType.OBJECT,
  properties: {
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          question: { type: SchemaType.STRING, description: "The question stem" },
          options: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Exactly 4 answer choices",
          },
          correctIndex: {
            type: SchemaType.NUMBER,
            description: "0-based index of the correct option",
          },
          explanation: {
            type: SchemaType.STRING,
            description: "1-2 sentence explanation for why the correct answer is correct",
          },
        },
        required: ["question", "options", "correctIndex", "explanation"],
      },
    },
  },
  required: ["questions"],
} as const;
