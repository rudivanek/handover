/*
# Maintenance tasks

## Purpose
A per-manual list of recurring maintenance tasks, each with a cadence
(daily/weekly/monthly/annual) and an owner (agency/client/shared).
Rendered as a new public section on the manual page.

## Security
- RLS enabled, owner-scoped via EXISTS check on parent manual (same pattern
  as manual_contacts, accounts, assets, etc.).
- anon revoked: this platform grants everything to anon by default on new
  tables. Revoke here, not in a follow-up.
- Grants: select, insert, update, delete to authenticated only.

## Notes
- No CHECK constraint on task/notes (unlike custom_fields). Screening is
  client-side warn-only; a DB constraint on free text generates false positives.
- touch_parent_manual() is referenced as-is, not redefined. It is already
  SECURITY DEFINER with SET search_path TO 'public'.
*/

CREATE TABLE public.maintenance_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id   uuid NOT NULL REFERENCES public.manuals(id) ON DELETE CASCADE,
  task        text NOT NULL DEFAULT '',
  cadence     text NOT NULL,
  owner       text NOT NULL DEFAULT 'agency',
  notes       text NOT NULL DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_tasks_cadence_check CHECK (cadence IN ('daily','weekly','monthly','annual')),
  CONSTRAINT maintenance_tasks_owner_check CHECK (owner IN ('agency','client','shared'))
);

ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_maintenance_tasks" ON public.maintenance_tasks;
CREATE POLICY "select_own_maintenance_tasks" ON public.maintenance_tasks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manuals m WHERE m.id = maintenance_tasks.manual_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_maintenance_tasks" ON public.maintenance_tasks;
CREATE POLICY "insert_own_maintenance_tasks" ON public.maintenance_tasks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.manuals m WHERE m.id = maintenance_tasks.manual_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_maintenance_tasks" ON public.maintenance_tasks;
CREATE POLICY "update_own_maintenance_tasks" ON public.maintenance_tasks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manuals m WHERE m.id = maintenance_tasks.manual_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.manuals m WHERE m.id = maintenance_tasks.manual_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_maintenance_tasks" ON public.maintenance_tasks;
CREATE POLICY "delete_own_maintenance_tasks" ON public.maintenance_tasks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manuals m WHERE m.id = maintenance_tasks.manual_id AND m.user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_tasks TO authenticated;
REVOKE ALL ON public.maintenance_tasks FROM anon;

CREATE INDEX idx_maintenance_tasks_manual_id ON public.maintenance_tasks(manual_id);

CREATE TRIGGER touch_manual_on_maintenance_change
  AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_parent_manual();

COMMENT ON TABLE public.maintenance_tasks IS
  'Per-manual recurring maintenance tasks with cadence and owner. Public — exposed via get_public_manual.';
