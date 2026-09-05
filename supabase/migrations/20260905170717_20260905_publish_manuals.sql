alter table public.manuals
  add column if not exists is_published boolean not null default false,
  add column if not exists published_at timestamptz;

-- Nothing already shared may go dark, including the seeded demo manual.
update public.manuals
   set is_published = true,
       published_at = coalesce(published_at, created_at);

-- Re-issue the column-level UPDATE grant to include is_published.
-- published_at is deliberately NOT granted — the database maintains it
-- from the trigger, so a client cannot forge the publication date.
GRANT UPDATE (is_published) ON public.manuals TO authenticated;

-- Extend the existing BEFORE UPDATE trigger function (not a second trigger)
-- so that when is_published goes from false to true and published_at is null,
-- the database sets published_at = now(). Assigning to NEW inside a BEFORE
-- trigger does not require a column privilege.
CREATE OR REPLACE FUNCTION public.touch_manuals_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  IF NEW.is_published = true AND OLD.is_published = false AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

-- Amend get_public_manual: add `and m.is_published` to the final WHERE.
-- Every key it returns survives unchanged.
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
from public.maintenance_tasks mt where mt.manual_id = m.id), '[]'::jsonb)
)
from public.manuals m
join public.profiles p on p.user_id = m.user_id
where m.slug = p_slug
  and m.is_published;
$function$;