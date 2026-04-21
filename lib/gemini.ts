import { GoogleGenerativeAI, SchemaType, type GenerativeModel } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey && process.env.NODE_ENV !== "test") {
  console.warn("[studyflow] GEMINI_API_KEY is not set. Add it to .env.local");
}

export const genAI = new GoogleGenerativeAI(apiKey ?? "");

export const MODEL_ID = "gemini-2.5-flash";

const TRANSIENT_CODES = [429, 500, 502, 503, 504];

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return TRANSIENT_CODES.some((c) => msg.includes(`[${c} `));
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
      if (attempt === retries || !isTransient(err)) throw err;
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
