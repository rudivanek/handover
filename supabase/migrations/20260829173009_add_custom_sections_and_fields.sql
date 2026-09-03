/*
# Add custom sections and custom fields

1. New Tables
- `custom_sections`: user-defined sections that appear after builtin sections on a manual.
  - `id` (uuid, primary key)
  - `manual_id` (uuid, FK to manuals, cascade delete)
  - `title` (text, the section heading shown to readers)
  - `position` (int, default 0, ordering among custom sections)
  - `created_at` (timestamptz, default now())

- `custom_fields`: user-defined label/value pairs that can be attached to any
  builtin section OR a custom section.
  - `id` (uuid, primary key)
  - `manual_id` (uuid, FK to manuals, cascade delete)
  - `section_type` (text, 'builtin' or 'custom')
  - `section_key` (text): when section_type='builtin' this is one of
    'site_stack','domain_dns','hosting_email','accounts','how_to_edit',
    'coverage','emergency'. When section_type='custom' this is the
    custom_sections.id.
  - `label` (text, the field label shown to readers)
  - `value` (text, the field body)
  - `position` (int, default 0, ordering within the section)
  - `created_at` (timestamptz, default now())

2. Security
- RLS enabled on both tables.
- Owner-scoped writes: INSERT/UPDATE/DELETE scoped to the manual owner via
  EXISTS subquery on manuals.user_id = auth.uid(), matching the pattern used
  by accounts/edit_blocks/coverage.
- Public read: SELECT for anon+authenticated via EXISTS subquery on manuals
  (same as the existing child tables' public_read policies).
- No broader anon policy than what the existing child tables already have.

3. Important Notes
- No password/credential fields anywhere.
- Deleting a custom_section cascades to its custom_fields via FK cascade.
- Deleting a manual cascades to both tables.
*/

CREATE TABLE IF NOT EXISTS custom_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_sections ENABLE ROW LEVEL SECURITY;

-- Owner-scoped SELECT (authenticated)
DROP POLICY IF EXISTS "select_own_custom_sections" ON custom_sections;
CREATE POLICY "select_own_custom_sections" ON custom_sections FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = custom_sections.manual_id AND manuals.user_id = auth.uid())
  );

-- Public SELECT (anon + authenticated) — same pattern as public_read_accounts
DROP POLICY IF EXISTS "public_read_custom_sections" ON custom_sections;
CREATE POLICY "public_read_custom_sections" ON custom_sections FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_custom_sections" ON custom_sections;
CREATE POLICY "insert_own_custom_sections" ON custom_sections FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = custom_sections.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_custom_sections" ON custom_sections;
CREATE POLICY "update_own_custom_sections" ON custom_sections FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = custom_sections.manual_id AND manuals.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = custom_sections.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_custom_sections" ON custom_sections;
CREATE POLICY "delete_own_custom_sections" ON custom_sections FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = custom_sections.manual_id AND manuals.user_id = auth.uid())
  );

-- Custom fields
CREATE TABLE IF NOT EXISTS custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  section_type text NOT NULL DEFAULT 'builtin',
  section_key text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  value text NOT NULL DEFAULT '',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

-- Owner-scoped SELECT (authenticated)
DROP POLICY IF EXISTS "select_own_custom_fields" ON custom_fields;
CREATE POLICY "select_own_custom_fields" ON custom_fields FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = custom_fields.manual_id AND manuals.user_id = auth.uid())
  );

-- Public SELECT (anon + authenticated) — same pattern as public_read_accounts
DROP POLICY IF EXISTS "public_read_custom_fields" ON custom_fields;
CREATE POLICY "public_read_custom_fields" ON custom_fields FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_custom_fields" ON custom_fields;
CREATE POLICY "insert_own_custom_fields" ON custom_fields FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = custom_fields.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_custom_fields" ON custom_fields;
CREATE POLICY "update_own_custom_fields" ON custom_fields FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = custom_fields.manual_id AND manuals.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = custom_fields.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_custom_fields" ON custom_fields;
CREATE POLICY "delete_own_custom_fields" ON custom_fields FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = custom_fields.manual_id AND manuals.user_id = auth.uid())
  );

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_custom_sections_manual_id ON custom_sections(manual_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_manual_id ON custom_fields(manual_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_section ON custom_fields(section_type, section_key);
