-- Supabase tables require explicit privileges in addition to RLS policies.
grant select, insert, update, delete on table public.monthly_income to authenticated;
grant select, insert, update, delete on table public.spending_entries to authenticated;

-- Allow PostgREST to use the generated UUID defaults.
grant usage, select on all sequences in schema public to authenticated;
