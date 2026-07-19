alter table public.profiles add column if not exists stripe_customer_id text unique;
alter table public.profiles add column if not exists stripe_subscription_id text unique;
alter table public.profiles add column if not exists stripe_subscription_status text;
alter table public.profiles add column if not exists stripe_current_period_end timestamptz;
create index if not exists profiles_stripe_customer_id_idx on public.profiles(stripe_customer_id);
create index if not exists profiles_stripe_subscription_id_idx on public.profiles(stripe_subscription_id);
create table if not exists public.stripe_webhook_events (id text primary key, processed_at timestamptz not null default now());
alter table public.stripe_webhook_events enable row level security;

create or replace function public.protect_profile_billing_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.is_pro := old.is_pro;
    new.plan := old.plan;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.stripe_subscription_status := old.stripe_subscription_status;
    new.stripe_current_period_end := old.stripe_current_period_end;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_billing_fields_trigger on public.profiles;
create trigger protect_profile_billing_fields_trigger
before update on public.profiles
for each row execute function public.protect_profile_billing_fields();