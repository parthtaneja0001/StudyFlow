import { NextResponse } from "next/server";
import {
  createClient,
  flashcardsSchema,
  friendlyGeminiError,
  generateWithRetry,
  MissingKeyError,
  MODEL_ID,
  resolveApiKey,
} from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  courseTitle: string;
  textbook?: string;
  topic: string;
  chapter?: string;
  count?: number;
};

export async function POST(req: Request) {
  try {
    const apiKey = resolveApiKey(req);
    const body = (await req.json()) as Body;
    const { courseTitle, textbook, topic, chapter, count = 12 } = body;

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const model = createClient(apiKey).getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: flashcardsSchema as never,
        temperature: 0.7,
      },
      systemInstruction: `You are an expert tutor. Generate high-quality spaced-repetition flashcards.

Principles (from Michael Nielsen & Andy Matuschak):
- Each card tests ONE atomic concept.
- Fronts are precise questions — avoid yes/no.
- Backs are concise (1-3 sentences), complete, and standalone.
- Mix difficulties: definitions (easy), application (medium), synthesis (hard).
- Prefer "why" and "how" over pure "what".
- No duplicates. No trivia.`,
    });

    const prompt = `Course: ${courseTitle}
Textbook: ${textbook ?? "unknown"}
Topic: ${topic}
${chapter ? `Chapter: ${chapter}` : ""}

Generate exactly ${count} flashcards for this topic. Cover foundational concepts, key terms, formulas/rules, and at least 2 application-style cards.`;

    const result = await generateWithRetry(model, prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return NextResponse.json({ ok: true, flashcards: parsed.flashcards ?? [] });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[generate-flashcards] error", err);
    const friendly = friendlyGeminiError(err);
    if (friendly) return NextResponse.json({ error: friendly.message }, { status: friendly.status });
    const raw = err instanceof Error ? err.message : "Failed to generate flashcards";
    return NextResponse.json({ error: raw }, { status: 500 });
  }
}
