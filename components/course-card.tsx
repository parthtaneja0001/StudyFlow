"use client";

import Link from "next/link";
import { BookOpen, Calendar, Trash2, Layers, NotebookPen, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { deleteCourse } from "@/lib/db";
import type { Course } from "@/lib/types";
import { formatDate, truncate } from "@/lib/utils";

export function CourseCard({ course, onDelete }: { course: Course; onDelete?: () => void }) {
  const weekCount = course.weeks.length;
  const quizCount = course.weeks.filter((w) => w.quiz).length;
  const flashcardCount = course.flashcards.length;
  const noteCount = course.notes.length;

  return (
    <div className="panel panel-hover group relative overflow-hidden">
      <Link href={`/app/${course.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <BookOpen className="size-4 text-emerald-300" />
            </div>
            {course.code && (
              <span className="text-[10px] font-mono text-white/55 px-1.5 py-0.5 rounded-md bg-white/5 border border-[var(--color-border)] uppercase tracking-wider">
                {course.code}
              </span>
            )}
          </div>
          <span className="text-[11px] text-white/35">{formatDate(course.createdAt)}</span>
        </div>

        <div className="text-[15px] font-semibold text-white leading-snug mb-1">
          {truncate(course.title, 54)}
        </div>
        {course.instructor && (
          <div className="text-xs text-white/45 mb-4">{course.instructor}</div>
        )}

        <div className="grid grid-cols-4 gap-1 mt-4 pt-4 border-t border-[var(--color-border)]">
          <Stat icon={<Calendar className="size-3.5" />} value={weekCount} label="weeks" />
          <Stat icon={<HelpCircle className="size-3.5" />} value={quizCount} label="quizzes" />
          <Stat icon={<Layers className="size-3.5" />} value={flashcardCount} label="cards" />
          <Stat icon={<NotebookPen className="size-3.5" />} value={noteCount} label="notes" />
        </div>
      </Link>

      <button
        onClick={async (e) => {
          e.preventDefault();
          if (!confirm(`Delete "${course.title}"? This can't be undone.`)) return;
          await deleteCourse(course.id);
          toast.success("Course deleted");
          onDelete?.();
        }}
        className="absolute top-3 right-3 p-1.5 rounded-md text-white/30 hover:text-rose-300 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Delete course"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-white/55">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[13px] font-semibold text-white/85 tabular-nums">{value}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-white/35">{label}</span>
    </div>
  );
}
