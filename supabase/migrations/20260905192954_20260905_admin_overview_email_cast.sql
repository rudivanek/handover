/*
# Fix admin_overview() return type mismatch

## Problem
auth.users.email is `character varying(255)`, but admin_overview() declares
its first output column as `email text`. In a plpgsql RETURN QUERY, Postgres
raises "structure of query does not match function result type" (42804),
and PostgREST returns 400.

## Fix
Recreates public.admin_overview() identically except for casting the email
column: `u.email::text` in the select list. Everything else stays exactly
the same: same signature, same SECURITY DEFINER, same SET search_path TO
'public', same STABLE, same is_admin() check as the first statement, same
joins and ordering, same grants.

No other function, table, policy, or privilege is touched.
*/

create or replace function public.admin_overview()
returns table (
  email text,
  agency_name text,
  plan text,
  signed_up_at timestamptz,
  manual_count bigint,
  manual_dates timestamptz[]
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
    u.email::text,
    p.agency_name,
    p.plan,
    p.created_at as signed_up_at,
    coalesce(m.cnt, 0) as manual_count,
    coalesce(m.dates, ARRAY[]::timestamptz[]) as manual_dates
  from public.profiles p
  join auth.users u on u.id = p.user_id
  left join lateral (
    select
      count(*) as cnt,
      array_agg(m2.created_at order by m2.created_at) as dates
    from public.manuals m2
    where m2.user_id = p.user_id
  ) m on true
  order by p.created_at desc;
end;
$$;

grant execute on function public.admin_overview() to authenticated;
revoke execute on function public.admin_overview() from anon, public;
