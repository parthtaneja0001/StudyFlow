import { NextResponse } from "next/server";
import { createClient, MODEL_ID, resolveApiKeyFromHeader } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const key = resolveApiKeyFromHeader(req);
    const client = createClient(key);
    const model = client.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: { temperature: 0 },
    });
    const result = await model.generateContent("reply with the single word: ok");
    const text = result.response.text().trim().toLowerCase();
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Gemini returned an empty response" },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Validation failed";
    const friendly = /API key not valid|API_KEY_INVALID|\[(400|401|403) /.test(raw)
      ? "Key rejected by Gemini. Double-check it and make sure it's enabled for the Gemini API."
      : /\[429 /.test(raw)
        ? "Key is valid but rate-limited right now — try again in a minute."
        : raw;
    return NextResponse.json({ ok: false, error: friendly }, { status: 400 });
  }
}
