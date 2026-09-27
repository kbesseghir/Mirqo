-- RLS policies alone are not enough — Postgres also requires table-level GRANTs for
-- the authenticated role. New tables created via migration in this project apparently
-- don't inherit the project's default privileges automatically (unlike the original
-- tables), so grant explicitly. Discovered via a live "permission denied for table
-- household_members" error (RLS was correct; the underlying GRANT was missing).

grant select, insert, update, delete on public.household_members to authenticated;

-- analytics_events may not exist yet if that earlier migration was never applied;
-- skip instead of hard-failing so this migration still succeeds either way.
do $$
begin
  if to_regclass('public.analytics_events') is not null then
    execute 'grant select, insert on public.analytics_events to authenticated';
  end if;
end
$$;
