import Dexie, { type EntityTable } from "dexie";
import type { Course } from "./types";

class StudyFlowDB extends Dexie {
  courses!: EntityTable<Course, "id">;

  constructor() {
    super("studyflow");
    this.version(1).stores({
      courses: "id, title, createdAt",
    });
  }
}

export const db = new StudyFlowDB();

export async function saveCourse(course: Course) {
  await db.courses.put(course);
  return course;
}

export async function getCourse(id: string) {
  return db.courses.get(id);
}

export async function updateCourse(id: string, patch: Partial<Course>) {
  const existing = await db.courses.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  await db.courses.put(updated);
  return updated;
}

export async function deleteCourse(id: string) {
  await db.courses.delete(id);
}

export async function listCourses() {
  return db.courses.orderBy("createdAt").reverse().toArray();
}
