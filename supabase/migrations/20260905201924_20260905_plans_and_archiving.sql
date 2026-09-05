/*
# Plans and archiving

## What this migration does

1. Adds `archived_at timestamptz` to public.manuals.
2. Grants UPDATE (archived_at) ON public.manuals TO authenticated — the
   client archives and unarchives. Does not re-grant updated_at or
   published_at; the database maintains those.
3. Migrates plan values: `paid` → `agency`, then adds a CHECK constraint
   enforcing plan IN ('free','freelancer','agency').
4. Creates public.plan_manual_limit(p_plan text) returns int, IMMUTABLE:
   free → 1, freelancer → 3, agency → null (unlimited), else → 1.
5. Drops the old BEFORE INSERT trigger trg_enforce_manual_quota and
   recreates enforce_manual_quota() as a BEFORE UPDATE trigger that fires
   only when a manual is becoming live (publishing or restoring from
   archive). Counts live manuals (is_published AND archived_at IS NULL)
   excluding the current row. If at or above limit, raises PLAN_LIMIT
   with check_violation. No BEFORE INSERT quota trigger remains — drafts
   are unlimited on every plan.

## What this migration does NOT do
- Does not touch get_public_manual. Archived manuals keep is_published
  = true and still serve.
- Does not change profiles' column-level UPDATE grant — plan stays
  client-unritable.
- Does not add policies to any table.
- Does not touch the publish gate, published_at trigger, touch_parent_manual,
  signup-notification trigger, admin_users, is_admin(), admin_overview().
*/

-- 1. Add archived_at column
alter table public.manuals add column if not exists archived_at timestamptz;

-- 2. Grant UPDATE on archived_at to authenticated
grant update (archived_at) on public.manuals to authenticated;

-- 3. Migrate plan values and add CHECK constraint
update public.profiles set plan = 'agency' where plan = 'paid';

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free','freelancer','agency'));

-- 4. plan_manual_limit() helper
create or replace function public.plan_manual_limit(p_plan text)
returns int
language sql
immutable
as $$
  select case p_plan
    when 'free' then 1
    when 'freelancer' then 3
    when 'agency' then null
    else 1
  end
$$;

-- 5. Replace the quota trigger

-- Drop the old BEFORE INSERT trigger
drop trigger if exists trg_enforce_manual_quota on public.manuals;

-- Recreate enforce_manual_quota() as a BEFORE UPDATE trigger
create or replace function public.enforce_manual_quota()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_plan  text;
  v_limit int;
  v_count int;
begin
  -- Only fire when the manual is becoming live
  if not (
    (NEW.is_published and not OLD.is_published and NEW.archived_at is null)
    or
    (NEW.is_published and OLD.archived_at is not null and NEW.archived_at is null)
  ) then
    return NEW;
  end if;

  -- Read the owner's plan
  select coalesce(plan, 'free') into v_plan
  from public.profiles where user_id = NEW.user_id;

  v_limit := public.plan_manual_limit(v_plan);

  -- null limit means unlimited
  if v_limit is null then
    return NEW;
  end if;

  -- Count live manuals excluding this row
  select count(*) into v_count
  from public.manuals
  where user_id = NEW.user_id
    and is_published
    and archived_at is null
    and id <> NEW.id;

  if v_count >= v_limit then
    raise exception 'PLAN_LIMIT'
      using errcode = 'check_violation',
            hint = 'Archive a live manual or upgrade your plan.';
  end if;

  return NEW;
end;
$$;

-- Attach as BEFORE UPDATE trigger
drop trigger if exists trg_enforce_manual_quota on public.manuals;
create trigger trg_enforce_manual_quota
  before update on public.manuals
  for each row
  execute function public.enforce_manual_quota();
