-- Extend commitment_type with 'bill' (fixed household bills) and 'debt' (personal
-- loans between family/friends), plus an optional free-text counterparty for debts.

alter table public.subscriptions drop constraint if exists subscriptions_commitment_type_check;
alter table public.subscriptions add constraint subscriptions_commitment_type_check
  check (commitment_type in ('subscription', 'bnpl', 'membership', 'insurance', 'bill', 'debt', 'other'));

alter table public.subscriptions
  add column if not exists counterparty_name text check (char_length(counterparty_name) <= 100);
