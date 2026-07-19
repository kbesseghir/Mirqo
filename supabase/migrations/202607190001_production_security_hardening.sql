-- Keep plan entitlements server-controlled and enforce the free limit atomically.
alter table public.profiles enable row level security;
drop policy if exists "Users select own profile" on public.profiles;
create policy "Users select own profile" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.protect_profile_entitlements()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.is_pro := old.is_pro;
    new.plan := old.plan;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.stripe_subscription_status := old.stripe_subscription_status;
    new.stripe_current_period_end := old.stripe_current_period_end;
    if coalesce(current_setting('app.activation_redemption', true), '') <> 'true' then
      new.activation_ends_at := old.activation_ends_at;
    end if;
    if coalesce(current_setting('app.trial_start', true), '') <> 'true' then
      new.trial_started_at := old.trial_started_at;
      new.trial_ends_at := old.trial_ends_at;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_billing_fields_trigger on public.profiles;
drop trigger if exists protect_activation_entitlement_trigger on public.profiles;
drop trigger if exists protect_profile_entitlements_trigger on public.profiles;
create trigger protect_profile_entitlements_trigger before update on public.profiles for each row execute function public.protect_profile_entitlements();

create or replace function public.start_pro_trial()
returns timestamptz language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user_id uuid := auth.uid(); v_ends_at timestamptz;
begin
  if v_user_id is null then raise exception 'unauthenticated'; end if;
  perform 1 from public.profiles where user_id = v_user_id for update;
  if not found then raise exception 'profile_not_found'; end if;
  if exists (select 1 from public.profiles where user_id = v_user_id and (is_pro = true or plan = 'pro' or activation_ends_at > now())) then
    raise exception 'already_pro';
  end if;
  if exists (select 1 from public.profiles where user_id = v_user_id and trial_started_at is not null) then
    raise exception 'trial_already_used';
  end if;
  perform set_config('app.trial_start', 'true', true);
  update public.profiles set trial_started_at = now(), trial_ends_at = now() + interval '7 days'
  where user_id = v_user_id returning trial_ends_at into v_ends_at;
  return v_ends_at;
end;
$$;
revoke all on function public.start_pro_trial() from public;
grant execute on function public.start_pro_trial() to authenticated;

create or replace function public.enforce_free_subscription_limit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_has_unlimited boolean; v_count integer;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then raise exception 'unauthorized_subscription_owner'; end if;
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
drop trigger if exists enforce_free_subscription_limit_trigger on public.subscriptions;
create trigger enforce_free_subscription_limit_trigger before insert on public.subscriptions for each row execute function public.enforce_free_subscription_limit();

revoke all on function public.is_activation_admin() from anon;
revoke all on function public.create_pro_activation_code(text, integer, timestamptz) from anon;
revoke all on function public.list_pro_activation_codes() from anon;
revoke all on function public.revoke_pro_activation_code(uuid) from anon;
revoke all on function public.redeem_pro_activation_code(text) from anon;