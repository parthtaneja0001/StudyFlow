"use client";

import { createContext, useContext, useMemo } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCourseById } from "@/lib/hooks";
import type { Course } from "@/lib/types";

type Ctx = {
  course: Course;
  refresh: () => Promise<void>;
};

const CourseContext = createContext<Ctx | null>(null);

export function useCourse() {
  const c = useContext(CourseContext);
  if (!c) throw new Error("useCourse must be used inside CourseProvider");
  return c;
}

export function CourseProvider({ id, children }: { id: string; children: React.ReactNode }) {
  const { course, refresh } = useCourseById(id);

  const value = useMemo(() => (course ? { course, refresh } : null), [course, refresh]);

  if (course === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-white/50">
        <Loader2 className="size-5 animate-spin mr-2" />
        Loading course…
      </div>
    );
  }

  if (course === null || !value) {
    notFound();
  }

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}
