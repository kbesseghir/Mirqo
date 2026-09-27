-- Landing conversion events may be anonymous; no user or financial data is stored.
drop policy if exists "Users insert own events" on public.analytics_events;
create policy "Users and visitors insert minimal events" on public.analytics_events
  for insert to anon, authenticated
  with check (user_id is null or (select auth.uid()) = user_id);
grant insert on public.analytics_events to anon;
