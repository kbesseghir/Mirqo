-- Repair debts that already had payments before debt balance tracking was installed.
update public.subscriptions s
set remaining_balance = greatest(
  0,
  coalesce(s.original_amount, s.amount) - coalesce((
    select sum(p.amount)
    from public.commitment_payments p
    where p.subscription_id = s.id
  ), 0)
)
where s.commitment_type = 'debt';

update public.subscriptions
set status = 'expired'
where commitment_type = 'debt'
  and remaining_balance = 0
  and status not in ('cancelled', 'expired');

