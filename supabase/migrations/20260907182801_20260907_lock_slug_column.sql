/*
# Lock slug column and fix unsuffixed published slugs

## 1. Re-grant UPDATE on manuals without slug, id, user_id, created_at
The current column-level UPDATE grant on manuals includes slug, id, user_id,
and created_at — none of which the application ever updates. Revoke all UPDATE
then re-grant only the content columns plus is_published and archived_at.
updated_at is deliberately absent so the trigger owns it.

## 2. Fix published manuals whose slugs have no random suffix
Two published manuals (acme-corporation, sharpenstudio) lack a trailing
-[a-z0-9]{6}$ suffix. Give each a fresh 6-char suffix. Disable the
manuals_set_updated_at trigger around the update so updated_at is not touched.
*/

-- 1. Re-grant UPDATE columns
revoke update on public.manuals from authenticated;
grant update (
  client_name, site_name, site_url, platform,
  framework_or_theme, key_plugins, registrar, domain_expiry, domain_owner,
  nameservers, host, host_plan, host_renewal, email_provider,
  emergency_name, emergency_role, emergency_phone, emergency_email,
  locale
) on public.manuals to authenticated;
grant update (is_published) on public.manuals to authenticated;
grant update (archived_at) on public.manuals to authenticated;

-- 2. Fix unsuffixed published slugs
alter table public.manuals disable trigger manuals_set_updated_at;

update public.manuals set slug = 'acme-corporation-4k2m9x'
  where id = 'b2c3d4e5-f6a7-8901-bcde-f23456789012' and slug = 'acme-corporation';

update public.manuals set slug = 'sharpenstudio-7n3p8q'
  where id = 'b06f44c4-e2d0-44d7-8d07-69bc05564cfd' and slug = 'sharpenstudio';

alter table public.manuals enable trigger manuals_set_updated_at;
