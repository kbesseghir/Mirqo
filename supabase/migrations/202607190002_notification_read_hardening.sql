-- Notification read rows must reference a subscription owned by the same user.
drop policy if exists "Users insert own notification reads" on public.notification_reads;
create policy "Users insert own notification reads"
on public.notification_reads
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.subscriptions
    where subscriptions.id = notification_reads.subscription_id
      and subscriptions.user_id = (select auth.uid())
  )
);