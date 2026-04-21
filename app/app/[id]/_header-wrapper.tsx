"use client";

import { CourseHeader } from "@/components/course-header";
import { useCourse } from "@/components/course-provider";

export function CourseHeaderWrapper() {
  const { course } = useCourse();
  return <CourseHeader course={course} />;
}
