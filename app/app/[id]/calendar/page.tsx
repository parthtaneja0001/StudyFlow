"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  HelpCircle,
  Layers,
  Loader2,
  NotebookPen,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCourse } from "@/components/course-provider";
import { useApiKey } from "@/components/api-key-provider";
import { updateCourse } from "@/lib/db";
import { fetchWithKey, MissingApiKeyError, parseJsonResponse } from "@/lib/api-key";
import type { Course, Quiz, QuizQuestion, WeekPlan } from "@/lib/types";
import { cn, formatShortDate } from "@/lib/utils";

export default function CalendarPage() {
  const { course } = useCourse();
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(() => {
    const current = currentWeekNumber(course);
    return new Set([current ?? course.weeks[0]?.week ?? 1]);
  });
  const [quizWeek, setQuizWeek] = useState<number | null>(null);

  const toggleWeek = (w: number) => {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  };

  const currentWeek = currentWeekNumber(course);
  const quizzesDone = course.weeks.filter((w) => w.quiz).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-white tracking-tight">Calendar</h1>
          <p className="text-[13px] text-white/50 mt-1">
            {course.weeks.length} weeks · {quizzesDone} quiz
            {quizzesDone === 1 ? "" : "zes"} taken
          </p>
        </div>
        <button
          onClick={() => setOpenWeeks(new Set(course.weeks.map((w) => w.week)))}
          className="btn-ghost text-xs"
        >
          Expand all
        </button>
      </div>

      <div className="space-y-2.5">
        {course.weeks.map((week) => {
          const open = openWeeks.has(week.week);
          const isCurrent = currentWeek === week.week;
          return (
            <WeekAccordion
              key={week.week}
              week={week}
              open={open}
              isCurrent={isCurrent}
              onToggle={() => toggleWeek(week.week)}
              onOpenQuiz={() => setQuizWeek(week.week)}
              courseId={course.id}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {quizWeek !== null && (
          <QuizModal
            key={quizWeek}
            course={course}
            weekNumber={quizWeek}
            onClose={() => setQuizWeek(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function WeekAccordion({
  week,
  open,
  isCurrent,
  onToggle,
  onOpenQuiz,
  courseId,
}: {
  week: WeekPlan;
  open: boolean;
  isCurrent: boolean;
  onToggle: () => void;
  onOpenQuiz: () => void;
  courseId: string;
}) {
  const hasQuiz = !!week.quiz;
  const quizScoreLabel =
    hasQuiz && week.quiz!.revealed
      ? `${week.quiz!.score ?? 0}/${week.quiz!.questions.length}`
      : null;

  return (
    <div
      className={cn(
        "panel overflow-hidden transition-colors",
        isCurrent && "border-emerald-500/35"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 md:p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div
          className={cn(
            "shrink-0 size-12 rounded-lg flex flex-col items-center justify-center border",
            isCurrent
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-white/[0.03] border-[var(--color-border)] text-white/70"
          )}
        >
          <span className="text-[9px] uppercase tracking-wider leading-none mb-0.5 opacity-70">
            Week
          </span>
          <span className="text-[18px] font-semibold leading-none tabular-nums">{week.week}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isCurrent && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded">
                <span className="size-1 rounded-full bg-emerald-400" />
                This week
              </span>
            )}
            {quizScoreLabel && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded">
                <Trophy className="size-3" />
                {quizScoreLabel}
              </span>
            )}
            <span className="text-xs text-white/40 flex items-center gap-1 font-mono">
              <CalendarDays className="size-3" />
              {formatShortDate(week.startDate)} – {formatShortDate(week.endDate)}
            </span>
          </div>
          <div className="text-[14px] font-semibold text-white truncate">{week.topic}</div>
          <div className="flex items-center gap-3 mt-1.5 text-[12px] text-white/45">
            {week.readings.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <BookOpen className="size-3" /> {week.readings.length} reading
                {week.readings.length === 1 ? "" : "s"}
              </span>
            )}
            {week.objectives.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Target className="size-3" /> {week.objectives.length} objective
                {week.objectives.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={cn(
            "size-4 text-white/35 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-5 pb-5 pt-1 border-t border-[var(--color-border)] grid grid-cols-1 md:grid-cols-2 gap-4">
              <SectionCard icon={<Target className="size-3.5" />} title="Learning objectives">
                {week.objectives.length === 0 ? (
                  <p className="text-xs text-white/40">No objectives listed.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {week.objectives.map((o, i) => (
                      <li
                        key={i}
                        className="text-[13px] text-white/75 leading-relaxed flex gap-2"
                      >
                        <span className="text-emerald-400 mt-1.5 shrink-0 text-[8px]">●</span>
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard icon={<BookOpen className="size-3.5" />} title="Readings">
                {week.readings.length === 0 ? (
                  <p className="text-xs text-white/40">No readings assigned.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {week.readings.map((r) => (
                      <li key={r.id}>
                        <div className="font-medium text-[13px] text-white/90 leading-snug">
                          {r.title}
                        </div>
                        <div className="text-[12px] text-white/45 mt-0.5">
                          {r.source}
                          {r.chapters && ` · ${r.chapters}`}
                          {r.pages && ` · ${r.pages}`}
                        </div>
                        {r.estimatedMinutes && (
                          <div className="mt-1 text-[11px] text-emerald-300/70 inline-flex items-center gap-1 font-mono">
                            <Clock className="size-3" /> ~{r.estimatedMinutes} min
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>

            <div className="px-4 md:px-5 pb-5 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenQuiz();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[12px] font-medium text-emerald-200 hover:bg-emerald-500/15 transition"
              >
                <HelpCircle className="size-3.5" />
                {hasQuiz ? "Open quiz" : "Take quiz"}
                {quizScoreLabel && (
                  <span className="ml-1 text-[10px] text-emerald-300/70 font-mono">
                    {quizScoreLabel}
                  </span>
                )}
              </button>
              <Link
                href={{
                  pathname: `/app/${courseId}/flashcards`,
                  query: { topic: week.topic, chapter: week.readings[0]?.chapters ?? "" },
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-white/[0.03] border border-[var(--color-border)] text-[12px] text-white/75 hover:text-white hover:bg-white/[0.06] transition"
              >
                <Layers className="size-3.5" /> Flashcards
              </Link>
              <Link
                href={{
                  pathname: `/app/${courseId}/notes`,
                  query: { topic: week.topic },
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-white/[0.03] border border-[var(--color-border)] text-[12px] text-white/75 hover:text-white hover:bg-white/[0.06] transition"
              >
                <NotebookPen className="size-3.5" /> Notes
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-[var(--color-border)] p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/50 mb-2.5 font-semibold">
        <span className="text-emerald-400">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function QuizModal({
  course,
  weekNumber,
  onClose,
}: {
  course: Course;
  weekNumber: number;
  onClose: () => void;
}) {
  const { openSettings } = useApiKey();
  const week = course.weeks.find((w) => w.week === weekNumber);
  const [loading, setLoading] = useState(false);
  const [localAnswers, setLocalAnswers] = useState<(number | null)[]>(
    week?.quiz?.userAnswers ?? []
  );

  if (!week) return null;
  const quiz = week.quiz;

  async function saveQuiz(update: Quiz) {
    const next = course.weeks.map((w) => (w.week === weekNumber ? { ...w, quiz: update } : w));
    await updateCourse(course.id, { weeks: next });
  }

  async function generate() {
    setLoading(true);
    try {
      const res = await fetchWithKey("/api/generate-quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courseTitle: course.title,
          textbook: course.textbook,
          topic: week!.topic,
          objectives: week!.objectives,
          readings: week!.readings.map((r) => ({
            title: r.title,
            source: r.source,
            chapters: r.chapters,
          })),
          count: 5,
        }),
      });
      const json = await parseJsonResponse<{ questions: Omit<QuizQuestion, "id">[] }>(res);
      const withIds: QuizQuestion[] = (json.questions ?? []).map(
        (q: Omit<QuizQuestion, "id">) => ({ ...q, id: crypto.randomUUID() })
      );
      const newQuiz: Quiz = {
        questions: withIds,
        userAnswers: new Array(withIds.length).fill(null),
        revealed: false,
        createdAt: new Date().toISOString(),
      };
      await saveQuiz(newQuiz);
      setLocalAnswers(newQuiz.userAnswers);
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        toast.error("Add your Gemini API key first", {
          action: { label: "Settings", onClick: openSettings },
        });
      } else {
        toast.error(err instanceof Error ? err.message : "Quiz generation failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function pick(qIdx: number, optIdx: number) {
    if (!quiz || quiz.revealed) return;
    const next = [...localAnswers];
    next[qIdx] = optIdx;
    setLocalAnswers(next);
    await saveQuiz({ ...quiz, userAnswers: next });
  }

  async function reveal() {
    if (!quiz) return;
    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (localAnswers[i] === q.correctIndex) score++;
    });
    await saveQuiz({ ...quiz, userAnswers: localAnswers, revealed: true, score });
    toast.success(`You scored ${score}/${quiz.questions.length}`);
  }

  async function retake() {
    if (!quiz) return;
    const reset = new Array(quiz.questions.length).fill(null);
    setLocalAnswers(reset);
    await saveQuiz({ ...quiz, userAnswers: reset, revealed: false, score: undefined });
  }

  const answeredCount = localAnswers.filter((a) => a !== null).length;
  const allAnswered = quiz && answeredCount === quiz.questions.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start justify-center overflow-y-auto p-4 md:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.22 }}
        className="relative w-full max-w-2xl my-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel p-6 md:p-8">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 mb-1 flex items-center gap-1.5 font-semibold">
                <HelpCircle className="size-3" />
                Week {week.week} Quiz
              </div>
              <h2 className="text-[20px] font-semibold text-white leading-tight tracking-tight">
                {week.topic}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-white/50 hover:text-white hover:bg-white/5 transition shrink-0"
            >
              <X className="size-5" />
            </button>
          </div>

          {!quiz ? (
            <div className="text-center py-10">
              <div className="mx-auto size-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-4">
                <HelpCircle className="size-5 text-emerald-300" />
              </div>
              <div className="text-[14px] font-medium text-white mb-1">
                Ready to test yourself?
              </div>
              <div className="text-[13px] text-white/50 mb-6">
                5 multiple-choice questions covering this week's material.
              </div>
              <button
                onClick={generate}
                disabled={loading}
                className="btn-primary inline-flex items-center gap-1.5"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {loading ? "Writing questions…" : "Generate quiz"}
              </button>
            </div>
          ) : (
            <>
              {!quiz.revealed && (
                <div className="mb-5">
                  <div className="flex items-center justify-between text-[11px] text-white/45 mb-1.5 font-mono">
                    <span>
                      {answeredCount}/{quiz.questions.length} answered
                    </span>
                    {allAnswered && (
                      <span className="text-emerald-300">Ready to check</span>
                    )}
                  </div>
                  <div className="h-[3px] bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all"
                      style={{
                        width: `${(answeredCount / quiz.questions.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {quiz.revealed && (
                <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="size-5 text-emerald-300 shrink-0" />
                    <div>
                      <div className="text-[17px] font-semibold text-white tracking-tight">
                        {quiz.score ?? 0}/{quiz.questions.length} correct
                      </div>
                      <div className="text-[12px] text-white/60">
                        {(quiz.score ?? 0) === quiz.questions.length
                          ? "Perfect score."
                          : (quiz.score ?? 0) >= quiz.questions.length * 0.7
                            ? "Solid — review what you missed."
                            : "Worth a second pass."}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {quiz.questions.map((q, qIdx) => (
                  <QuestionCard
                    key={q.id}
                    q={q}
                    qIdx={qIdx}
                    picked={localAnswers[qIdx] ?? null}
                    revealed={quiz.revealed}
                    onPick={(optIdx) => pick(qIdx, optIdx)}
                  />
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 pt-5 border-t border-[var(--color-border)]">
                <button
                  onClick={retake}
                  className="inline-flex items-center gap-1.5 text-[12px] text-white/55 hover:text-white transition px-2 py-1.5"
                >
                  <RefreshCw className="size-3" /> Reset
                </button>
                {!quiz.revealed ? (
                  <button
                    onClick={reveal}
                    disabled={!allAnswered}
                    className="btn-primary inline-flex items-center gap-1.5"
                  >
                    <Check className="size-4" /> Check answers
                  </button>
                ) : (
                  <button onClick={onClose} className="btn-ghost inline-flex items-center gap-1.5">
                    Done
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function QuestionCard({
  q,
  qIdx,
  picked,
  revealed,
  onPick,
}: {
  q: QuizQuestion;
  qIdx: number;
  picked: number | null;
  revealed: boolean;
  onPick: (optIdx: number) => void;
}) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-[var(--color-border)] p-4 md:p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="shrink-0 size-6 rounded-md bg-white/[0.04] border border-[var(--color-border)] flex items-center justify-center text-[11px] font-mono text-white/55">
          {qIdx + 1}
        </div>
        <div className="text-[14px] font-medium text-white leading-snug">{q.question}</div>
      </div>
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === q.correctIndex;
          const state = revealed
            ? isCorrect
              ? "correct"
              : isPicked
                ? "wrong"
                : "neutral"
            : isPicked
              ? "picked"
              : "idle";
          return (
            <button
              key={i}
              onClick={() => onPick(i)}
              disabled={revealed}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-md border text-[13px] transition flex items-start gap-3",
                state === "correct" && "bg-emerald-500/[0.08] border-emerald-500/50 text-emerald-100",
                state === "wrong" && "bg-rose-500/[0.08] border-rose-500/50 text-rose-100",
                state === "neutral" && "bg-white/[0.02] border-[var(--color-border)] text-white/55",
                state === "picked" && "bg-emerald-500/[0.08] border-emerald-500/40 text-white",
                state === "idle" &&
                  "bg-white/[0.02] border-[var(--color-border)] text-white/80 hover:border-[var(--color-border-strong)] hover:bg-white/[0.04]"
              )}
            >
              <span
                className={cn(
                  "shrink-0 size-5 rounded border flex items-center justify-center text-[10px] font-mono mt-0.5",
                  state === "correct" && "bg-emerald-500/25 border-emerald-400/60 text-emerald-100",
                  state === "wrong" && "bg-rose-500/25 border-rose-400/60 text-rose-100",
                  state === "picked" && "bg-emerald-500/20 border-emerald-400/50 text-white",
                  (state === "idle" || state === "neutral") && "border-[var(--color-border-strong)] text-white/45"
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {revealed && isCorrect && <Check className="size-4 shrink-0 mt-0.5" strokeWidth={3} />}
              {revealed && isPicked && !isCorrect && (
                <X className="size-4 shrink-0 mt-0.5" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className="mt-3 text-[13px] text-white/70 leading-relaxed bg-white/[0.02] border border-[var(--color-border)] rounded-md p-3">
          <span className="text-[10px] uppercase tracking-wider text-emerald-300/80 mr-2 font-semibold">
            Why
          </span>
          {q.explanation}
        </div>
      )}
    </div>
  );
}

function currentWeekNumber(course: Course): number | null {
  const now = Date.now();
  for (const w of course.weeks) {
    const start = +new Date(w.startDate);
    const end = +new Date(w.endDate) + 86400000;
    if (now >= start && now < end) return w.week;
  }
  return null;
}
