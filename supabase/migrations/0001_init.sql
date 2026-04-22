-- StudyFlow initial schema
-- Run this in Supabase SQL Editor once.

create extension if not exists "pgcrypto";

-- ==================== profiles ====================
-- One row per auth user. Holds per-user settings (API key).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gemini_api_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile when a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==================== courses ====================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  code text,
  instructor text,
  term text,
  description text,
  textbook text,
  grading_policy text,
  raw_syllabus_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_courses_user on public.courses(user_id, created_at desc);

-- ==================== weeks ====================
-- Each week stores its topic, readings, objectives, and optional quiz as JSON.
-- Quiz includes questions[], userAnswers[], revealed, score.
create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  week_number int not null,
  start_date date not null,
  end_date date not null,
  topic text not null,
  objectives jsonb not null default '[]'::jsonb,
  readings jsonb not null default '[]'::jsonb,
  quiz jsonb,
  unique (course_id, week_number)
);

create index if not exists idx_weeks_course on public.weeks(course_id, week_number);

-- ==================== flashcards ====================
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  front text not null,
  back text not null,
  topic text not null,
  chapter text,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz not null default now()
);

create index if not exists idx_flashcards_course on public.flashcards(course_id, topic);

-- ==================== notes ====================
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  topic text not null,
  markdown text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notes_course on public.notes(course_id, created_at desc);

-- ==================== updated_at touch trigger ====================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated on public.profiles;
create trigger profiles_touch_updated before update on public.profiles
  for each row execute procedure public.touch_updated_at();

drop trigger if exists courses_touch_updated on public.courses;
create trigger courses_touch_updated before update on public.courses
  for each row execute procedure public.touch_updated_at();

-- ==================== Row-Level Security ====================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.weeks enable row level security;
alter table public.flashcards enable row level security;
alter table public.notes enable row level security;

-- profiles: users see and edit only their own
drop policy if exists "profile self-read" on public.profiles;
create policy "profile self-read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profile self-insert" on public.profiles;
create policy "profile self-insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profile self-update" on public.profiles;
create policy "profile self-update" on public.profiles
  for update using (auth.uid() = id);

-- courses: users see and mutate only their own
drop policy if exists "course self-all" on public.courses;
create policy "course self-all" on public.courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- weeks / flashcards / notes: joined through parent course's user_id
drop policy if exists "weeks via course ownership" on public.weeks;
create policy "weeks via course ownership" on public.weeks
  for all using (
    exists (
      select 1 from public.courses c
      where c.id = weeks.course_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.courses c
      where c.id = weeks.course_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "flashcards via course ownership" on public.flashcards;
create policy "flashcards via course ownership" on public.flashcards
  for all using (
    exists (
      select 1 from public.courses c
      where c.id = flashcards.course_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.courses c
      where c.id = flashcards.course_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "notes via course ownership" on public.notes;
create policy "notes via course ownership" on public.notes
  for all using (
    exists (
      select 1 from public.courses c
      where c.id = notes.course_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.courses c
      where c.id = notes.course_id and c.user_id = auth.uid()
    )
  );
