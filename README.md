# StudyFlow

Turn any college syllabus into a focused weekly study plan — with AI-generated notes, quizzes, and flashcards.

Upload a PDF or paste the syllabus text, pick your term window, and StudyFlow builds a week-by-week schedule anchored to the dates *you* choose. Each week gets readings, learning objectives, a 5-question quiz you can attempt and grade, a flashcard deck generator, and a notes generator in three styles (comprehensive, outline, cheatsheet).

Everything is stored locally in your browser (IndexedDB) — no accounts, no server database.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** for styling
- **Google Gemini 2.5 Flash** for all AI generation (syllabus parsing, quizzes, notes, flashcards)
- **Dexie** (IndexedDB) for local persistence
- **Framer Motion** for animations, **Lucide** for icons, **Sonner** for toasts

## Running locally

1. **Clone and install**
   ```bash
   git clone https://github.com/parthtaneja0001/StudyFlow.git
   cd StudyFlow
   npm install
   ```

2. **Add your Gemini API key**
   ```bash
   cp .env.local.example .env.local
   ```
   Open `.env.local` and replace the placeholder with your key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey). The free tier is enough for personal use.

3. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## How it works

- `app/api/parse-syllabus` — accepts a PDF or pasted text, sends it to Gemini with your term dates, returns a structured weekly plan.
- `app/api/generate-quiz` — builds 5 MCQ questions per week from the week's topic, objectives, and readings.
- `app/api/generate-flashcards` — generates spaced-repetition-style cards for any topic.
- `app/api/generate-notes` — writes markdown study notes (comprehensive, outline, or cheatsheet).
- All four routes use an exponential-backoff retry wrapper to handle Gemini's transient 503s.

## Project structure

```
app/
  api/                  # Gemini-backed API routes
  app/[id]/             # Course dashboard (overview, calendar, flashcards, notes)
  page.tsx              # Landing page with upload / paste
components/             # Shared UI (header, dropzone, markdown viewer, quiz modal)
lib/
  gemini.ts             # SDK client, schemas, retry helper
  db.ts                 # Dexie IndexedDB setup
  types.ts              # Course / Week / Quiz / Flashcard / Note types
  utils.ts              # Small shared helpers
```

## Build

```bash
npm run build
npm start
```

## License

MIT
