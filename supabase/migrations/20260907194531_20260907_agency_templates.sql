/*
# Agency templates

## What this migration does

1. Creates `public.manual_templates` — an agency's saved manual shapes.
   Each template stores hidden_fields, hidden_sections, and a name.
   owner-scoped to the agency via user_id.

2. Creates `public.template_custom_fields` — custom fields defined in a
   template, to be stamped onto new manuals at creation time.
   Inherits ownership through template_id (same pattern as manual child
   tables inheriting through manual_id).

3. Adds `hidden_fields text[]` and `hidden_sections text[]` columns to
   `public.manuals`. These are the stamp — copied from a template at
   INSERT, never updated afterwards.

4. Does NOT add hidden_fields or hidden_sections to the column-level
   UPDATE grant on manuals. They are written once at INSERT, which the
   INSERT policy governs. Leaving them out of the UPDATE grant is what
   makes "a manual's shape cannot change after creation" true at the
   database level.

5. Enables RLS on both new tables with four owner-scoped policies each
   (select/insert/update/delete), matching the existing manuals pattern.

6. REVOKE ALL on both new tables FROM anon — this platform grants
   everything to anon by default on new tables.

7. Adds a CHECK constraint on template_custom_fields.label matching the
   existing custom_fields_no_secret_names constraint.

8. Creates a BEFORE INSERT trigger on manual_templates that raises when
   the owner's plan is 'free' — templates are a paid feature. Mirrors
   enforce_manual_quota()'s approach of reading the plan from profiles.

## What this migration does NOT do
- Does not modify get_public_manual.
- Does not touch any existing RLS policy on any table.
- Does not touch enforce_manual_quota, plan_manual_limit, admin functions,
  the signup trigger, touch_parent_manual, or manuals_set_updated_at.
- Does not re-issue the column-level UPDATE grant on manuals — the new
  columns are deliberately absent from it.
*/

-- 1. manual_templates table
create table if not exists public.manual_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  hidden_fields text[] not null default '{}',
  hidden_sections text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.manual_templates enable row level security;

drop policy if exists "select_own_templates" on public.manual_templates;
create policy "select_own_templates" on public.manual_templates
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "insert_own_templates" on public.manual_templates;
create policy "insert_own_templates" on public.manual_templates
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "update_own_templates" on public.manual_templates;
create policy "update_own_templates" on public.manual_templates
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_templates" on public.manual_templates;
create policy "delete_own_templates" on public.manual_templates
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.manual_templates from anon;

-- 2. template_custom_fields table
create table if not exists public.template_custom_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.manual_templates on delete cascade,
  section_key text not null,
  label text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.template_custom_fields enable row level security;

drop policy if exists "select_own_template_fields" on public.template_custom_fields;
create policy "select_own_template_fields" on public.template_custom_fields
  for select to authenticated
  using (exists (
    select 1 from public.manual_templates t
    where t.id = template_custom_fields.template_id
    and t.user_id = auth.uid()
  ));

drop policy if exists "insert_own_template_fields" on public.template_custom_fields;
create policy "insert_own_template_fields" on public.template_custom_fields
  for insert to authenticated
  with check (exists (
    select 1 from public.manual_templates t
    where t.id = template_custom_fields.template_id
    and t.user_id = auth.uid()
  ));

drop policy if exists "update_own_template_fields" on public.template_custom_fields;
create policy "update_own_template_fields" on public.template_custom_fields
  for update to authenticated
  using (exists (
    select 1 from public.manual_templates t
    where t.id = template_custom_fields.template_id
    and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.manual_templates t
    where t.id = template_custom_fields.template_id
    and t.user_id = auth.uid()
  ));

drop policy if exists "delete_own_template_fields" on public.template_custom_fields;
create policy "delete_own_template_fields" on public.template_custom_fields
  for delete to authenticated
  using (exists (
    select 1 from public.manual_templates t
    where t.id = template_custom_fields.template_id
    and t.user_id = auth.uid()
  ));

revoke all on public.template_custom_fields from anon;

-- 3. Secret-name CHECK constraint on template_custom_fields.label
alter table public.template_custom_fields
  add constraint template_custom_fields_no_secret_names
  check (
    lower(label) !~ '(password|passwd|pwd|contrase|secreto|secret|api[ _-]?key|apikey|token|credencial|credential|cvv)'
  );

-- 4. Add hidden_fields and hidden_sections to manuals
alter table public.manuals
  add column if not exists hidden_fields text[] not null default '{}';

alter table public.manuals
  add column if not exists hidden_sections text[] not null default '{}';

-- 5. Plan-gate trigger on manual_templates
create or replace function public.enforce_template_plan_gate()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_plan text;
begin
  select coalesce(plan, 'free') into v_plan
  from public.profiles where user_id = NEW.user_id;

  if v_plan = 'free' then
    raise exception 'PLAN_GATE: templates are a paid feature'
      using errcode = 'check_violation',
            hint = 'Upgrade to Freelancer or Agency to create templates.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_template_plan_gate on public.manual_templates;
create trigger trg_template_plan_gate
  before insert on public.manual_templates
  for each row
  execute function public.enforce_template_plan_gate();
