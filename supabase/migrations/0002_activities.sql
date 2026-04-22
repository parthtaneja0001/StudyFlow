-- Activities table: one row per meaningful study action.
-- Used to compute daily streaks and (later) heatmaps.

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'course_created',
    'quiz_taken',
    'notes_generated',
    'flashcards_generated'
  )),
  course_id uuid references public.courses(id) on delete set null,
  occurred_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_activities_user_time
  on public.activities (user_id, occurred_at desc);

alter table public.activities enable row level security;

drop policy if exists "activities self-read" on public.activities;
create policy "activities self-read" on public.activities
  for select using (auth.uid() = user_id);

drop policy if exists "activities self-insert" on public.activities;
create policy "activities self-insert" on public.activities
  for insert with check (auth.uid() = user_id);
