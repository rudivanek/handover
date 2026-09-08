/*
# Handover sign-off checklist

## Purpose
Adds a six-item handover checklist to public.manuals that the agency completes
when the handover actually happens. The public manual page renders it as a
completion record — a dated list of what was handed over — not a waiver or
signature. The agency ticks these, never the client.

## New columns on public.manuals
1. signoff_domain     boolean NOT NULL DEFAULT false — Domain ownership confirmed
2. signoff_hosting    boolean NOT NULL DEFAULT false — Hosting confirmed
3. signoff_accounts   boolean NOT NULL DEFAULT false — Accounts and access reviewed
4. signoff_credentials boolean NOT NULL DEFAULT false — Credentials transferred separately
5. signoff_maintenance boolean NOT NULL DEFAULT false — Maintenance responsibilities explained
6. signoff_files      boolean NOT NULL DEFAULT false — Files and assets delivered
7. signoff_person     text NULL — who the handover was confirmed with (free text)
8. signoff_at         timestamptz NULL — set when the agency marks the handover complete

## Security changes
- Re-issues the column-level UPDATE grant on public.manuals to the authenticated
  role, adding all eight new signoff_* columns to the existing allowlist.
- The eight columns deliberately kept absent from the authenticated UPDATE
  grant remain absent: updated_at, published_at, slug, id, user_id, created_at,
  hidden_fields, hidden_sections.
- No new table is created, so no REVOKE ... FROM anon is needed.
- anon gains no privilege anywhere — it has zero table or column privileges
  on public.manuals and this migration adds none.
- get_public_manual is NOT modified. It builds its output as
  to_jsonb(m) - 'user_id', so the new columns reach the public page
  automatically.

## Notes
- signoff_person gets no secret-name CHECK constraint. It is a person's name
  and free prose. It is screened warn-only in the UI with the existing warned tier.
- No plan gating — sign-off is available on all plans including free.
- Sign-off is excluded from computeCompletion (measures whether the manual
  is written, not whether the project is finished) — confirmed, no code change needed.
*/

-- 1. Add the eight signoff columns
ALTER TABLE public.manuals
  ADD COLUMN IF NOT EXISTS signoff_domain      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signoff_hosting     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signoff_accounts    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signoff_credentials boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signoff_maintenance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signoff_files       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signoff_person      text,
  ADD COLUMN IF NOT EXISTS signoff_at           timestamptz;

-- 2. Re-issue the column-level UPDATE grant on public.manuals to authenticated.
--    The existing allowlist (21 columns) plus the 8 new signoff_* columns = 29 total.
--    The 8 deliberately-absent columns stay absent: updated_at, published_at, slug,
--    id, user_id, created_at, hidden_fields, hidden_sections.
REVOKE UPDATE ON public.manuals FROM authenticated;
GRANT UPDATE (
  client_name,
  site_name,
  site_url,
  platform,
  framework_or_theme,
  key_plugins,
  registrar,
  domain_expiry,
  domain_owner,
  nameservers,
  host,
  host_plan,
  host_renewal,
  email_provider,
  emergency_name,
  emergency_role,
  emergency_phone,
  emergency_email,
  is_published,
  archived_at,
  locale,
  signoff_domain,
  signoff_hosting,
  signoff_accounts,
  signoff_credentials,
  signoff_maintenance,
  signoff_files,
  signoff_person,
  signoff_at
) ON public.manuals TO authenticated;
