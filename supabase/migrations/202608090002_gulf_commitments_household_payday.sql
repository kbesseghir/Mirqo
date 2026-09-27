-- Gulf-market features: broaden "subscriptions" to general recurring commitments
-- (BNPL installments, memberships, insurance), household member tagging for shared
-- costs, and a payday-aware reminder window.

alter table public.subscriptions
  add column if not exists commitment_type text not null default 'subscription'
  check (commitment_type in ('subscription', 'bnpl', 'membership', 'insurance', 'other'));

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  relation text,
  created_at timestamptz not null default now()
);

create index if not exists household_members_user_id_idx on public.household_members (user_id);

alter table public.household_members enable row level security;

drop policy if exists "Users manage own household members" on public.household_members;
create policy "Users manage own household members" on public.household_members
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.subscriptions
  add column if not exists household_member_id uuid references public.household_members(id) on delete set null;

alter table public.profiles
  add column if not exists payday_day smallint check (payday_day between 1 and 31);
