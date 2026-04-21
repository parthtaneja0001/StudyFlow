"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Calendar, Layers, LayoutDashboard, NotebookPen } from "lucide-react";
import { Logo } from "@/components/logo";
import { SettingsButton } from "@/components/settings-button";
import { cn } from "@/lib/utils";
import type { Course } from "@/lib/types";

const TABS = [
  { key: "overview", label: "Overview", href: "", icon: LayoutDashboard },
  { key: "calendar", label: "Calendar", href: "/calendar", icon: Calendar },
  { key: "flashcards", label: "Flashcards", href: "/flashcards", icon: Layers },
  { key: "notes", label: "Notes", href: "/notes", icon: NotebookPen },
];

export function CourseHeader({ course }: { course: Course }) {
  const pathname = usePathname();
  const base = `/app/${course.id}`;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/"
              className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <Logo showText={false} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {course.code && (
                  <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {course.code}
                  </span>
                )}
                <h1 className="text-[14px] font-semibold text-white truncate max-w-[280px] md:max-w-[520px]">
                  {course.title}
                </h1>
              </div>
              {(course.instructor || course.term) && (
                <div className="text-xs text-white/45 truncate">
                  {[course.instructor, course.term].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          </div>
          <SettingsButton />
        </div>

        <nav className="flex items-center gap-0 -mb-px">
          {TABS.map((t) => {
            const href = `${base}${t.href}`;
            const active =
              t.href === ""
                ? pathname === base
                : pathname === href || pathname.startsWith(href + "/");
            const Icon = t.icon;
            return (
              <Link
                key={t.key}
                href={href}
                className={cn(
                  "relative inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] border-b-2 -mb-px transition-colors",
                  active
                    ? "text-white border-emerald-400"
                    : "text-white/50 border-transparent hover:text-white/80"
                )}
              >
                <Icon className="size-3.5" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
