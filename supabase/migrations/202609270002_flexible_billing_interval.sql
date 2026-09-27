-- Flexible recurring schedules: every 2, 3, or a custom number of months.
alter table public.subscriptions
  add column if not exists billing_interval_months integer not null default 1;

alter table public.subscriptions drop constraint if exists subscriptions_billing_interval_months_check;
alter table public.subscriptions add constraint subscriptions_billing_interval_months_check
  check (billing_interval_months between 1 and 120);

update public.subscriptions
set billing_interval_months = 12
where billing_cycle = 'yearly' and billing_interval_months = 1;
