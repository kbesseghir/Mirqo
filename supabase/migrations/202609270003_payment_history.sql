create table if not exists public.commitment_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  paid_at date not null default current_date,
  due_date date,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists commitment_payments_user_date_idx on public.commitment_payments(user_id, paid_at desc);
create index if not exists commitment_payments_subscription_idx on public.commitment_payments(subscription_id, paid_at desc);
alter table public.commitment_payments enable row level security;
drop policy if exists "Users manage own commitment payments" on public.commitment_payments;
create policy "Users manage own commitment payments" on public.commitment_payments
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
