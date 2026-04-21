import { NextResponse } from "next/server";
import {
  createClient,
  FALLBACK_MODEL_ID,
  friendlyGeminiError,
  generateWithRetry,
  MissingKeyError,
  MODEL_ID,
  NO_THINKING,
  resolveApiKey,
} from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  courseTitle: string;
  textbook?: string;
  topic: string;
  objectives?: string[];
  style?: "comprehensive" | "cheatsheet" | "outline";
};

export async function POST(req: Request) {
  try {
    const apiKey = resolveApiKey(req);
    const body = (await req.json()) as Body;
    const { courseTitle, textbook, topic, objectives = [], style = "comprehensive" } = body;

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const styleGuide =
      style === "cheatsheet"
        ? "Produce a dense 1-page cheatsheet: short bullets, formulas, key terms. No prose paragraphs."
        : style === "outline"
          ? "Produce a hierarchical outline with H2/H3 sections and short bullet points under each."
          : "Produce comprehensive study notes with clear sections, definitions, examples, intuition, and common pitfalls.";

    const systemInstruction = `You are a world-class study-notes author. Write clean, well-structured Markdown that a student can learn from in one sitting.

Formatting rules:
- Start with a single H1 containing the topic.
- Use H2 for major sections, H3 for subsections.
- Use bullet lists, numbered lists, tables, and code blocks where appropriate.
- Use LaTeX-style inline math: $...$  and display math: $$...$$.
- Include a "Key Takeaways" section at the end (3-5 bullets).
- Include a "Common Mistakes" section with 2-4 pitfalls.
- No fluff. No "in this section we will...". Get to the substance.
- Don't wrap the whole output in a code fence.`;

    const generationConfig = { temperature: 0.6, ...NO_THINKING };

    const client = createClient(apiKey);
    const model = client.getGenerativeModel({
      model: MODEL_ID,
      generationConfig,
      systemInstruction,
    });

    const objectivesBlock =
      objectives.length > 0
        ? `Learning objectives to cover:\n${objectives.map((o) => `- ${o}`).join("\n")}`
        : "";

    const prompt = `Course: ${courseTitle}
Textbook: ${textbook ?? "unknown"}
Topic: ${topic}

${objectivesBlock}

Style: ${styleGuide}

Write the notes now.`;

    const result = await generateWithRetry(model, prompt, {
      retries: 4,
      fallback: () =>
        client.getGenerativeModel({
          model: FALLBACK_MODEL_ID,
          generationConfig,
          systemInstruction,
        }),
    });
    const markdown = result.response.text();

    return NextResponse.json({ ok: true, markdown });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[generate-notes] error", err);
    const friendly = friendlyGeminiError(err);
    if (friendly) return NextResponse.json({ error: friendly.message }, { status: friendly.status });
    const raw = err instanceof Error ? err.message : "Failed to generate notes";
    return NextResponse.json({ error: raw }, { status: 500 });
  }
}
