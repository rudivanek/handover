/*
# Revoke anon privileges on manual_contacts

Supabase grants all privileges to `anon` by default on new tables.
The existing child tables (accounts, edit_blocks, etc.) have anon revoked.
manual_contacts must match: anon gets nothing — no grants, no policies.
RLS is already enabled, so even with grants, anon cannot see rows without
a policy. But we revoke the grants too for defense in depth, matching
the existing child tables.
*/

REVOKE ALL ON public.manual_contacts FROM anon;
