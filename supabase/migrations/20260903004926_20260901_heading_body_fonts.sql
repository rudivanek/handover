alter table public.profiles
  add column if not exists heading_font_key text not null default 'system',
  add column if not exists body_font_key    text not null default 'system';

-- Carry the existing single choice into both roles.
update public.profiles
   set heading_font_key = coalesce(font_key, 'system'),
       body_font_key    = coalesce(font_key, 'system')
 where font_key is not null and font_key <> 'system';

alter table public.profiles
  add constraint profiles_heading_font_key_valid check (heading_font_key ~ '^[a-z0-9-]{1,32}$'),
  add constraint profiles_body_font_key_valid    check (body_font_key    ~ '^[a-z0-9-]{1,32}$');

alter table public.profiles drop constraint if exists profiles_font_key_valid;
alter table public.profiles drop column if exists font_key;

-- RE-ISSUE THE COLUMN GRANT: two new columns in, font_key out.
revoke update on public.profiles from authenticated;
grant update (agency_name, logo_url, logo_storage_path, agency_website,
              brand_color, support_email, support_hours, emergency_phone,
              ui_locale, heading_font_key, body_font_key,
              custom_font_name, custom_font_url)
  on public.profiles to authenticated;