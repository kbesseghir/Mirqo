-- Database-side companion to BETA_ALL_PRO. It prevents the free-limit trigger
-- from blocking beta users while keeping the production entitlement model intact.
create table if not exists public.beta_config (
  key text primary key,
  enabled boolean not null default false
);
alter table public.beta_config enable row level security;
revoke all on public.beta_config from anon, authenticated;
insert into public.beta_config(key, enabled) values ('all_pro', true)
on conflict (key) do update set enabled = excluded.enabled;

create or replace function public.enforce_free_subscription_limit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_has_unlimited boolean; v_count integer;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then raise exception 'unauthorized_subscription_owner'; end if;
  if exists (select 1 from public.beta_config where key = 'all_pro' and enabled = true) then return new; end if;
  select (coalesce(is_pro, false) or plan = 'pro' or trial_ends_at > now() or activation_ends_at > now())
    into v_has_unlimited from public.profiles where user_id = new.user_id for update;
  if not found then raise exception 'profile_not_found'; end if;
  if not coalesce(v_has_unlimited, false) then
    select count(*) into v_count from public.subscriptions where user_id = new.user_id;
    if v_count >= 3 then raise exception 'free_subscription_limit'; end if;
  end if;
  return new;
end;
$$;
