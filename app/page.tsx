"use client";

import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, HelpCircle, Layers, NotebookPen } from "lucide-react";
import { Logo } from "@/components/logo";
import { UploadDropzone } from "@/components/upload-dropzone";
import { CourseCard } from "@/components/course-card";
import { SettingsButton } from "@/components/settings-button";
import { ApiKeyBanner } from "@/components/api-key-banner";
import { UserMenu } from "@/components/user-menu";
import { ImportLocalBanner } from "@/components/import-local-banner";
import { useCourses } from "@/lib/hooks";

export default function HomePage() {
  const { courses, refresh } = useCourses();

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b border-[var(--color-border)]/60">
        <Logo />
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-white/45 mr-2">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Gemini 2.5 Flash
          </div>
          <SettingsButton />
          <UserMenu />
        </div>
      </header>

      <main className="relative z-10 px-6 md:px-10 pt-16 md:pt-24 pb-24 max-w-5xl mx-auto">
        <section className="text-center mb-14 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] text-[11px] text-white/70 mb-7 font-medium"
          >
            <span className="size-1 rounded-full bg-emerald-400" />
            AI study planner for college students
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-[44px] md:text-[68px] font-semibold tracking-[-0.035em] leading-[1.02]"
          >
            Turn any syllabus into a
            <br className="hidden md:block" />{" "}
            <span className="text-gradient">focused weekly plan.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-6 text-[16px] md:text-[17px] text-white/55 max-w-xl mx-auto leading-relaxed"
          >
            Upload a PDF or paste the text. StudyFlow builds a week-by-week schedule, quizzes,
            flashcards, and polished notes from your actual material.
          </motion.p>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="max-w-3xl mx-auto space-y-4"
        >
          <ImportLocalBanner onImported={refresh} />
          <ApiKeyBanner />
          <UploadDropzone />
        </motion.section>

        <section className="mt-20 md:mt-24 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Feature
            icon={<CalendarDays className="size-4" />}
            title="Weekly calendar"
            body="Topics, readings, and dates anchored to the window you choose."
          />
          <Feature
            icon={<HelpCircle className="size-4" />}
            title="Per-week quizzes"
            body="5 MCQs per week. Answer, check, see explanations."
          />
          <Feature
            icon={<Layers className="size-4" />}
            title="Flashcards"
            body="Spaced-repetition decks generated from each chapter."
          />
          <Feature
            icon={<NotebookPen className="size-4" />}
            title="Study notes"
            body="Comprehensive, cheatsheet, or outline. Export in one click."
          />
        </section>

        {courses.length > 0 && (
          <section className="mt-24">
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-white">Your courses</h2>
              <span className="text-xs text-white/40">
                {courses.length} {courses.length === 1 ? "course" : "courses"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {courses.map((c) => (
                <CourseCard key={c.id} course={c} onDelete={refresh} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="relative z-10 border-t border-[var(--color-border)]/60 mt-10">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-6 flex items-center justify-between text-xs text-white/40">
          <div className="flex items-center gap-2">
            <Logo showText={false} />
            <span>Built for students.</span>
          </div>
          <div className="flex items-center gap-1.5">
            Protected by row-level security
            <ArrowRight className="size-3" />
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="panel panel-hover p-5">
      <div className="inline-flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 mb-4">
        {icon}
      </div>
      <h3 className="text-[14px] font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-[13px] text-white/55 leading-relaxed">{body}</p>
    </div>
  );
}
