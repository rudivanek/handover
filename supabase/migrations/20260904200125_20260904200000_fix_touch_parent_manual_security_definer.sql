/*
# Fix touch_parent_manual() privilege failure

## Problem
The previous migration (20260904194944) revoked authenticated's blanket
table-level UPDATE on manuals and re-granted it column by column, excluding
updated_at so clients cannot forge the timestamp. However, touch_parent_manual()
runs `UPDATE public.manuals SET updated_at = now()` as the invoking role
(authenticated), which no longer has UPDATE on that column. Every child-row
save (accounts, edit_blocks, coverage, custom_sections, custom_fields, assets)
fails with a permission error, and because these are AFTER triggers the whole
save aborts.

## Fix
Recreate public.touch_parent_manual() as SECURITY DEFINER with
SET search_path = public. This allows the trigger function to update
updated_at on the parent manual regardless of the invoking role's column
privileges. The body is unchanged: on DELETE touch OLD.manual_id, otherwise
NEW.manual_id, RETURN NULL.

## Why SECURITY DEFINER is safe
It bypasses RLS on manuals, but the only way to reach the trigger is to
successfully insert, update or delete a child row, which RLS already restricts
to rows whose parent manual belongs to the caller. The WHERE clause stays
keyed to that child row's manual_id and is not broadened.

## What does NOT change
- The six child-table triggers (they already point at this function).
- The BEFORE UPDATE trigger on manuals (it assigns NEW.updated_at, no column
  privilege needed).
- The column-level UPDATE grant on manuals, and the exclusion of updated_at.
- get_public_manual, RLS policies, plan trigger, secret-name constraints.
*/

CREATE OR REPLACE FUNCTION public.touch_parent_manual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.manuals SET updated_at = now() WHERE id = OLD.manual_id;
  ELSE
    UPDATE public.manuals SET updated_at = now() WHERE id = NEW.manual_id;
  END IF;
  RETURN NULL;
END;
$$;
