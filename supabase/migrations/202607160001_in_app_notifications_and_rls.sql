create table if not exists public.notification_reads (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 subscription_id uuid not null references public.subscriptions(id) on delete cascade, renewal_date date not null,
 reminder_days_before integer not null check (reminder_days_before in (1,3,7,14)), read_at timestamptz not null default now(),
 unique(user_id,subscription_id,renewal_date,reminder_days_before)
);
create index if not exists notification_reads_user_id_idx on public.notification_reads(user_id);
alter table public.notification_reads enable row level security;
drop policy if exists "Users view own notification reads" on public.notification_reads;
drop policy if exists "Users insert own notification reads" on public.notification_reads;
create policy "Users view own notification reads" on public.notification_reads for select to authenticated using ((select auth.uid())=user_id);
create policy "Users insert own notification reads" on public.notification_reads for insert to authenticated with check ((select auth.uid())=user_id);
alter table public.subscriptions enable row level security;
drop policy if exists "Users select own subscriptions" on public.subscriptions;
drop policy if exists "Users insert own subscriptions" on public.subscriptions;
drop policy if exists "Users update own subscriptions" on public.subscriptions;
drop policy if exists "Users delete own subscriptions" on public.subscriptions;
create policy "Users select own subscriptions" on public.subscriptions for select to authenticated using ((select auth.uid())=user_id);
create policy "Users insert own subscriptions" on public.subscriptions for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Users update own subscriptions" on public.subscriptions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users delete own subscriptions" on public.subscriptions for delete to authenticated using ((select auth.uid())=user_id);
