-- ============================================================
-- 1. Find anything that already violates the rule.
--    Run this FIRST, on its own, and look at the output.
-- ============================================================
-- select 'custom_fields' as tbl, id, manual_id, label as name
--   from public.custom_fields
--  where lower(label) ~ '(password|passwd|pwd|contrase|secreto|secret|api[ _-]?key|apikey|token|credencial|credential|cvv)'
-- union all
-- select 'custom_sections', id, manual_id, title
--   from public.custom_sections
--  where lower(title) ~ '(password|passwd|pwd|contrase|secreto|secret|api[ _-]?key|apikey|token|credencial|credential|cvv)';

-- Result on 2026-08-29: zero rows. Safe to add constraint.

-- ============================================================
-- 2. The constraint. NOT VALID means it applies to new and updated
--    rows immediately, without failing on legacy rows you haven't
--    triaged yet.
-- ============================================================
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

-- ============================================================
-- 3. Once step 1 returns zero rows, promote to fully validated.
-- ============================================================
alter table public.custom_fields   validate constraint custom_fields_no_secret_names;
alter table public.custom_sections validate constraint custom_sections_no_secret_names;
