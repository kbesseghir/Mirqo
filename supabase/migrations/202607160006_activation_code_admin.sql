alter table public.pro_activation_codes add column if not exists code_hint text;
alter table public.pro_activation_codes add column if not exists revoked_at timestamptz;

create table if not exists public.activation_code_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.activation_code_admins enable row level security;
insert into public.activation_code_admins(user_id)
select id from auth.users where lower(email)=lower('cert.learndz@gmail.com')
on conflict do nothing;

create or replace function public.is_activation_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.activation_code_admins where user_id=auth.uid());
$$;
revoke all on function public.is_activation_admin() from public;
grant execute on function public.is_activation_admin() to authenticated;

create or replace function public.create_pro_activation_code(p_plain_code text,p_duration_days integer default 30,p_expires_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare v_id uuid; v_normalized text;
begin
  if not public.is_activation_admin() then raise exception 'forbidden'; end if;
  v_normalized:=upper(regexp_replace(trim(p_plain_code),'\s+','','g'));
  if length(v_normalized)<12 then raise exception 'code_too_short'; end if;
  if p_duration_days<1 or p_duration_days>366 then raise exception 'invalid_duration'; end if;
  if p_expires_at is not null and p_expires_at<=now() then raise exception 'invalid_expiration'; end if;
  insert into public.pro_activation_codes(code_hash,code_hint,duration_days,expires_at)
  values(encode(digest(v_normalized,'sha256'),'hex'),right(v_normalized,4),p_duration_days,p_expires_at)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_pro_activation_code(text,integer,timestamptz) from public;
grant execute on function public.create_pro_activation_code(text,integer,timestamptz) to authenticated;

create or replace function public.list_pro_activation_codes()
returns table(id uuid,code_hint text,duration_days integer,expires_at timestamptz,redeemed_at timestamptz,redeemed_by_email text,revoked_at timestamptz,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_activation_admin() then raise exception 'forbidden'; end if;
  return query select c.id,c.code_hint,c.duration_days,c.expires_at,c.redeemed_at,u.email::text,c.revoked_at,c.created_at
  from public.pro_activation_codes c left join auth.users u on u.id=c.redeemed_by order by c.created_at desc;
end;
$$;
revoke all on function public.list_pro_activation_codes() from public;
grant execute on function public.list_pro_activation_codes() to authenticated;

create or replace function public.revoke_pro_activation_code(p_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.is_activation_admin() then raise exception 'forbidden'; end if;
  update public.pro_activation_codes set revoked_at=now() where id=p_id and redeemed_at is null and revoked_at is null;
  return found;
end;
$$;
revoke all on function public.revoke_pro_activation_code(uuid) from public;
grant execute on function public.revoke_pro_activation_code(uuid) to authenticated;

create or replace function public.redeem_pro_activation_code(p_code_hash text)
returns timestamptz language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_code public.pro_activation_codes%rowtype;v_end timestamptz;
begin
  if v_user_id is null then raise exception 'unauthenticated'; end if;
  select * into v_code from public.pro_activation_codes where code_hash=p_code_hash for update;
  if not found or v_code.redeemed_at is not null or v_code.revoked_at is not null or (v_code.expires_at is not null and v_code.expires_at<=now()) then raise exception 'invalid_activation_code'; end if;
  perform set_config('app.activation_redemption','true',true);
  update public.profiles set activation_ends_at=greatest(coalesce(activation_ends_at,now()),now())+make_interval(days=>v_code.duration_days)
  where user_id=v_user_id returning activation_ends_at into v_end;
  if v_end is null then raise exception 'profile_not_found'; end if;
  update public.pro_activation_codes set redeemed_by=v_user_id,redeemed_at=now() where id=v_code.id;
  return v_end;
end;
$$;
revoke all on function public.redeem_pro_activation_code(text) from public;
grant execute on function public.redeem_pro_activation_code(text) to authenticated;