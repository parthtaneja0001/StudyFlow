export type WeekPlan = {
  week: number;
  startDate: string;
  endDate: string;
  topic: string;
  readings: Reading[];
  objectives: string[];
  quiz?: Quiz;
};

export type Reading = {
  id: string;
  title: string;
  source: string;
  chapters?: string;
  pages?: string;
  estimatedMinutes?: number;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type Quiz = {
  questions: QuizQuestion[];
  userAnswers: (number | null)[];
  revealed: boolean;
  score?: number;
  createdAt: string;
};

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  topic: string;
  chapter?: string;
  difficulty: "easy" | "medium" | "hard";
};

export type NoteDoc = {
  id: string;
  topic: string;
  markdown: string;
  createdAt: string;
};

export type Course = {
  id: string;
  title: string;
  code?: string;
  instructor?: string;
  term?: string;
  description?: string;
  textbook?: string;
  gradingPolicy?: string;
  createdAt: string;
  weeks: WeekPlan[];
  flashcards: Flashcard[];
  notes: NoteDoc[];
  rawSyllabusName?: string;
};
