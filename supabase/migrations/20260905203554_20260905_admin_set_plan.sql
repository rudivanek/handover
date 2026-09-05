/*
# Admin plan control

## 1. admin_set_plan(p_user_id uuid, p_plan text) returns void
SECURITY DEFINER, SET search_path TO 'public', LANGUAGE plpgsql.
- is_admin() check as first statement
- rejects invalid plan values
- updates profiles.plan
- grant execute to authenticated; revoke from anon and public

Does NOT add `plan` to the column-level UPDATE grant on profiles.
That omission is the paywall — this function is the only path to write plan.

## 2. Amend admin_overview() to add user_id uuid and live_count bigint.
Must drop and recreate since the return type changes.
Keeps all existing columns, the u.email::text cast, is_admin() check,
same joins and ordering. live_count is count(*) filter (where m2.is_published
and m2.archived_at is null) in the existing lateral subquery.
*/

-- 1. admin_set_plan()
create or replace function public.admin_set_plan(p_user_id uuid, p_plan text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if p_plan not in ('free','freelancer','agency') then
    raise exception 'invalid plan';
  end if;

  update public.profiles set plan = p_plan where user_id = p_user_id;
end;
$$;

grant execute on function public.admin_set_plan(uuid, text) to authenticated;
revoke execute on function public.admin_set_plan(uuid, text) from anon, public;

-- 2. Amend admin_overview() — drop and recreate with new return type
drop function if exists public.admin_overview();

create or replace function public.admin_overview()
returns table (
  user_id uuid,
  email text,
  agency_name text,
  plan text,
  signed_up_at timestamptz,
  manual_count bigint,
  manual_dates timestamptz[],
  live_count bigint
)
language plpgsql
security definer
set search_path to 'public'
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.user_id,
    u.email::text,
    p.agency_name,
    p.plan,
    p.created_at as signed_up_at,
    coalesce(m.cnt, 0) as manual_count,
    coalesce(m.dates, ARRAY[]::timestamptz[]) as manual_dates,
    coalesce(m.live, 0) as live_count
  from public.profiles p
  join auth.users u on u.id = p.user_id
  left join lateral (
    select
      count(*) as cnt,
      array_agg(m2.created_at order by m2.created_at) as dates,
      count(*) filter (where m2.is_published and m2.archived_at is null) as live
    from public.manuals m2
    where m2.user_id = p.user_id
  ) m on true
  order by p.created_at desc;
end;
$$;

grant execute on function public.admin_overview() to authenticated;
revoke execute on function public.admin_overview() from anon, public;
