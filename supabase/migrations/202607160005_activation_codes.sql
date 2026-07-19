create extension if not exists pgcrypto;

alter table public.profiles add column if not exists activation_ends_at timestamptz;

create table if not exists public.pro_activation_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  duration_days integer not null default 30 check (duration_days between 1 and 366),
  expires_at timestamptz,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((redeemed_by is null and redeemed_at is null) or (redeemed_by is not null and redeemed_at is not null))
);
alter table public.pro_activation_codes enable row level security;

create or replace function public.protect_activation_entitlement()
returns trigger language plpgsql set search_path=public as $$
begin
  if auth.role() is distinct from 'service_role' and coalesce(current_setting('app.activation_redemption',true),'') <> 'true' then
    new.activation_ends_at := old.activation_ends_at;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_activation_entitlement_trigger on public.profiles;
create trigger protect_activation_entitlement_trigger before update on public.profiles for each row execute function public.protect_activation_entitlement();

create or replace function public.redeem_pro_activation_code(p_code_hash text)
returns timestamptz
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code public.pro_activation_codes%rowtype;
  v_end timestamptz;
begin
  if v_user_id is null then raise exception 'unauthenticated'; end if;
  select * into v_code from public.pro_activation_codes where code_hash=p_code_hash for update;
  if not found or v_code.redeemed_at is not null or (v_code.expires_at is not null and v_code.expires_at<=now()) then
    raise exception 'invalid_activation_code';
  end if;
  perform set_config('app.activation_redemption','true',true);
  update public.profiles
    set activation_ends_at=greatest(coalesce(activation_ends_at,now()),now())+make_interval(days=>v_code.duration_days)
    where user_id=v_user_id returning activation_ends_at into v_end;
  if v_end is null then raise exception 'profile_not_found'; end if;
  update public.pro_activation_codes set redeemed_by=v_user_id,redeemed_at=now() where id=v_code.id;
  return v_end;
end;
$$;
revoke all on function public.redeem_pro_activation_code(text) from public;
grant execute on function public.redeem_pro_activation_code(text) to authenticated;
create or replace function public.create_pro_activation_code(p_plain_code text,p_duration_days integer default 30,p_expires_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare v_id uuid;
begin
  if length(trim(p_plain_code))<6 then raise exception 'code_too_short'; end if;
  insert into public.pro_activation_codes(code_hash,duration_days,expires_at)
  values(encode(digest(upper(regexp_replace(trim(p_plain_code),'\s+','','g')),'sha256'),'hex'),p_duration_days,p_expires_at)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_pro_activation_code(text,integer,timestamptz) from public;
grant execute on function public.create_pro_activation_code(text,integer,timestamptz) to service_role;