alter table public.custom_fields
  add constraint custom_fields_no_secret_names
  check (
    lower(label) !~ '(password|passwd|pwd|contrase|secreto|secret|api[ _-]?key|apikey|token|credencial|credential|cvv)'
  ) not valid;

alter table public.custom_sections
  add constraint custom_sections_no_secret_names
  check (
    lower(title) !~ '(password|passwd|pwd|contrase|secreto|secret|api[ _-]?key|apikey|token|credencial|credential|cvv)'
  ) not valid;

alter table public.custom_fields   validate constraint custom_fields_no_secret_names;
alter table public.custom_sections validate constraint custom_sections_no_secret_names;