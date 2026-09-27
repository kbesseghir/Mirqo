create table if not exists public.monthly_income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month, currency)
);

create table if not exists public.spending_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  category text not null check (category in ('food','gas','shopping','transport','health','entertainment','other')),
  spent_at date not null default current_date,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists monthly_income_user_month_idx on public.monthly_income(user_id, month);
create index if not exists spending_entries_user_date_idx on public.spending_entries(user_id, spent_at);
alter table public.monthly_income enable row level security;
alter table public.spending_entries enable row level security;
drop policy if exists "Users manage own monthly income" on public.monthly_income;
create policy "Users manage own monthly income" on public.monthly_income for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own spending entries" on public.spending_entries;
create policy "Users manage own spending entries" on public.spending_entries for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
