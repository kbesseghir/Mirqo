-- Diagnostic + re-apply, since the earlier GRANT did not resolve the error.
-- Run this whole block, then check the SELECT result at the bottom.

grant select, insert, update, delete on public.household_members to authenticated;
grant usage on schema public to authenticated;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'household_members'
order by grantee, privilege_type;
