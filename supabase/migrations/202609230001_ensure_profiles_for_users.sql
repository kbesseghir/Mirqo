-- Keep the profile row in sync with Supabase Auth users.
-- This is safe to run on an existing project: it only backfills missing rows.
insert into public.profiles (user_id)
select u.id
from auth.users u
where not exists (
  select 1 from public.profiles p where p.user_id = u.id
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();
