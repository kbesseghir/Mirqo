alter table public.profiles add column if not exists trial_started_at timestamptz;
alter table public.profiles add column if not exists trial_ends_at timestamptz;
create index if not exists profiles_trial_ends_at_idx on public.profiles(trial_ends_at);