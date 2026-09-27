-- Replace the single household_member_id tag on subscriptions with a proper
-- join table so a subscription can be shared by several household members,
-- split evenly, enabling a real settle-up total per person.

create table if not exists public.subscription_splits (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  household_member_id uuid not null references public.household_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (subscription_id, household_member_id)
);

create index if not exists subscription_splits_subscription_id_idx on public.subscription_splits (subscription_id);
create index if not exists subscription_splits_household_member_id_idx on public.subscription_splits (household_member_id);

alter table public.subscription_splits enable row level security;

drop policy if exists "Users manage splits on own subscriptions" on public.subscription_splits;
create policy "Users manage splits on own subscriptions" on public.subscription_splits
  for all to authenticated
  using (exists (select 1 from public.subscriptions s where s.id = subscription_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.subscriptions s where s.id = subscription_id and s.user_id = (select auth.uid())));

grant select, insert, update, delete on public.subscription_splits to authenticated;

insert into public.subscription_splits (subscription_id, household_member_id)
select id, household_member_id from public.subscriptions where household_member_id is not null
on conflict do nothing;

alter table public.subscriptions drop column if exists household_member_id;
