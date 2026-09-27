-- Type-specific details for bills and installment commitments.
alter table public.subscriptions
  add column if not exists amount_is_variable boolean not null default false,
  add column if not exists installment_count integer,
  add column if not exists installments_paid integer;

alter table public.subscriptions drop constraint if exists subscriptions_installment_count_check;
alter table public.subscriptions add constraint subscriptions_installment_count_check
  check (installment_count is null or installment_count between 1 and 600);

alter table public.subscriptions drop constraint if exists subscriptions_installments_paid_check;
alter table public.subscriptions add constraint subscriptions_installments_paid_check
  check (
    installments_paid is null
    or (
      installments_paid >= 0
      and installment_count is not null
      and installments_paid <= installment_count
    )
  );
