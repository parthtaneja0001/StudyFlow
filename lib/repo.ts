import { createClient } from "@/lib/supabase/client";
import type {
  Course,
  Flashcard,
  NoteDoc,
  Quiz,
  Reading,
  WeekPlan,
} from "@/lib/types";

// ---------- DB row types ----------
type CourseRow = {
  id: string;
  user_id: string;
  title: string;
  code: string | null;
  instructor: string | null;
  term: string | null;
  description: string | null;
  textbook: string | null;
  grading_policy: string | null;
  raw_syllabus_name: string | null;
  created_at: string;
  updated_at: string;
};

type WeekRow = {
  id: string;
  course_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  topic: string;
  objectives: string[];
  readings: Reading[];
  quiz: Quiz | null;
};

type FlashcardRow = {
  id: string;
  course_id: string;
  front: string;
  back: string;
  topic: string;
  chapter: string | null;
  difficulty: "easy" | "medium" | "hard";
  created_at: string;
};

type NoteRow = {
  id: string;
  course_id: string;
  topic: string;
  markdown: string;
  created_at: string;
};

// ---------- mappers ----------
function mapCourse(
  c: CourseRow,
  weeks: WeekRow[],
  flashcards: FlashcardRow[],
  notes: NoteRow[]
): Course {
  return {
    id: c.id,
    title: c.title,
    code: c.code ?? undefined,
    instructor: c.instructor ?? undefined,
    term: c.term ?? undefined,
    description: c.description ?? undefined,
    textbook: c.textbook ?? undefined,
    gradingPolicy: c.grading_policy ?? undefined,
    rawSyllabusName: c.raw_syllabus_name ?? undefined,
    createdAt: c.created_at,
    weeks: weeks
      .sort((a, b) => a.week_number - b.week_number)
      .map<WeekPlan>((w) => ({
        week: w.week_number,
        startDate: w.start_date,
        endDate: w.end_date,
        topic: w.topic,
        objectives: w.objectives ?? [],
        readings: w.readings ?? [],
        quiz: w.quiz ?? undefined,
      })),
    flashcards: flashcards.map<Flashcard>((f) => ({
      id: f.id,
      front: f.front,
      back: f.back,
      topic: f.topic,
      chapter: f.chapter ?? undefined,
      difficulty: f.difficulty,
    })),
    notes: notes.map<NoteDoc>((n) => ({
      id: n.id,
      topic: n.topic,
      markdown: n.markdown,
      createdAt: n.created_at,
    })),
  };
}

// ---------- queries ----------
export async function listCourses(): Promise<Course[]> {
  const db = createClient();
  const { data, error } = await db
    .from("courses")
    .select(
      `id, user_id, title, code, instructor, term, description, textbook,
       grading_policy, raw_syllabus_name, created_at, updated_at,
       weeks ( id, course_id, week_number, start_date, end_date, topic, objectives, readings, quiz ),
       flashcards ( id, course_id, front, back, topic, chapter, difficulty, created_at ),
       notes ( id, course_id, topic, markdown, created_at )`
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const {
      weeks = [],
      flashcards = [],
      notes = [],
      ...course
    } = row as CourseRow & {
      weeks: WeekRow[];
      flashcards: FlashcardRow[];
      notes: NoteRow[];
    };
    return mapCourse(course, weeks, flashcards, notes);
  });
}

export async function getCourse(id: string): Promise<Course | null> {
  const db = createClient();
  const { data, error } = await db
    .from("courses")
    .select(
      `id, user_id, title, code, instructor, term, description, textbook,
       grading_policy, raw_syllabus_name, created_at, updated_at,
       weeks ( id, course_id, week_number, start_date, end_date, topic, objectives, readings, quiz ),
       flashcards ( id, course_id, front, back, topic, chapter, difficulty, created_at ),
       notes ( id, course_id, topic, markdown, created_at )`
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const {
    weeks = [],
    flashcards = [],
    notes = [],
    ...course
  } = data as CourseRow & {
    weeks: WeekRow[];
    flashcards: FlashcardRow[];
    notes: NoteRow[];
  };
  return mapCourse(course, weeks, flashcards, notes);
}

// ---------- course mutations ----------
export type ParsedSyllabus = {
  title: string;
  code?: string;
  instructor?: string;
  term?: string;
  description?: string;
  textbook?: string;
  gradingPolicy?: string;
  weeks: {
    week: number;
    startDate: string;
    endDate: string;
    topic: string;
    objectives?: string[];
    readings?: (Omit<Reading, "id"> & { id?: string })[];
  }[];
};

export async function createCourseFromSyllabus(
  syllabus: ParsedSyllabus,
  sourceName: string
): Promise<string> {
  const db = createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: inserted, error } = await db
    .from("courses")
    .insert({
      user_id: user.id,
      title: syllabus.title ?? "Untitled course",
      code: syllabus.code ?? null,
      instructor: syllabus.instructor ?? null,
      term: syllabus.term ?? null,
      description: syllabus.description ?? null,
      textbook: syllabus.textbook ?? null,
      grading_policy: syllabus.gradingPolicy ?? null,
      raw_syllabus_name: sourceName,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const courseId = inserted.id as string;

  if (syllabus.weeks && syllabus.weeks.length > 0) {
    const weekRows = syllabus.weeks.map((w) => ({
      course_id: courseId,
      week_number: w.week,
      start_date: w.startDate,
      end_date: w.endDate,
      topic: w.topic,
      objectives: w.objectives ?? [],
      readings: (w.readings ?? []).map((r) => ({
        id: r.id ?? crypto.randomUUID(),
        title: r.title,
        source: r.source,
        chapters: r.chapters,
        pages: r.pages,
        estimatedMinutes: r.estimatedMinutes,
      })),
      quiz: null,
    }));
    const { error: wErr } = await db.from("weeks").insert(weekRows);
    if (wErr) throw new Error(wErr.message);
  }

  await recordActivity("course_created", courseId);
  return courseId;
}

export async function deleteCourse(id: string): Promise<void> {
  const db = createClient();
  const { error } = await db.from("courses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- quiz on a week ----------
export async function saveQuizForWeek(
  courseId: string,
  weekNumber: number,
  quiz: Quiz | null,
  opts: { logActivity?: boolean } = {}
): Promise<void> {
  const db = createClient();
  const { error } = await db
    .from("weeks")
    .update({ quiz })
    .eq("course_id", courseId)
    .eq("week_number", weekNumber);
  if (error) throw new Error(error.message);
  if (opts.logActivity) {
    await recordActivity("quiz_taken", courseId);
  }
}

// ---------- flashcards ----------
export async function addFlashcards(
  courseId: string,
  cards: Omit<Flashcard, "id">[]
): Promise<Flashcard[]> {
  const db = createClient();
  const rows = cards.map((c) => ({
    course_id: courseId,
    front: c.front,
    back: c.back,
    topic: c.topic,
    chapter: c.chapter ?? null,
    difficulty: c.difficulty,
  }));
  const { data, error } = await db
    .from("flashcards")
    .insert(rows)
    .select("id, front, back, topic, chapter, difficulty");
  if (error) throw new Error(error.message);
  if ((data ?? []).length > 0) {
    await recordActivity("flashcards_generated", courseId);
  }
  return (data ?? []).map<Flashcard>((f) => ({
    id: f.id,
    front: f.front,
    back: f.back,
    topic: f.topic,
    chapter: f.chapter ?? undefined,
    difficulty: f.difficulty,
  }));
}

export async function deleteFlashcardsByTopic(
  courseId: string,
  topic: string
): Promise<void> {
  const db = createClient();
  const { error } = await db
    .from("flashcards")
    .delete()
    .eq("course_id", courseId)
    .eq("topic", topic);
  if (error) throw new Error(error.message);
}

// ---------- notes ----------
export async function addNote(
  courseId: string,
  note: { topic: string; markdown: string }
): Promise<NoteDoc> {
  const db = createClient();
  const { data, error } = await db
    .from("notes")
    .insert({
      course_id: courseId,
      topic: note.topic,
      markdown: note.markdown,
    })
    .select("id, topic, markdown, created_at")
    .single();
  if (error) throw new Error(error.message);
  await recordActivity("notes_generated", courseId);
  return {
    id: data.id,
    topic: data.topic,
    markdown: data.markdown,
    createdAt: data.created_at,
  };
}

export async function deleteNote(id: string): Promise<void> {
  const db = createClient();
  const { error } = await db.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- activity / streak ----------
export type ActivityKind =
  | "course_created"
  | "quiz_taken"
  | "notes_generated"
  | "flashcards_generated";

type ActivityRow = {
  id: string;
  kind: ActivityKind;
  course_id: string | null;
  occurred_at: string;
};

export async function recordActivity(
  kind: ActivityKind,
  courseId?: string | null
): Promise<void> {
  const db = createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return; // Silently skip when not signed in

  // fire-and-forget; streak UI tolerates missing rows
  await db.from("activities").insert({
    user_id: user.id,
    kind,
    course_id: courseId ?? null,
  });
}

/**
 * Pull the last N days of activity events (default 180) — enough to compute
 * streak + longest streak client-side without over-fetching.
 */
export async function listRecentActivities(days = 180): Promise<ActivityRow[]> {
  const db = createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await db
    .from("activities")
    .select("id, kind, course_id, occurred_at")
    .gte("occurred_at", since.toISOString())
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type StreakSummary = {
  current: number;
  longest: number;
  studiedToday: boolean;
  lastActivityAt: string | null;
};

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Compute streak metrics from a flat list of activity rows. */
export function computeStreak(activities: Pick<ActivityRow, "occurred_at">[]): StreakSummary {
  if (activities.length === 0) {
    return { current: 0, longest: 0, studiedToday: false, lastActivityAt: null };
  }

  const dateKeys = new Set(activities.map((a) => toLocalDateKey(a.occurred_at)));
  const sorted = [...dateKeys].sort(); // ascending YYYY-MM-DD works lexicographically

  // Longest run in sorted unique-day set
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const diff = Math.round((+cur - +prev) / 86400000);
    if (diff === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current streak: walk back from today (or yesterday if no activity today)
  const today = toLocalDateKey(new Date().toISOString());
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toLocalDateKey(d.toISOString());
  })();

  const studiedToday = dateKeys.has(today);
  let cursor = studiedToday ? today : dateKeys.has(yesterday) ? yesterday : null;
  let current = 0;
  while (cursor && dateKeys.has(cursor)) {
    current += 1;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = toLocalDateKey(d.toISOString());
  }

  const lastActivityAt = activities[0]?.occurred_at ?? null;

  return { current, longest, studiedToday, lastActivityAt };
}
