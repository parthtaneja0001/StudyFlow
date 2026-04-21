import { NextResponse } from "next/server";
import {
  createClient,
  generateWithRetry,
  MissingKeyError,
  MODEL_ID,
  quizSchema,
  resolveApiKey,
} from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  courseTitle: string;
  textbook?: string;
  topic: string;
  objectives?: string[];
  readings?: { title: string; source: string; chapters?: string }[];
  count?: number;
};

export async function POST(req: Request) {
  try {
    const apiKey = resolveApiKey(req);
    const body = (await req.json()) as Body;
    const { courseTitle, textbook, topic, objectives = [], readings = [], count = 5 } = body;

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const model = createClient(apiKey).getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: quizSchema as never,
        temperature: 0.6,
      },
      systemInstruction: `You are an exam-writing expert. Build high-quality multiple-choice quiz questions that a college instructor would actually ask on a midterm.

Rules:
- Produce exactly ${count} questions.
- Each question has EXACTLY 4 options and exactly one correct answer.
- correctIndex is 0-based (0, 1, 2, or 3). Randomize its position across questions — do NOT put the correct answer at the same index every time.
- Mix Bloom's levels: 1-2 recall, 2-3 application/analysis. Avoid trivial yes/no.
- Distractors must be plausible (common misconceptions, off-by-one mistakes, swapped definitions). Never absurd.
- Each "explanation" is 1-2 sentences. State why the correct answer is correct AND briefly why the top distractor is wrong.
- Write clear, self-contained stems. No "all of the above" / "none of the above".
- Prefer questions that test understanding, not memorization.`,
    });

    const objectivesBlock =
      objectives.length > 0
        ? `\nLearning objectives:\n${objectives.map((o) => `- ${o}`).join("\n")}`
        : "";
    const readingsBlock =
      readings.length > 0
        ? `\nReadings for this part:\n${readings.map((r) => `- ${r.title} (${r.source}${r.chapters ? `, ${r.chapters}` : ""})`).join("\n")}`
        : "";

    const prompt = `Course: ${courseTitle}
Textbook: ${textbook ?? "unknown"}
Topic (this week's focus): ${topic}${objectivesBlock}${readingsBlock}

Write ${count} multiple-choice questions covering the most important concepts a student must know for this topic.`;

    const result = await generateWithRetry(model, prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return NextResponse.json({ ok: true, questions: parsed.questions ?? [] });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[generate-quiz] error", err);
    const raw = err instanceof Error ? err.message : "Failed to generate quiz";
    const friendly = /\[(503|504|429|500|502) /.test(raw)
      ? "Gemini is busy right now. Please try again in a minute."
      : /\[401|403 /.test(raw)
        ? "Gemini rejected the API key. Update it in Settings."
        : raw;
    const status = /\[401|403 /.test(raw) ? 401 : 500;
    return NextResponse.json({ error: friendly }, { status });
  }
}
