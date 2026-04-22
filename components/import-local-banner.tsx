"use client";

import { useEffect, useState } from "react";
import { Database, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { db as localDb, listCourses as listLocalCourses } from "@/lib/db";
import {
  addFlashcards,
  addNote,
  createCourseFromSyllabus,
  saveQuizForWeek,
} from "@/lib/repo";
import { createClient } from "@/lib/supabase/client";

const IMPORTED_FLAG_KEY = "studyflow:imported-local";
const DISMISSED_FLAG_KEY = "studyflow:import-dismissed";

export function ImportLocalBanner({ onImported }: { onImported?: () => void }) {
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem(IMPORTED_FLAG_KEY)) return;
      if (window.localStorage.getItem(DISMISSED_FLAG_KEY)) return;

      // Must be signed in
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      // Must have Dexie courses locally
      try {
        const rows = await listLocalCourses();
        if (cancelled) return;
        if (rows.length > 0) {
          setCount(rows.length);
          setShow(true);
        }
      } catch {
        // Dexie not available (e.g. SSR, private mode) — silently skip
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function importAll() {
    setRunning(true);
    try {
      const rows = await listLocalCourses();
      let imported = 0;
      for (const c of rows) {
        try {
          const newId = await createCourseFromSyllabus(
            {
              title: c.title,
              code: c.code,
              instructor: c.instructor,
              term: c.term,
              description: c.description,
              textbook: c.textbook,
              gradingPolicy: c.gradingPolicy,
              weeks: c.weeks.map((w) => ({
                week: w.week,
                startDate: w.startDate,
                endDate: w.endDate,
                topic: w.topic,
                objectives: w.objectives,
                readings: w.readings,
              })),
            },
            c.rawSyllabusName ?? "Imported from browser"
          );

          // Restore per-week quizzes (if any)
          for (const w of c.weeks) {
            if (w.quiz) await saveQuizForWeek(newId, w.week, w.quiz);
          }

          // Bulk insert flashcards
          if (c.flashcards.length > 0) {
            await addFlashcards(
              newId,
              c.flashcards.map(({ front, back, topic, chapter, difficulty }) => ({
                front,
                back,
                topic,
                chapter,
                difficulty,
              }))
            );
          }

          // Insert notes one at a time
          for (const n of c.notes) {
            await addNote(newId, { topic: n.topic, markdown: n.markdown });
          }

          imported++;
        } catch (err) {
          console.error("Failed to import course", c.title, err);
        }
      }

      // Clear the local Dexie DB (data is safely in Supabase now)
      try {
        await localDb.courses.clear();
      } catch {
        // ignore
      }

      window.localStorage.setItem(IMPORTED_FLAG_KEY, new Date().toISOString());
      toast.success(`Imported ${imported} course${imported === 1 ? "" : "s"}`);
      setShow(false);
      onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setRunning(false);
    }
  }

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISSED_FLAG_KEY, "1");
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="w-full max-w-3xl mx-auto flex items-center gap-3 panel p-4 md:px-5 md:py-4 border-emerald-500/30">
      <div className="shrink-0 size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-300">
        <Database className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-white leading-tight">
          Import {count} course{count === 1 ? "" : "s"} from this browser?
        </div>
        <div className="text-[12px] text-white/55 mt-0.5 leading-relaxed">
          We found StudyFlow data saved locally. Move it to your account so it&apos;s available
          on any device.
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={importAll}
          disabled={running}
          className="btn-primary inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12px]"
        >
          {running && <Loader2 className="size-3.5 animate-spin" />}
          {running ? "Importing" : "Import"}
        </button>
        <button
          onClick={dismiss}
          disabled={running}
          className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
