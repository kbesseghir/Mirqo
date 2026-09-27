-- Minimal first-party usage tracking: lets the product owner see where users drop off
-- (signup, first subscription added, detection method used, upgrade page viewed) without
-- adding a third-party analytics vendor yet.
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_user_id_idx on public.analytics_events (user_id, created_at desc);

alter table public.analytics_events enable row level security;

-- Users may record their own events but never read, edit, or delete any event row.
-- Reporting/analysis happens with the service_role key, which bypasses RLS.
drop policy if exists "Users insert own events" on public.analytics_events;
create policy "Users insert own events" on public.analytics_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
