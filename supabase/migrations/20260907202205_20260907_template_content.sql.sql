/*
# Template content — maintenance, coverage, edit blocks, accounts

## What this migration does

1. Creates four new child tables of `manual_templates`, mirroring the
   manual child tables one for one:

   - `template_maintenance_tasks` — task, cadence, owner, notes, sort_order
   - `template_coverage` — item, included
   - `template_edit_blocks` — block_name, instructions
   - `template_accounts` — service, account_owner (NO admin_email column)

2. Each table:
   - `template_id uuid NOT NULL REFERENCES public.manual_templates ON DELETE CASCADE`
   - RLS enabled
   - Four owner-scoped policies (select/insert/update/delete) inheriting
     ownership through `template_id` exactly as `template_custom_fields` does
   - `GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated`
   - `REVOKE ALL FROM anon`

3. CHECK constraints mirror the manual tables exactly:
   - `template_maintenance_tasks`: cadence CHECK and owner CHECK (matching
     `maintenance_tasks_cadence_check` and `maintenance_tasks_owner_check`).
     No secret-name CHECK on task/notes — the manual table is warn-only and
     so is the template version.
   - `template_coverage`, `template_edit_blocks`, `template_accounts`: no
     secret-name CHECK, matching their manual counterparts which have none.

4. Does NOT touch:
   - `get_public_manual`, the publish gate, `enforce_manual_quota()`,
     `plan_manual_limit()`, any admin function, the signup trigger,
     `touch_parent_manual`, `manuals_set_updated_at`.
   - The manuals column grant or any existing RLS policy.
   - `lib/slug.ts`, `lib/secret-names.ts`, `data/defaults.json`,
     `data/email-scripts.json`, `data/maintenance-presets.json`.
   - The demo manual.

## Why no admin_email on template_accounts
An admin email is client-specific. A template that carried one would spread
a stale address across every future manual. The duplicate-as-template flow
already blanks admin_email; the template table simply has no column for it.
*/

-- ============================================================
-- 1. template_maintenance_tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.template_maintenance_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.manual_templates ON DELETE CASCADE,
  task        text NOT NULL DEFAULT '',
  cadence     text NOT NULL,
  owner       text NOT NULL DEFAULT 'agency',
  notes       text NOT NULL DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT template_maintenance_cadence_check CHECK (cadence IN ('daily','weekly','monthly','annual')),
  CONSTRAINT template_maintenance_owner_check CHECK (owner IN ('agency','client','shared'))
);

ALTER TABLE public.template_maintenance_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_template_maintenance" ON public.template_maintenance_tasks;
CREATE POLICY "select_own_template_maintenance" ON public.template_maintenance_tasks
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_maintenance_tasks.template_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_template_maintenance" ON public.template_maintenance_tasks;
CREATE POLICY "insert_own_template_maintenance" ON public.template_maintenance_tasks
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_maintenance_tasks.template_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_template_maintenance" ON public.template_maintenance_tasks;
CREATE POLICY "update_own_template_maintenance" ON public.template_maintenance_tasks
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_maintenance_tasks.template_id AND t.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_maintenance_tasks.template_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_template_maintenance" ON public.template_maintenance_tasks;
CREATE POLICY "delete_own_template_maintenance" ON public.template_maintenance_tasks
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_maintenance_tasks.template_id AND t.user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_maintenance_tasks TO authenticated;
REVOKE ALL ON public.template_maintenance_tasks FROM anon;

CREATE INDEX IF NOT EXISTS idx_template_maintenance_template_id ON public.template_maintenance_tasks(template_id);

-- ============================================================
-- 2. template_coverage
-- ============================================================
CREATE TABLE IF NOT EXISTS public.template_coverage (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.manual_templates ON DELETE CASCADE,
  item        text,
  included    boolean DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.template_coverage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_template_coverage" ON public.template_coverage;
CREATE POLICY "select_own_template_coverage" ON public.template_coverage
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_coverage.template_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_template_coverage" ON public.template_coverage;
CREATE POLICY "insert_own_template_coverage" ON public.template_coverage
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_coverage.template_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_template_coverage" ON public.template_coverage;
CREATE POLICY "update_own_template_coverage" ON public.template_coverage
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_coverage.template_id AND t.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_coverage.template_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_template_coverage" ON public.template_coverage;
CREATE POLICY "delete_own_template_coverage" ON public.template_coverage
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_coverage.template_id AND t.user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_coverage TO authenticated;
REVOKE ALL ON public.template_coverage FROM anon;

CREATE INDEX IF NOT EXISTS idx_template_coverage_template_id ON public.template_coverage(template_id);

-- ============================================================
-- 3. template_edit_blocks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.template_edit_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.manual_templates ON DELETE CASCADE,
  block_name  text,
  instructions text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.template_edit_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_template_edit_blocks" ON public.template_edit_blocks;
CREATE POLICY "select_own_template_edit_blocks" ON public.template_edit_blocks
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_edit_blocks.template_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_template_edit_blocks" ON public.template_edit_blocks;
CREATE POLICY "insert_own_template_edit_blocks" ON public.template_edit_blocks
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_edit_blocks.template_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_template_edit_blocks" ON public.template_edit_blocks;
CREATE POLICY "update_own_template_edit_blocks" ON public.template_edit_blocks
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_edit_blocks.template_id AND t.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_edit_blocks.template_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_template_edit_blocks" ON public.template_edit_blocks;
CREATE POLICY "delete_own_template_edit_blocks" ON public.template_edit_blocks
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_edit_blocks.template_id AND t.user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_edit_blocks TO authenticated;
REVOKE ALL ON public.template_edit_blocks FROM anon;

CREATE INDEX IF NOT EXISTS idx_template_edit_blocks_template_id ON public.template_edit_blocks(template_id);

-- ============================================================
-- 4. template_accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.template_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.manual_templates ON DELETE CASCADE,
  service     text,
  account_owner text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.template_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_template_accounts" ON public.template_accounts;
CREATE POLICY "select_own_template_accounts" ON public.template_accounts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_accounts.template_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_template_accounts" ON public.template_accounts;
CREATE POLICY "insert_own_template_accounts" ON public.template_accounts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_accounts.template_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_template_accounts" ON public.template_accounts;
CREATE POLICY "update_own_template_accounts" ON public.template_accounts
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_accounts.template_id AND t.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_accounts.template_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_template_accounts" ON public.template_accounts;
CREATE POLICY "delete_own_template_accounts" ON public.template_accounts
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manual_templates t WHERE t.id = template_accounts.template_id AND t.user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_accounts TO authenticated;
REVOKE ALL ON public.template_accounts FROM anon;

CREATE INDEX IF NOT EXISTS idx_template_accounts_template_id ON public.template_accounts(template_id);
