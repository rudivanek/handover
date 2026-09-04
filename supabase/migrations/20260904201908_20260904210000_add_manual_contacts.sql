/*
# Private client contacts

## Purpose
A private table for the agency to record contact details for each client
manual. These are NEVER shown on the public manual page.

## Design decision
These fields are deliberately NOT columns on `manuals`. get_public_manual
returns `to_jsonb(m) - 'user_id'`, so every column on `manuals` is published
to anonymous visitors the moment it exists. A separate table cannot leak
through that function because it was never referenced by it.

## Security
- RLS enabled, owner-scoped via EXISTS check on parent manual (same pattern
  as accounts/assets/etc).
- NO public read policy. `anon` gets no grants and no policies.
- Grants: select, insert, update, delete to `authenticated` only.
*/

CREATE TABLE public.manual_contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id     uuid NOT NULL REFERENCES public.manuals(id) ON DELETE CASCADE,
  contact_name  text NOT NULL DEFAULT '',
  contact_role  text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  notes         text NOT NULL DEFAULT '',
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_manual_contacts" ON public.manual_contacts;
CREATE POLICY "select_own_manual_contacts" ON public.manual_contacts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manuals m WHERE m.id = manual_contacts.manual_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_manual_contacts" ON public.manual_contacts;
CREATE POLICY "insert_own_manual_contacts" ON public.manual_contacts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.manuals m WHERE m.id = manual_contacts.manual_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_manual_contacts" ON public.manual_contacts;
CREATE POLICY "update_own_manual_contacts" ON public.manual_contacts FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manuals m WHERE m.id = manual_contacts.manual_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.manuals m WHERE m.id = manual_contacts.manual_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_manual_contacts" ON public.manual_contacts;
CREATE POLICY "delete_own_manual_contacts" ON public.manual_contacts FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.manuals m WHERE m.id = manual_contacts.manual_id AND m.user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_contacts TO authenticated;

CREATE INDEX idx_manual_contacts_manual_id ON public.manual_contacts(manual_id);

CREATE TRIGGER touch_manual_on_contact_change
  AFTER INSERT OR UPDATE OR DELETE ON public.manual_contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_parent_manual();

COMMENT ON TABLE public.manual_contacts IS
  'Private client contact details for agency use only. Deliberately NOT exposed by get_public_manual — must never be added to it.';
