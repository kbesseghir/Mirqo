-- A commitment can be paid on any date, but each scheduled due period can only be settled once.
-- Existing rows already preserve the scheduled date in due_date.
delete from public.commitment_payments a
using public.commitment_payments b
where a.subscription_id = b.subscription_id
  and a.due_date is not null
  and a.due_date = b.due_date
  and (a.created_at > b.created_at or (a.created_at = b.created_at and a.id > b.id));

drop index if exists public.commitment_payments_one_per_day_idx;

create unique index if not exists commitment_payments_one_per_due_period_idx
  on public.commitment_payments(subscription_id, due_date)
  where due_date is not null;

