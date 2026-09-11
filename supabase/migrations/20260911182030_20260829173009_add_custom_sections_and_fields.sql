CREATE TABLE IF NOT EXISTS custom_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_custom_sections" ON custom_sections;
CREATE POLICY "select_own_custom_sections" ON custom_sections FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = custom_sections.manual_id AND manuals.user_id = auth.uid())
  );

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

DROP POLICY IF EXISTS "select_own_custom_fields" ON custom_fields;
CREATE POLICY "select_own_custom_fields" ON custom_fields FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = custom_fields.manual_id AND manuals.user_id = auth.uid())
  );

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

CREATE INDEX IF NOT EXISTS idx_custom_sections_manual_id ON custom_sections(manual_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_manual_id ON custom_fields(manual_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_section ON custom_fields(section_type, section_key);