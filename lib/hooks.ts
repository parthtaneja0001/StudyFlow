"use client";

import { useCallback, useEffect, useState } from "react";
import type { Course } from "@/lib/types";
import { getCourse, listCourses } from "@/lib/repo";

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCourses();
      setCourses(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { courses, loading, error, refresh };
}

export function useCourseById(id: string) {
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const row = await getCourse(id);
      setCourse(row);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load course");
      setCourse(null);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { course, error, refresh };
}
