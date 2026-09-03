-- ============================================================
-- 1. New columns
-- ============================================================
alter table public.profiles
  add column if not exists agency_website    text,
  add column if not exists logo_storage_path text;

-- ============================================================
-- 2. Constraints
-- ============================================================
alter table public.profiles
  add constraint profiles_logo_url_scheme
  check (logo_url is null or logo_url = ''
         or logo_url ~* '^https://'
         or logo_url ~* '^/'),

  add constraint profiles_agency_website_scheme
  check (agency_website is null or agency_website = ''
         or agency_website ~* '^https?://');

-- ============================================================
-- 3. Re-issue the column-level UPDATE grant.
--    Must list every writable column or saves will fail.
-- ============================================================
revoke update on public.profiles from authenticated;
grant update (agency_name, logo_url, logo_storage_path, agency_website,
              brand_color, support_email, support_hours, emergency_phone,
              ui_locale)
  on public.profiles to authenticated;