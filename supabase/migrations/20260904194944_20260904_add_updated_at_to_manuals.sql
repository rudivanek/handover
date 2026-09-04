/*
# Add updated_at to manuals with automatic maintenance

1. New Columns
- `manuals.updated_at` (timestamptz, not null, default now()) — timestamp of the
  last change to the manual or any of its child rows. Maintained entirely by
  database triggers, never by the application.

2. Triggers
- `manuals_set_updated_at` — BEFORE UPDATE on `manuals`: sets NEW.updated_at =
  now() so the column is always current regardless of what the app sends.
- `touch_manual_on_account_change` — AFTER INSERT/UPDATE/DELETE on `accounts`:
  updates the parent manual's updated_at.
- `touch_manual_on_edit_block_change` — same for `edit_blocks`.
- `touch_manual_on_coverage_change` — same for `coverage`.
- `touch_manual_on_custom_section_change` — same for `custom_sections`.
- `touch_manual_on_custom_field_change` — same for `custom_fields`.
- `touch_manual_on_asset_change` — same for `assets`.

3. Security
- `manuals` previously had a blanket table-level UPDATE grant to `authenticated`.
  Since updated_at must not be forgeable by the client, the table-level UPDATE
  grant is revoked and replaced with column-level UPDATE on every column EXCEPT
  updated_at. The authenticated role can still update all the fields it could
  before, but cannot write updated_at — only the triggers can.
- SELECT, INSERT, DELETE grants remain at table level (unchanged).
- No RLS policy changes.

4. Important Notes
- The get_public_manual function uses `to_jsonb(m)` which dynamically includes
  all columns, so updated_at will automatically appear in its JSON output once
  the column exists — no function change needed for the column itself.
- The demo row (aurora-dental-4k2m9x) gets today's date from the default.
*/

-- 1. Add the column
ALTER TABLE public.manuals
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Revoke blanket table-level UPDATE from authenticated
REVOKE UPDATE ON public.manuals FROM authenticated;

-- 3. Re-grant column-level UPDATE on all columns except updated_at
--    (created_at is included to preserve the original grant shape)
GRANT UPDATE (
  id, user_id, slug, client_name, site_name, site_url, platform,
  framework_or_theme, key_plugins, registrar, domain_expiry, domain_owner,
  nameservers, host, host_plan, host_renewal, email_provider,
  emergency_name, emergency_role, emergency_phone, emergency_email,
  locale, created_at
) ON public.manuals TO authenticated;

-- 4. BEFORE UPDATE trigger on manuals itself
CREATE OR REPLACE FUNCTION public.touch_manuals_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS manuals_set_updated_at ON public.manuals;
CREATE TRIGGER manuals_set_updated_at
  BEFORE UPDATE ON public.manuals
  FOR EACH ROW EXECUTE FUNCTION public.touch_manuals_updated_at();

-- 5. Shared function for child-table triggers: touches the parent manual
CREATE OR REPLACE FUNCTION public.touch_parent_manual()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.manuals SET updated_at = now() WHERE id = OLD.manual_id;
  ELSE
    UPDATE public.manuals SET updated_at = now() WHERE id = NEW.manual_id;
  END IF;
  RETURN NULL;
END;
$$;

-- 6. AFTER INSERT/UPDATE/DELETE triggers on each child table
DROP TRIGGER IF EXISTS touch_manual_on_account_change ON public.accounts;
CREATE TRIGGER touch_manual_on_account_change
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_parent_manual();

DROP TRIGGER IF EXISTS touch_manual_on_edit_block_change ON public.edit_blocks;
CREATE TRIGGER touch_manual_on_edit_block_change
  AFTER INSERT OR UPDATE OR DELETE ON public.edit_blocks
  FOR EACH ROW EXECUTE FUNCTION public.touch_parent_manual();

DROP TRIGGER IF EXISTS touch_manual_on_coverage_change ON public.coverage;
CREATE TRIGGER touch_manual_on_coverage_change
  AFTER INSERT OR UPDATE OR DELETE ON public.coverage
  FOR EACH ROW EXECUTE FUNCTION public.touch_parent_manual();

DROP TRIGGER IF EXISTS touch_manual_on_custom_section_change ON public.custom_sections;
CREATE TRIGGER touch_manual_on_custom_section_change
  AFTER INSERT OR UPDATE OR DELETE ON public.custom_sections
  FOR EACH ROW EXECUTE FUNCTION public.touch_parent_manual();

DROP TRIGGER IF EXISTS touch_manual_on_custom_field_change ON public.custom_fields;
CREATE TRIGGER touch_manual_on_custom_field_change
  AFTER INSERT OR UPDATE OR DELETE ON public.custom_fields
  FOR EACH ROW EXECUTE FUNCTION public.touch_parent_manual();

DROP TRIGGER IF EXISTS touch_manual_on_asset_change ON public.assets;
CREATE TRIGGER touch_manual_on_asset_change
  AFTER INSERT OR UPDATE OR DELETE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.touch_parent_manual();
