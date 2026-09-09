/*
# Add admin account deletion function

1. Purpose
- Add one server-enforced, admin-only function for permanently deleting a user account.
- The function is intentionally separate from ordinary application writes because this action is destructive and irreversible.

2. Deletion scope
- Refuse to delete the currently signed-in administrator.
- Refuse to delete any administrator listed in `public.admin_users`.
- Refuse to delete the account that owns the demo manual with slug `aurora-dental-4k2m9x`.
- Count all manuals and active manuals before deletion.
- Explicitly delete every row belonging to the user's manuals in `accounts`, `assets`, `coverage`, `custom_fields`, `custom_sections`, `edit_blocks`, `maintenance_tasks`, and `manual_contacts`.
- Delete the user's manuals, profile row, user-owned `agency_scripts`, and `manual_templates` rows.
- Attempt to delete the corresponding `auth.users` row. If that final step cannot complete, preserve the completed application-data deletion and return `auth_deleted: false` rather than hiding the result.

3. Security
- `public.admin_delete_account(uuid)` is `SECURITY DEFINER` with `SET search_path TO 'public'` and checks `public.is_admin()` inside the function.
- EXECUTE is granted only to `authenticated`; EXECUTE is revoked from `anon` and `public`.
- No table policies are created or changed.
- No table-level or column-level grants are created or changed.

4. Return value
- Return JSON containing `manuals_deleted`, `active_deleted`, and `auth_deleted`.

5. Important notes
- The function does not alter `get_public_manual`, quota functions, publish behavior, triggers, `admin_users`, `is_admin()`, or the demo manual.
- The explicit child deletes do not rely on the existing foreign-key cascades for application-owned manual data.
*/

CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_manuals_deleted bigint;
  v_active_deleted bigint;
  v_auth_deleted boolean := false;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot delete yourself';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'cannot delete an admin';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.manuals
    WHERE user_id = p_user_id
      AND slug = 'aurora-dental-4k2m9x'
  ) THEN
    RAISE EXCEPTION 'cannot delete the demo account';
  END IF;

  SELECT count(*)
  INTO v_manuals_deleted
  FROM public.manuals
  WHERE user_id = p_user_id;

  SELECT count(*)
  INTO v_active_deleted
  FROM public.manuals
  WHERE user_id = p_user_id
    AND is_published
    AND archived_at IS NULL;

  DELETE FROM public.accounts
  WHERE manual_id IN (SELECT id FROM public.manuals WHERE user_id = p_user_id);

  DELETE FROM public.assets
  WHERE manual_id IN (SELECT id FROM public.manuals WHERE user_id = p_user_id);

  DELETE FROM public.coverage
  WHERE manual_id IN (SELECT id FROM public.manuals WHERE user_id = p_user_id);

  DELETE FROM public.custom_fields
  WHERE manual_id IN (SELECT id FROM public.manuals WHERE user_id = p_user_id);

  DELETE FROM public.custom_sections
  WHERE manual_id IN (SELECT id FROM public.manuals WHERE user_id = p_user_id);

  DELETE FROM public.edit_blocks
  WHERE manual_id IN (SELECT id FROM public.manuals WHERE user_id = p_user_id);

  DELETE FROM public.maintenance_tasks
  WHERE manual_id IN (SELECT id FROM public.manuals WHERE user_id = p_user_id);

  DELETE FROM public.manual_contacts
  WHERE manual_id IN (SELECT id FROM public.manuals WHERE user_id = p_user_id);

  DELETE FROM public.manuals
  WHERE user_id = p_user_id;

  DELETE FROM public.agency_scripts
  WHERE user_id = p_user_id;

  DELETE FROM public.manual_templates
  WHERE user_id = p_user_id;

  DELETE FROM public.profiles
  WHERE user_id = p_user_id;

  BEGIN
    DELETE FROM auth.users
    WHERE id = p_user_id;

    v_auth_deleted := FOUND;
  EXCEPTION
    WHEN OTHERS THEN
      v_auth_deleted := false;
  END;

  RETURN jsonb_build_object(
    'manuals_deleted', v_manuals_deleted,
    'active_deleted', v_active_deleted,
    'auth_deleted', v_auth_deleted
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_account(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_delete_account(uuid) TO authenticated;
