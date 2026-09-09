/*
# Add DNS handover detail and DNS records

1. New manuals columns
- `dns_managed_at`: registrar, host, Cloudflare, or agency-entered text.
- `dns_access`: client, agency, both, unknown, or agency-entered text.
- `dns_change`: nameservers, records, or none.
- `mail_elsewhere`: nullable warning flag; NULL means unanswered.

2. New table
- `public.dns_records` stores A, AAAA, CNAME, MX, and TXT records associated with a manual.
- Records include free-text name/value fields and stable sort order.

3. Security
- Row-level security is enabled on `dns_records`.
- Authenticated users receive owner-scoped SELECT, INSERT, UPDATE, and DELETE policies.
- Anonymous users have no privileges on `dns_records`.
- The authenticated `manuals` UPDATE column grant is re-issued with the four new columns included while protected columns remain excluded.

4. Public output
- `get_public_manual(text)` is amended to include `dns_records` while preserving all existing public keys and behavior.
- No manual rows are updated or backfilled, so existing timestamps remain unchanged.
*/

ALTER TABLE public.manuals
  ADD COLUMN IF NOT EXISTS dns_managed_at text,
  ADD COLUMN IF NOT EXISTS dns_access text,
  ADD COLUMN IF NOT EXISTS dns_change text,
  ADD COLUMN IF NOT EXISTS mail_elsewhere boolean;

CREATE TABLE IF NOT EXISTS public.dns_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid NOT NULL REFERENCES public.manuals(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN ('A', 'AAAA', 'CNAME', 'MX', 'TXT')),
  record_name text NOT NULL DEFAULT '',
  record_value text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dns_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_dns_records" ON public.dns_records;
CREATE POLICY "select_own_dns_records" ON public.dns_records FOR SELECT
  TO authenticated USING (EXISTS (
    SELECT 1 FROM public.manuals m
    WHERE m.id = dns_records.manual_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "insert_own_dns_records" ON public.dns_records;
CREATE POLICY "insert_own_dns_records" ON public.dns_records FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.manuals m
    WHERE m.id = dns_records.manual_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "update_own_dns_records" ON public.dns_records;
CREATE POLICY "update_own_dns_records" ON public.dns_records FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM public.manuals m
    WHERE m.id = dns_records.manual_id AND m.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.manuals m
    WHERE m.id = dns_records.manual_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "delete_own_dns_records" ON public.dns_records;
CREATE POLICY "delete_own_dns_records" ON public.dns_records FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM public.manuals m
    WHERE m.id = dns_records.manual_id AND m.user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dns_records TO authenticated;
REVOKE ALL ON public.dns_records FROM anon;
CREATE INDEX IF NOT EXISTS dns_records_manual_id_idx ON public.dns_records(manual_id);

DROP TRIGGER IF EXISTS touch_manual_on_dns_records_change ON public.dns_records;
CREATE TRIGGER touch_manual_on_dns_records_change
  AFTER INSERT OR UPDATE OR DELETE ON public.dns_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_parent_manual();

REVOKE UPDATE ON public.manuals FROM authenticated;
GRANT UPDATE (
  client_name, site_name, site_url, platform, framework_or_theme, key_plugins,
  registrar, domain_expiry, domain_owner, registrar_access, nameservers,
  dns_managed_at, dns_access, dns_change, mail_elsewhere,
  host, host_plan, host_renewal, email_provider, emergency_name, emergency_role,
  emergency_phone, emergency_email, is_published, archived_at, locale,
  signoff_domain, signoff_hosting, signoff_accounts, signoff_credentials,
  signoff_maintenance, signoff_files, signoff_person, signoff_at
) ON public.manuals TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_manual(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
select jsonb_build_object(
'manual', to_jsonb(m) - 'user_id',
'agency', jsonb_build_object(
'agency_name',     p.agency_name,
'agency_website',  p.agency_website,
'logo_url',        p.logo_url,
'brand_color',     p.brand_color,
'support_email',   p.support_email,
'support_hours',   p.support_hours,
'emergency_phone', p.emergency_phone,
'show_footer',     (coalesce(p.plan, 'free') = 'free'),
'heading_font_key', p.heading_font_key,
'body_font_key',    p.body_font_key,
'custom_font_name', p.custom_font_name,
'custom_font_url',  p.custom_font_url
),
'accounts', coalesce((
select jsonb_agg(to_jsonb(a) - 'manual_id' order by a.service)
from public.accounts a where a.manual_id = m.id), '[]'::jsonb),
'edit_blocks', coalesce((
select jsonb_agg(to_jsonb(e) - 'manual_id' order by e.block_name)
from public.edit_blocks e where e.manual_id = m.id), '[]'::jsonb),
'coverage', coalesce((
select jsonb_agg(to_jsonb(c) - 'manual_id' order by c.item)
from public.coverage c where c.manual_id = m.id), '[]'::jsonb),
'custom_sections', coalesce((
select jsonb_agg(to_jsonb(s) - 'manual_id' order by s.position)
from public.custom_sections s where s.manual_id = m.id), '[]'::jsonb),
'custom_fields', coalesce((
select jsonb_agg(to_jsonb(f) - 'manual_id' order by f.position)
from public.custom_fields f where f.manual_id = m.id), '[]'::jsonb),
'assets', coalesce((
select jsonb_agg(to_jsonb(a) - 'manual_id' order by a.sort_order, a.label)
from public.assets a where a.manual_id = m.id), '[]'::jsonb),
'maintenance_tasks', coalesce((
select jsonb_agg(to_jsonb(mt) - 'manual_id'
order by array_position(ARRAY['daily','weekly','monthly','annual'], mt.cadence), mt.sort_order)
from public.maintenance_tasks mt where mt.manual_id = m.id), '[]'::jsonb),
'dns_records', coalesce((
select jsonb_agg(to_jsonb(d) - 'manual_id' order by d.sort_order, d.record_type)
from public.dns_records d where d.manual_id = m.id), '[]'::jsonb)
)
from public.manuals m
join public.profiles p on p.user_id = m.user_id
where m.slug = p_slug
and m.is_published;
$function$;
