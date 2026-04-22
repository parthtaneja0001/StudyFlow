"use client";

import { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import {
  computeStreak,
  listRecentActivities,
  type StreakSummary,
} from "@/lib/repo";
import { cn } from "@/lib/utils";

export function StreakPill({ className }: { className?: string }) {
  const [summary, setSummary] = useState<StreakSummary | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    listRecentActivities(180)
      .then((rows) => {
        if (!cancelled) setSummary(computeStreak(rows));
      })
      .catch(() => {
        if (!cancelled) setSummary({ current: 0, longest: 0, studiedToday: false, lastActivityAt: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [open]);

  if (!summary) return null;

  const isActive = summary.current > 0;
  const isToday = summary.studiedToday;

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors",
          isActive
            ? isToday
              ? "bg-amber-500/10 border border-amber-500/30 text-amber-200 hover:bg-amber-500/15"
              : "bg-white/[0.04] border border-[var(--color-border)] text-white/70 hover:border-[var(--color-border-strong)]"
            : "bg-white/[0.02] border border-[var(--color-border)] text-white/50 hover:text-white/80"
        )}
        aria-label={`Study streak: ${summary.current} days`}
      >
        <Flame
          className={cn(
            "size-3.5",
            isActive && isToday ? "text-amber-300" : "text-white/45"
          )}
          fill={isActive && isToday ? "currentColor" : "none"}
        />
        <span className="tabular-nums">{summary.current}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 panel p-4 shadow-xl z-50">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={cn(
                "size-9 rounded-lg flex items-center justify-center border",
                isToday
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-white/[0.04] border-[var(--color-border)] text-white/50"
              )}
            >
              <Flame className="size-5" fill={isToday ? "currentColor" : "none"} />
            </div>
            <div>
              <div className="text-[17px] font-semibold text-white tracking-tight">
                {summary.current}-day streak
              </div>
              <div className="text-[11px] text-white/50">
                {isToday
                  ? "You studied today. Nice."
                  : summary.current > 0
                    ? "Study today to keep it alive"
                    : "Start a streak today"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--color-border)]">
            <Stat label="Current" value={summary.current} suffix={summary.current === 1 ? "day" : "days"} />
            <Stat label="Longest" value={summary.longest} suffix={summary.longest === 1 ? "day" : "days"} />
          </div>

          <div className="mt-3 pt-3 border-t border-[var(--color-border)] text-[11px] text-white/45 leading-relaxed">
            Counts quizzes, generated notes, flashcards, and new courses.
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
        {label}
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-[20px] font-semibold text-white tabular-nums">{value}</span>
        <span className="text-[11px] text-white/45">{suffix}</span>
      </div>
    </div>
  );
}
