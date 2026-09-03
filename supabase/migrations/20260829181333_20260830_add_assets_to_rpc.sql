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
'logo_url',        p.logo_url,
'brand_color',     p.brand_color,
'support_email',   p.support_email,
'support_hours',   p.support_hours,
'emergency_phone', p.emergency_phone,
'show_footer',     (coalesce(p.plan, 'free') = 'free')
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
from public.assets a where a.manual_id = m.id), '[]'::jsonb)
)
from public.manuals m
join public.profiles p on p.user_id = m.user_id
where m.slug = p_slug;
$function$;
