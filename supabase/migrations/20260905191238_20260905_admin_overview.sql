/*
# Admin overview — read-only operator dashboard

## Purpose
Adds a single-operator admin dashboard that shows aggregate account data
(emails, agency names, plans, signup dates, manual counts and dates) across
all agencies. Read-only, aggregate only. No client data, no slugs, no URLs.

## What this migration does

1. Creates `public.admin_users` table — a lookup table of who can see the
   admin overview. RLS enabled with NO policies: no one can read or write
   through normal queries. Only SECURITY DEFINER functions reach it.
   All privileges revoked from anon and authenticated.

2. Seeds the admin by email (rfv@datago.net), not by hardcoded user id.
   If the account does not exist, the insert is a no-op.

3. Creates `public.is_admin()` — SECURITY DEFINER, STABLE, returns boolean.
   Checks whether the current authenticated user is in admin_users.
   EXECUTE granted to authenticated only.

4. Creates `public.admin_overview()` — SECURITY DEFINER, STABLE, returns a
   table of: email, agency_name, plan, signed_up_at, manual_count,
   manual_dates. First line checks is_admin() and raises 'not authorized'
   if false. Joins profiles → auth.users (email) and profiles → manuals
   (count + array of created_at, oldest first). Ordered by signed_up_at
   desc. EXECUTE granted to authenticated only; revoked from anon and public.

## Security design
- No policy is added to any table. The admin_users table has RLS with zero
  policies — it is invisible to anon and authenticated.
- is_admin() is the gate. admin_overview() calls it and raises an exception
  if the caller is not an admin. A non-admin calling the RPC gets an error,
  no rows.
- No column is added to profiles or manuals. No existing policy or grant
  is altered.
- The Resend notification trigger is untouched.
*/

-- 1. Admin users table
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

revoke all on public.admin_users from anon, authenticated;

-- 2. Seed the admin by email
insert into public.admin_users (user_id)
select id from auth.users where email = 'rfv@datago.net'
on conflict (user_id) do nothing;

-- 3. is_admin() — gate function
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path to 'public'
stable
as $$
begin
  return exists (select 1 from public.admin_users where user_id = auth.uid());
end;
$$;

grant execute on function public.is_admin() to authenticated;
revoke execute on function public.is_admin() from anon, public;

-- 4. admin_overview() — aggregate data, admin-gated
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
    u.email,
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
