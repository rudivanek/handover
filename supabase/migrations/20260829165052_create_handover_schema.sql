/*
# Create Handover schema

1. Purpose
   Handover is a white-label SaaS where a web agency generates a branded
   "website owner's manual" for each client. This migration creates the full
   data model: agency profiles, manuals, accounts, edit blocks, and coverage.

2. New Tables
   - profiles: one row per agency user (auth-linked). Holds branding: agency
     name, logo URL, brand color, support email/hours, emergency phone.
   - manuals: one row per client manual. Owned by a user. Has a unique slug
     (auto-derived from client name), plus site/stack, domain/DNS, hosting/
     email metadata, and emergency contacts.
   - accounts: repeatable rows per manual listing service accounts and who
     owns them. NEVER stores passwords.
   - edit_blocks: repeatable rows per manual with a block name and free-text
     instructions for how to edit that part of the site.
   - coverage: per-manual items with an included boolean (true = in retainer,
     false = billed separately).

3. Security
   - RLS enabled on every table.
   - profiles: owner-scoped CRUD (auth.uid() = user_id).
   - manuals: owner-scoped CRUD (auth.uid() = user_id).
   - accounts / edit_blocks / coverage: owner-scoped via EXISTS check on the
     parent manuals table (manuals.user_id = auth.uid()).
   - Public read on manuals (and their children) is granted through a separate
     SELECT policy scoped TO anon, authenticated so the public /m/[slug] page
     can render a published manual without a session. Write remains owner-only.

4. Notes
   - user_id columns default to auth.uid() so frontend inserts that omit
     user_id still satisfy the INSERT WITH CHECK.
   - slug is unique across the whole table.
   - All child tables ON DELETE CASCADE from their parent manual.
*/

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_name text,
  logo_url text,
  brand_color text DEFAULT '#1f2937',
  support_email text,
  support_hours text,
  emergency_phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS manuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  client_name text NOT NULL,
  site_name text,
  site_url text,
  platform text,
  framework_or_theme text,
  key_plugins text[] DEFAULT '{}',
  registrar text,
  domain_expiry date,
  domain_owner text,
  nameservers text,
  host text,
  host_plan text,
  host_renewal date,
  email_provider text,
  emergency_name text,
  emergency_role text,
  emergency_phone text,
  emergency_email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;

-- Owner-scoped CRUD
DROP POLICY IF EXISTS "select_own_manuals" ON manuals;
CREATE POLICY "select_own_manuals" ON manuals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_manuals" ON manuals;
CREATE POLICY "insert_own_manuals" ON manuals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_manuals" ON manuals;
CREATE POLICY "update_own_manuals" ON manuals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_manuals" ON manuals;
CREATE POLICY "delete_own_manuals" ON manuals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Public read: published manuals are viewable by anyone (anon) via /m/[slug]
DROP POLICY IF EXISTS "public_read_manuals" ON manuals;
CREATE POLICY "public_read_manuals" ON manuals FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  service text,
  account_owner text,
  admin_email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_accounts" ON accounts;
CREATE POLICY "select_own_accounts" ON accounts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = accounts.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_accounts" ON accounts;
CREATE POLICY "insert_own_accounts" ON accounts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = accounts.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_accounts" ON accounts;
CREATE POLICY "update_own_accounts" ON accounts FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = accounts.manual_id AND manuals.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = accounts.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_accounts" ON accounts;
CREATE POLICY "delete_own_accounts" ON accounts FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = accounts.manual_id AND manuals.user_id = auth.uid())
  );

-- Public read for published manual children
DROP POLICY IF EXISTS "public_read_accounts" ON accounts;
CREATE POLICY "public_read_accounts" ON accounts FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS edit_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  block_name text,
  instructions text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE edit_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_edit_blocks" ON edit_blocks;
CREATE POLICY "select_own_edit_blocks" ON edit_blocks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = edit_blocks.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_edit_blocks" ON edit_blocks;
CREATE POLICY "insert_own_edit_blocks" ON edit_blocks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = edit_blocks.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_edit_blocks" ON edit_blocks;
CREATE POLICY "update_own_edit_blocks" ON edit_blocks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = edit_blocks.manual_id AND manuals.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = edit_blocks.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_edit_blocks" ON edit_blocks;
CREATE POLICY "delete_own_edit_blocks" ON edit_blocks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = edit_blocks.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "public_read_edit_blocks" ON edit_blocks;
CREATE POLICY "public_read_edit_blocks" ON edit_blocks FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  item text,
  included boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coverage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_coverage" ON coverage;
CREATE POLICY "select_own_coverage" ON coverage FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = coverage.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_coverage" ON coverage;
CREATE POLICY "insert_own_coverage" ON coverage FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = coverage.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_coverage" ON coverage;
CREATE POLICY "update_own_coverage" ON coverage FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = coverage.manual_id AND manuals.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = coverage.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_coverage" ON coverage;
CREATE POLICY "delete_own_coverage" ON coverage FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.id = coverage.manual_id AND manuals.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "public_read_coverage" ON coverage;
CREATE POLICY "public_read_coverage" ON coverage FOR SELECT
  TO anon, authenticated USING (true);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_manuals_user_id ON manuals(user_id);
CREATE INDEX IF NOT EXISTS idx_manuals_slug ON manuals(slug);
CREATE INDEX IF NOT EXISTS idx_accounts_manual_id ON accounts(manual_id);
CREATE INDEX IF NOT EXISTS idx_edit_blocks_manual_id ON edit_blocks(manual_id);
CREATE INDEX IF NOT EXISTS idx_coverage_manual_id ON coverage(manual_id);
