"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers,
  NotebookPen,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { useCourse } from "@/components/course-provider";
import type { Course } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

export default function OverviewPage() {
  const { course } = useCourse();

  const { currentWeek, nextWeek, totalQuizzes, quizzesTaken, avgScore } = useMemo(() => {
    const now = Date.now();
    const current =
      course.weeks.find((w) => {
        const s = +new Date(w.startDate);
        const e = +new Date(w.endDate) + 86400000;
        return now >= s && now < e;
      }) ?? null;
    const next = current
      ? course.weeks.find((w) => w.week === current.week + 1) ?? null
      : course.weeks.find((w) => +new Date(w.startDate) > now) ?? null;
    const quizzed = course.weeks.filter((w) => w.quiz?.revealed);
    const avg = quizzed.length
      ? Math.round(
          (quizzed.reduce(
            (a, w) => a + ((w.quiz!.score ?? 0) / w.quiz!.questions.length) * 100,
            0
          ) /
            quizzed.length) *
            10
        ) / 10
      : null;
    return {
      currentWeek: current,
      nextWeek: next,
      totalQuizzes: course.weeks.length,
      quizzesTaken: quizzed.length,
      avgScore: avg,
    };
  }, [course]);

  const totalReadings = course.weeks.reduce((n, w) => n + w.readings.length, 0);
  const base = `/app/${course.id}`;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<CalendarClock />} label="Weeks" value={course.weeks.length} />
        <Stat
          icon={<HelpCircle />}
          label="Quizzes taken"
          value={`${quizzesTaken}/${totalQuizzes}`}
        />
        <Stat icon={<BookOpen />} label="Readings" value={totalReadings} />
        <Stat
          icon={<Trophy />}
          label="Avg quiz score"
          value={avgScore === null ? "—" : `${avgScore}%`}
          highlight={avgScore !== null}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 space-y-4">
          <WeekSpotlight week={currentWeek} label="This week" base={base} primary />
          {nextWeek && <WeekSpotlight week={nextWeek} label="Next up" base={base} />}
          {!currentWeek && !nextWeek && (
            <div className="panel p-8 text-center">
              <div className="mx-auto size-11 rounded-xl bg-white/[0.03] border border-[var(--color-border)] flex items-center justify-center mb-3">
                <CalendarClock className="size-5 text-white/50" />
              </div>
              <div className="text-white/80 font-medium text-[14px]">
                Term hasn&apos;t started yet
              </div>
              <div className="text-[13px] text-white/50 mt-1">
                Your first week begins{" "}
                {formatShortDate(course.weeks[0]?.startDate ?? new Date().toISOString())}.
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="panel p-5">
            <h3 className="text-[12px] font-semibold text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
              <GraduationCap className="size-3.5 text-emerald-300" />
              Course details
            </h3>
            <dl className="space-y-2.5 text-sm">
              {course.instructor && <Row label="Instructor" value={course.instructor} />}
              {course.term && <Row label="Term" value={course.term} />}
              {course.textbook && <Row label="Textbook" value={course.textbook} />}
              {course.rawSyllabusName && (
                <Row
                  label="Source"
                  value={
                    <span className="inline-flex items-center gap-1 text-white/70">
                      <FileText className="size-3.5" /> {course.rawSyllabusName}
                    </span>
                  }
                />
              )}
            </dl>
            {course.description && (
              <p className="mt-4 pt-4 border-t border-[var(--color-border)] text-[12px] text-white/55 leading-relaxed">
                {course.description}
              </p>
            )}
          </section>

          <section className="panel p-5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-white mb-3 uppercase tracking-wider">
              <Sparkles className="size-3.5 text-emerald-300" />
              Quick actions
            </div>
            <div className="space-y-1.5">
              <QuickAction
                href={`${base}/calendar`}
                icon={<CalendarClock className="size-3.5" />}
                label="Open calendar"
              />
              <QuickAction
                href={`${base}/notes`}
                icon={<NotebookPen className="size-3.5" />}
                label="Generate study notes"
              />
              <QuickAction
                href={`${base}/flashcards`}
                icon={<Layers className="size-3.5" />}
                label="Build a flashcard deck"
              />
            </div>
          </section>
        </aside>
      </div>

      {course.gradingPolicy && (
        <section className="panel p-5">
          <h3 className="text-[12px] font-semibold text-white mb-2 uppercase tracking-wider">
            Grading policy
          </h3>
          <p className="text-[13px] text-white/60 leading-relaxed whitespace-pre-wrap">
            {course.gradingPolicy}
          </p>
        </section>
      )}
    </div>
  );
}

function WeekSpotlight({
  week,
  label,
  base,
  primary,
}: {
  week: Course["weeks"][number] | null;
  label: string;
  base: string;
  primary?: boolean;
}) {
  if (!week) return null;
  const quizScore =
    week.quiz?.revealed ? `${week.quiz.score ?? 0}/${week.quiz.questions.length}` : null;

  return (
    <div className={primary ? "panel p-6 border-emerald-500/30" : "panel p-6"}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={
              primary
                ? "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded"
                : "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/55 bg-white/5 border border-[var(--color-border)] px-1.5 py-0.5 rounded"
            }
          >
            {primary && <span className="size-1 rounded-full bg-emerald-400" />}
            {label}
          </span>
          <span className="text-xs text-white/45">
            Week {week.week} · {formatShortDate(week.startDate)} – {formatShortDate(week.endDate)}
          </span>
        </div>
        {quizScore && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-mono">
            <Trophy className="size-3" /> {quizScore}
          </span>
        )}
      </div>

      <h2 className="text-[22px] font-semibold text-white tracking-tight mb-4 leading-tight">
        {week.topic}
      </h2>

      {week.objectives.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-white/45 mb-1.5 flex items-center gap-1 font-semibold">
            <Target className="size-3" /> Objectives
          </div>
          <ul className="space-y-1">
            {week.objectives.slice(0, 3).map((o, i) => (
              <li key={i} className="text-[13px] text-white/75 flex gap-2 leading-relaxed">
                <span className="text-emerald-400 mt-1 shrink-0 text-[9px]">●</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {week.readings.length > 0 && (
        <div className="mb-5">
          <div className="text-[10px] uppercase tracking-wider text-white/45 mb-1.5 flex items-center gap-1 font-semibold">
            <BookOpen className="size-3" /> Readings
          </div>
          <ul className="space-y-1">
            {week.readings.slice(0, 3).map((r) => (
              <li key={r.id} className="text-[13px] text-white/75 leading-relaxed">
                <span className="text-white/85">{r.title}</span>
                <span className="text-white/40">
                  {" · "}
                  {r.source}
                  {r.chapters ? ` · ${r.chapters}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--color-border)]">
        <Link
          href={`${base}/calendar`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-[12px] text-emerald-300 hover:bg-emerald-500/15 transition"
        >
          <HelpCircle className="size-3.5" /> {week.quiz ? "Open quiz" : "Take quiz"}
        </Link>
        <Link
          href={{ pathname: `${base}/flashcards`, query: { topic: week.topic } }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.03] border border-[var(--color-border)] text-[12px] text-white/75 hover:text-white hover:bg-white/[0.06] transition"
        >
          <Layers className="size-3.5" /> Flashcards
        </Link>
        <Link
          href={{ pathname: `${base}/notes`, query: { topic: week.topic } }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.03] border border-[var(--color-border)] text-[12px] text-white/75 hover:text-white hover:bg-white/[0.06] transition"
        >
          <NotebookPen className="size-3.5" /> Notes
        </Link>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="panel p-4">
      <div
        className={
          highlight
            ? "size-7 inline-flex items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
            : "size-7 inline-flex items-center justify-center rounded-lg bg-white/[0.04] border border-[var(--color-border)] text-white/70"
        }
      >
        <span className="[&>svg]:size-4">{icon}</span>
      </div>
      <div className="mt-3 text-[22px] font-semibold text-white tabular-nums tracking-tight">
        {value}
      </div>
      <div className="text-[11px] text-white/45 mt-0.5 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="text-[10px] uppercase tracking-wider text-white/40 w-20 pt-0.5 shrink-0 font-semibold">
        {label}
      </dt>
      <dd className="text-[13px] text-white/80 flex-1">{value}</dd>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/[0.04] transition-colors text-[13px] text-white/70 hover:text-white"
    >
      <span className="text-emerald-400/80">{icon}</span>
      <span className="flex-1">{label}</span>
      <ArrowRight className="size-3 text-white/25 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition" />
    </Link>
  );
}
