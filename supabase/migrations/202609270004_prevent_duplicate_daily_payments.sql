-- Keep the earliest record when older app versions allowed repeated clicks.
delete from public.commitment_payments a
using public.commitment_payments b
where a.subscription_id = b.subscription_id
  and a.paid_at = b.paid_at
  and (a.created_at > b.created_at or (a.created_at = b.created_at and a.id > b.id));

create unique index if not exists commitment_payments_one_per_day_idx
  on public.commitment_payments(subscription_id, paid_at);
