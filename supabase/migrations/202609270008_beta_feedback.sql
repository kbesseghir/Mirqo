create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feedback_type text not null check (feedback_type in ('bug','idea','confusing','other')),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists beta_feedback_created_at_idx on public.beta_feedback(created_at desc);
alter table public.beta_feedback enable row level security;
drop policy if exists "Users insert own beta feedback" on public.beta_feedback;
create policy "Users insert own beta feedback" on public.beta_feedback for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users read own beta feedback" on public.beta_feedback;
create policy "Users read own beta feedback" on public.beta_feedback for select to authenticated using ((select auth.uid()) = user_id);
grant select, insert on public.beta_feedback to authenticated;
