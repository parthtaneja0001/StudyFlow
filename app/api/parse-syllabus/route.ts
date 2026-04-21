import { NextResponse } from "next/server";
import {
  createClient,
  friendlyGeminiError,
  generateWithRetry,
  MissingKeyError,
  MODEL_ID,
  resolveApiKey,
  syllabusSchema,
} from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  try {
    const apiKey = resolveApiKey(req);
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const pastedText = String(form.get("text") ?? "").trim();
    const termStart = String(form.get("termStart") ?? "");
    const termEnd = String(form.get("termEnd") ?? "");

    if (!file && !pastedText) {
      return NextResponse.json(
        { error: "Provide a PDF file or pasted syllabus text" },
        { status: 400 }
      );
    }

    if (file && file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    if (file && file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF is too large (max 20MB)" }, { status: 413 });
    }

    if (pastedText && pastedText.length < 80) {
      return NextResponse.json(
        { error: "Pasted text is too short to be a syllabus" },
        { status: 400 }
      );
    }

    if (pastedText && pastedText.length > 200_000) {
      return NextResponse.json(
        { error: "Pasted text is too long (max ~200K characters)" },
        { status: 413 }
      );
    }

    if (!ISO_DATE.test(termStart) || !ISO_DATE.test(termEnd)) {
      return NextResponse.json(
        { error: "termStart and termEnd must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const startMs = Date.parse(termStart);
    const endMs = Date.parse(termEnd);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return NextResponse.json(
        { error: "termEnd must be after termStart" },
        { status: 400 }
      );
    }

    const totalWeeks = Math.max(
      1,
      Math.round((endMs - startMs) / (7 * 86400000))
    );

    const sourceLabel = file ? "syllabus PDF" : "pasted syllabus text";

    const model = createClient(apiKey).getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        responseMimeType: "application/json",
        // @ts-expect-error SchemaType enum values are compatible at runtime
        responseSchema: syllabusSchema,
        temperature: 0.2,
      },
      systemInstruction: `You are an expert academic advisor. Break down the provided ${sourceLabel} into a weekly study plan that fits into the student's term window.

CRITICAL DATE RULES — follow these exactly:
- The student's term runs from ${termStart} (week 1 start) to ${termEnd} (final week's last day).
- Produce exactly ${totalWeeks} weeks of plan, numbered 1..${totalWeeks}.
- Each week is 7 days. Week N's startDate = ${termStart} + (N-1)*7 days. endDate = startDate + 6 days.
- Use YYYY-MM-DD ISO format for every date. Never output dates outside [${termStart}, ${termEnd}].
- IGNORE any specific calendar dates printed in the syllabus (those are from past semesters). Keep the ORDER of topics only, then map them evenly into the term window above.

Content rules:
- Each week has: topic, readings, objectives. NO assignments — do not invent homework or exam dates.
- Capture every reading mentioned — include chapter numbers and pages when present.
- For each week, write 2-4 concise learning objectives in active voice (e.g., "Model linear systems using matrices").
- estimatedMinutes for readings should be realistic (15-180 based on pages).
- If the syllabus covers fewer topics than weeks, stretch them out logically (review weeks, practice weeks, project weeks).
- If the syllabus covers more topics than weeks, combine closely related ones.
- Detect the primary textbook and put it in the textbook field.
- Keep descriptions under 200 characters.`,
    });

    const userPrompt = `Break this syllabus into ${totalWeeks} weeks running ${termStart} to ${termEnd}. For each week, provide topic, readings, and 2-4 learning objectives. Do not include assignments. Follow the schema strictly.`;

    const parts: Parameters<typeof model.generateContent>[0] = file
      ? [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: Buffer.from(await file.arrayBuffer()).toString("base64"),
            },
          },
          userPrompt,
        ]
      : [`SYLLABUS TEXT:\n\n${pastedText}\n\n---\n\n${userPrompt}`];

    const result = await generateWithRetry(model, parts);

    const text = result.response.text();
    const parsed = JSON.parse(text);

    return NextResponse.json({ ok: true, syllabus: parsed });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[parse-syllabus] error", err);
    const friendly = friendlyGeminiError(err);
    if (friendly) return NextResponse.json({ error: friendly.message }, { status: friendly.status });
    const raw = err instanceof Error ? err.message : "Failed to parse syllabus";
    return NextResponse.json({ error: raw }, { status: 500 });
  }
}
