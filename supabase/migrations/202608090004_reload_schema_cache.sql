-- PostgREST caches role privileges; GRANT/REVOKE changes don't always take effect
-- until its schema cache is reloaded. Needed after 202608090003's grants kept
-- failing with "permission denied for table household_members" even after running.
notify pgrst, 'reload schema';
