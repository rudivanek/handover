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
