-- ============================================================
-- 0. RLS on, everywhere
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.manuals      enable row level security;
alter table public.accounts     enable row level security;
alter table public.edit_blocks  enable row level security;
alter table public.coverage     enable row level security;
alter table public.custom_sections enable row level security;
alter table public.custom_fields   enable row level security;

-- ============================================================
-- 1. Drop every existing policy on these seven tables.
--    We recreate the complete set below, so the starting state
--    is known rather than inherited.
-- ============================================================
do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','manuals','accounts','edit_blocks','coverage','custom_sections','custom_fields')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ============================================================
-- 2. Owner-scoped policies. Note: role is `authenticated` only.
--    There are deliberately NO policies for `anon`.
-- ============================================================
create policy profiles_select_own on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (user_id = auth.uid())
                                 with check (user_id = auth.uid());

create policy manuals_select_own on public.manuals
  for select to authenticated using (user_id = auth.uid());
create policy manuals_insert_own on public.manuals
  for insert to authenticated with check (user_id = auth.uid());
create policy manuals_update_own on public.manuals
  for update to authenticated using (user_id = auth.uid())
                                 with check (user_id = auth.uid());
create policy manuals_delete_own on public.manuals
  for delete to authenticated using (user_id = auth.uid());

-- Child tables inherit ownership through manual_id.
do $$
declare t text;
begin
  foreach t in array array['accounts','edit_blocks','coverage','custom_sections','custom_fields'] loop
    execute format($f$
      create policy %1$s_select_own on public.%1$s
        for select to authenticated using (exists (
          select 1 from public.manuals m
          where m.id = %1$s.manual_id and m.user_id = auth.uid()));
      create policy %1$s_insert_own on public.%1$s
        for insert to authenticated with check (exists (
          select 1 from public.manuals m
          where m.id = %1$s.manual_id and m.user_id = auth.uid()));
      create policy %1$s_update_own on public.%1$s
        for update to authenticated using (exists (
          select 1 from public.manuals m
          where m.id = %1$s.manual_id and m.user_id = auth.uid()))
        with check (exists (
          select 1 from public.manuals m
          where m.id = %1$s.manual_id and m.user_id = auth.uid()));
      create policy %1$s_delete_own on public.%1$s
        for delete to authenticated using (exists (
          select 1 from public.manuals m
          where m.id = %1$s.manual_id and m.user_id = auth.uid()));
    $f$, t);
  end loop;
end $$;

-- ============================================================
-- 3. Belt and braces: anon holds no table privileges at all.
-- ============================================================
revoke all on public.profiles, public.manuals, public.accounts,
              public.edit_blocks, public.coverage,
              public.custom_sections, public.custom_fields
  from anon;

-- ============================================================
-- 4. plan is read-only to the client.
--    Column-level grants are enforced alongside RLS, so the
--    settings form still saves branding but cannot touch plan.
-- ============================================================
revoke update on public.profiles from authenticated;
grant update (agency_name, logo_url, brand_color, support_email,
              support_hours, emergency_phone, ui_locale)
  on public.profiles to authenticated;

-- ============================================================
-- 5. The one door anonymous visitors get.
--    Returns the whole manual as a single JSON object, including
--    custom_sections and custom_fields. Strips user_id everywhere.
-- ============================================================
create or replace function public.get_public_manual(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
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
      from public.custom_fields f where f.manual_id = m.id), '[]'::jsonb)
  )
  from public.manuals m
  join public.profiles p on p.user_id = m.user_id
  where m.slug = p_slug;
$$;

revoke all on function public.get_public_manual(text) from public;
grant execute on function public.get_public_manual(text) to anon, authenticated;

-- ============================================================
-- 6. Free plan = 1 manual, enforced in Postgres.
-- ============================================================
create or replace function public.enforce_manual_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_plan text;
  existing  int;
begin
  select coalesce(plan, 'free') into user_plan
    from public.profiles where user_id = new.user_id;

  if coalesce(user_plan, 'free') <> 'free' then
    return new;
  end if;

  select count(*) into existing
    from public.manuals where user_id = new.user_id;

  if existing >= 1 then
    raise exception 'FREE_PLAN_LIMIT'
      using errcode = 'check_violation',
            hint = 'Free accounts include one manual. Upgrade for unlimited.';
  end if;

  return new;
end $$;

drop trigger if exists trg_enforce_manual_quota on public.manuals;
create trigger trg_enforce_manual_quota
  before insert on public.manuals
  for each row execute function public.enforce_manual_quota();
