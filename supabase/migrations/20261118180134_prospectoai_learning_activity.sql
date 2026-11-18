create table public.learning_activity (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id text not null check (char_length(course_id) between 1 and 120),
  study_date date not null check (study_date between '1900-01-01' and '9999-12-31'),
  kind text not null check (kind in ('started', 'study', 'progress', 'completed')),
  minutes integer check (minutes between 1 and 1440),
  progress integer check (progress between 0 and 100),
  check (kind <> 'progress' or progress is not null),
  created_at timestamptz not null default now()
);

create index learning_activity_owner_day on public.learning_activity (user_id, study_date desc, id);
create unique index learning_activity_one_milestone on public.learning_activity (user_id, course_id, kind)
  where kind in ('started', 'completed');
create unique index learning_activity_distinct_progress on public.learning_activity (user_id, course_id, study_date, progress)
  where kind = 'progress';

alter table public.learning_activity enable row level security;
revoke all on public.learning_activity from public, anon, authenticated;
grant select, insert, update, delete on public.learning_activity to authenticated;
create policy "Read own learning activities" on public.learning_activity for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Add own learning activities" on public.learning_activity for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Edit own learning activities" on public.learning_activity for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Remove own learning activities" on public.learning_activity for delete to authenticated
  using ((select auth.uid()) = user_id);
