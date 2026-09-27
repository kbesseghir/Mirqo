alter table public.subscriptions
  add column if not exists debt_direction text,
  add column if not exists original_amount numeric(14,2),
  add column if not exists remaining_balance numeric(14,2);

alter table public.subscriptions drop constraint if exists subscriptions_debt_direction_check;
alter table public.subscriptions add constraint subscriptions_debt_direction_check
  check (debt_direction is null or debt_direction in ('i_owe', 'owed_to_me'));
alter table public.subscriptions drop constraint if exists subscriptions_original_amount_check;
alter table public.subscriptions add constraint subscriptions_original_amount_check
  check (original_amount is null or original_amount >= 0);
alter table public.subscriptions drop constraint if exists subscriptions_remaining_balance_check;
alter table public.subscriptions add constraint subscriptions_remaining_balance_check
  check (remaining_balance is null or remaining_balance >= 0);

update public.subscriptions
set debt_direction = coalesce(debt_direction, 'i_owe'),
    original_amount = coalesce(original_amount, amount),
    remaining_balance = coalesce(remaining_balance, original_amount, amount)
where commitment_type = 'debt';

