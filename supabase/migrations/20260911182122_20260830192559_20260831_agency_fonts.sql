alter table public.profiles
  add column if not exists font_key       text not null default 'system',
  add column if not exists custom_font_name text,
  add column if not exists custom_font_url  text;

alter table public.profiles
  add constraint profiles_font_key_valid
    check (font_key ~ '^[a-z0-9-]{1,32}$'),

  add constraint profiles_custom_font_name_safe
    check (custom_font_name is null or custom_font_name ~ '^[A-Za-z0-9 _-]{1,40}$'),

  add constraint profiles_custom_font_url_safe
    check (custom_font_url is null or custom_font_url = ''
           or custom_font_url ~* '^https://[^"''\s]+\.(woff2|woff|otf|ttf)(\?[^"''\s]*)?$');

revoke update on public.profiles from authenticated;
grant update (agency_name, logo_url, logo_storage_path, agency_website,
              brand_color, support_email, support_hours, emergency_phone,
              ui_locale, font_key, custom_font_name, custom_font_url)
  on public.profiles to authenticated;