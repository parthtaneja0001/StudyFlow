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
        ? `Produce a dense 1-page cheatsheet.
- Target 600-1000 words.
- Short bullets, formulas, key terms, comparison tables.
- No prose paragraphs — every line is a scannable fact or rule.`
        : style === "outline"
          ? `Produce a hierarchical outline.
- Target 1000-1500 words.
- Use H2 for major sections, H3 for subsections.
- 3-6 bullets under each H3, each 1 concise sentence.
- No long prose — outline form only.`
          : `Produce comprehensive, in-depth study notes. This is the default mode — go deep.
- Target 2000-4000 words for a single focused topic, longer for broad topics.
- For every subtopic: include a clear definition, 1-2 worked examples, intuition behind the concept, when to use it, tradeoffs, and a concrete illustration or analogy.
- If the topic is broad (e.g. "all design patterns", "data structures overview"), treat EACH sub-item as a full H3 section with its own definition, example, pros, cons, and when-to-use block. Do NOT one-line items.
- Include code samples (in the most natural language for the topic) where concrete code clarifies the idea.
- Include at least 2 comparison tables where things can be compared.`;

    const systemInstruction = `You are a world-class study-notes author. Write the kind of notes a top student would compile before a final exam — thorough, well-organized, and genuinely useful weeks later.

Formatting rules:
- Start with a single H1 containing the topic.
- Use H2 for major sections, H3 for subsections.
- Use bullet lists, numbered lists, tables, and fenced code blocks where appropriate.
- Use LaTeX-style inline math: $...$  and display math: $$...$$.
- Include a "Key Takeaways" section at the end (5-8 bullets).
- Include a "Common Mistakes" section with 3-5 pitfalls.
- Don't wrap the whole output in a code fence.

Depth rules (CRITICAL):
- Do NOT summarize. Teach.
- For broad / plural topics ("all X", "every Y", "overview of Z"), cover EACH item in full — definition, example, use case, tradeoffs. Never reduce a sub-item to a one-liner.
- Explain the "why" behind every concept. Include intuition and motivation, not just definitions.
- Include concrete examples: code, numbers, scenarios — never just abstract prose.
- Prefer long and thorough over short and elegant. If in doubt, expand.`;

    // Comprehensive: thinking ON + large output budget for genuinely long notes.
    // Outline/cheatsheet: thinking OFF (fast, concise).
    const generationConfig =
      style === "comprehensive"
        ? {
            temperature: 0.6,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: -1 },
          }
        : {
            temperature: 0.6,
            maxOutputTokens: 3072,
            ...NO_THINKING,
          };

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

Style instructions:
${styleGuide}

Write the notes now. Be thorough — if the topic covers many sub-items, treat each one as a full section, not a one-line summary.`;

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
