/*
# Regenerate leaked slugs

The previous migration (20260907182801) wrote hardcoded slug suffixes into
the migration file. This migration regenerates them using gen_random_bytes
from pgcrypto so no slug value appears in source control.

Both manuals keep their existing base slug; only the suffix is replaced.
The suffix is 10 characters from the 32-char alphabet
abcdefghijkmnpqrstuvwxyz23456789, which divides 256 evenly (no modulo bias).

Rows are identified by UUID only. The base slug is extracted from the
existing slug by stripping the trailing suffix, so no slug string literal
appears in this file.

manuals_set_updated_at is disabled around the update so updated_at is not
touched, then re-enabled.
*/

alter table public.manuals disable trigger manuals_set_updated_at;

-- Regenerate suffix for the first affected manual (identified by UUID only)
update public.manuals set slug = (
  select regexp_replace(m.slug, '-[a-z0-9]+$', '') || '-' || string_agg(
    substr('abcdefghijkmnpqrstuvwxyz23456789', (get_byte(b, i) % 32) + 1, 1), '')
  from (select gen_random_bytes(10) as b) s, generate_series(0, 9) as i
)
from public.manuals m
where m.id = 'b2c3d4e5-f6a7-8901-bcde-f23456789012'
  and public.manuals.id = m.id
  and not exists (
    select 1 from public.manuals m2
    where m2.slug = (
      select regexp_replace(m.slug, '-[a-z0-9]+$', '') || '-' || string_agg(
        substr('abcdefghijkmnpqrstuvwxyz23456789', (get_byte(b, i) % 32) + 1, 1), '')
      from (select gen_random_bytes(10) as b) s, generate_series(0, 9) as i
    )
  );

-- Regenerate suffix for the second affected manual (identified by UUID only)
update public.manuals set slug = (
  select regexp_replace(m.slug, '-[a-z0-9]+$', '') || '-' || string_agg(
    substr('abcdefghijkmnpqrstuvwxyz23456789', (get_byte(b, i) % 32) + 1, 1), '')
  from (select gen_random_bytes(10) as b) s, generate_series(0, 9) as i
)
from public.manuals m
where m.id = 'b06f44c4-e2d0-44d7-8d07-69bc05564cfd'
  and public.manuals.id = m.id
  and not exists (
    select 1 from public.manuals m2
    where m2.slug = (
      select regexp_replace(m.slug, '-[a-z0-9]+$', '') || '-' || string_agg(
        substr('abcdefghijkmnpqrstuvwxyz23456789', (get_byte(b, i) % 32) + 1, 1), '')
      from (select gen_random_bytes(10) as b) s, generate_series(0, 9) as i
    )
  );

alter table public.manuals enable trigger manuals_set_updated_at;
