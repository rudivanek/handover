/*
# Add Studio plan tier ($39/month, 10 active manuals)

1. Changes
- Widen `profiles_plan_check` CHECK constraint to include 'studio' alongside
  'free', 'freelancer', and 'agency'. Existing accounts keep their current plan;
  no UPDATE is issued on any row.
- Amend `plan_manual_limit(p_plan text)` to add `when 'studio' then 10` between
  the freelancer and agency branches. The function stays `language sql immutable`
  and the `else 1` fallback is preserved unchanged.
- Amend `admin_set_plan(p_user_id uuid, p_plan text)` to add 'studio' to the
  valid-plan guard. The `is_admin()` check remains the first statement; the
  `SECURITY DEFINER` attribute and `SET search_path TO 'public'` are preserved.

2. What is NOT changed
- `enforce_manual_quota()` and its trigger are untouched — they read the limit
  through `plan_manual_limit()`, so widening that function is the whole change.
- The `profiles` column-level UPDATE grant is NOT re-issued. `plan` remains
  absent from the UPDATE privilege list — that omission is the paywall.
- No UPDATE statement on `profiles` or `manuals`. No `updated_at` rewrite.
- `get_public_manual`, the publish gate, archiving, and the free-plan footer
  rule (`show_footer = plan = 'free'`) are untouched.

3. Security
- `admin_set_plan` remains `SECURITY DEFINER` with `SET search_path TO 'public'`
  and its `is_admin()` gate as the first check.
- No new table, no new policy, no new grant.
*/

-- 1. Widen the CHECK constraint to include 'studio'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'freelancer', 'studio', 'agency'));

-- 2. Amend plan_manual_limit to add the studio tier (limit 10)
CREATE OR REPLACE FUNCTION public.plan_manual_limit(p_plan text)
  RETURNS integer
  LANGUAGE sql
  IMMUTABLE
AS $function$
  select case p_plan
    when 'free' then 1
    when 'freelancer' then 3
    when 'studio' then 10
    when 'agency' then null
    else 1
  end
$function$;

-- 3. Amend admin_set_plan to accept 'studio' as a valid plan
--    The is_admin() gate and SECURITY DEFINER attribute are preserved.
CREATE OR REPLACE FUNCTION public.admin_set_plan(p_user_id uuid, p_plan text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if p_plan not in ('free', 'freelancer', 'studio', 'agency') then
    raise exception 'invalid plan';
  end if;

  update public.profiles set plan = p_plan where user_id = p_user_id;
end;
$function$;
