-- Bootstrap schema for fresh Supabase projects.
-- Safe to re-run:
-- - does NOT drop tables
-- - does recreate policies using `drop policy if exists`
-- Prefer adding future changes as new files under `supabase/migrations/`.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.levels (
  id text primary key,
  owner_user_id uuid not null default auth.uid(),
  title text not null,
  definition jsonb not null,
  published boolean not null default true,
  author_name text,
  difficulty text,
  description text,
  structures_used text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger levels_set_updated_at
before update on public.levels
for each row
execute function public.set_updated_at();

create table if not exists public.level_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  session_id uuid not null,
  level_id text not null,
  level_title text not null,
  outcome text,
  step_count integer not null default 0,
  elapsed_ms integer not null default 0,
  operation_usage jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz
);

create index if not exists level_attempts_level_id_idx on public.level_attempts(level_id);
create index if not exists level_attempts_user_id_idx on public.level_attempts(user_id);
create index if not exists level_attempts_started_at_idx on public.level_attempts(started_at desc);

create table if not exists public.interaction_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  attempt_id uuid references public.level_attempts(id) on delete set null,
  session_id uuid not null,
  level_id text,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists interaction_logs_level_id_idx on public.interaction_logs(level_id);
create index if not exists interaction_logs_attempt_id_idx on public.interaction_logs(attempt_id);
create index if not exists interaction_logs_created_at_idx on public.interaction_logs(created_at desc);

create or replace view public.level_public_stats as
select
  level_id,
  count(*) filter (where ended_at is not null) as attempts_finished,
  count(*) filter (where outcome = 'success') as attempts_successful,
  round(
    (
      count(*) filter (where outcome = 'success')::numeric
      / nullif(count(*) filter (where ended_at is not null), 0)
    ),
    4
  ) as success_rate,
  round(avg(step_count) filter (where ended_at is not null), 2) as avg_steps,
  round(avg(elapsed_ms) filter (where ended_at is not null), 2) as avg_elapsed_ms
from public.level_attempts
group by level_id;

alter table public.levels enable row level security;
alter table public.level_attempts enable row level security;
alter table public.interaction_logs enable row level security;

drop policy if exists "levels_select_published" on public.levels;
create policy "levels_select_published"
on public.levels
for select
to authenticated
using (published = true);

drop policy if exists "levels_insert_own" on public.levels;
create policy "levels_insert_own"
on public.levels
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "levels_update_own" on public.levels;
create policy "levels_update_own"
on public.levels
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "levels_delete_own" on public.levels;
create policy "levels_delete_own"
on public.levels
for delete
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "attempts_select_own" on public.level_attempts;
create policy "attempts_select_own"
on public.level_attempts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "attempts_insert_own" on public.level_attempts;
create policy "attempts_insert_own"
on public.level_attempts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "attempts_update_own" on public.level_attempts;
create policy "attempts_update_own"
on public.level_attempts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "logs_select_own" on public.interaction_logs;
create policy "logs_select_own"
on public.interaction_logs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "logs_insert_own" on public.interaction_logs;
create policy "logs_insert_own"
on public.interaction_logs
for insert
to authenticated
with check (user_id = auth.uid());
