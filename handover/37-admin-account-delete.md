# Admin-Only Account Deletion

## Step 0 — schema investigation

No prompt contradiction was found.

### Foreign keys to `public.manuals`

All eight are in `public`, all child columns are `manual_id`, and every constraint has `ON DELETE CASCADE`:

- `accounts.manual_id` — `accounts_manual_id_fkey` — CASCADE
- `assets.manual_id` — `assets_manual_id_fkey` — CASCADE
- `coverage.manual_id` — `coverage_manual_id_fkey` — CASCADE
- `custom_fields.manual_id` — `custom_fields_manual_id_fkey` — CASCADE
- `custom_sections.manual_id` — `custom_sections_manual_id_fkey` — CASCADE
- `edit_blocks.manual_id` — `edit_blocks_manual_id_fkey` — CASCADE
- `maintenance_tasks.manual_id` — `maintenance_tasks_manual_id_fkey` — CASCADE
- `manual_contacts.manual_id` — `manual_contacts_manual_id_fkey` — CASCADE

### Foreign keys to `public.profiles`

None.

### Foreign keys to `auth.users`

All have `ON DELETE CASCADE`:

- `auth.identities.user_id` — `identities_user_id_fkey`
- `auth.mfa_factors.user_id` — `mfa_factors_user_id_fkey`
- `auth.oauth_authorizations.user_id` — `oauth_authorizations_user_id_fkey`
- `auth.oauth_consents.user_id` — `oauth_consents_user_id_fkey`
- `auth.one_time_tokens.user_id` — `one_time_tokens_user_id_fkey`
- `auth.sessions.user_id` — `sessions_user_id_fkey`
- `auth.webauthn_challenges.user_id` — `webauthn_challenges_user_id_fkey`
- `auth.webauthn_credentials.user_id` — `webauthn_credentials_user_id_fkey`
- `public.admin_users.user_id` — `admin_users_user_id_fkey`
- `public.agency_scripts.user_id` — `agency_scripts_user_id_fkey`
- `public.manual_templates.user_id` — `manual_templates_user_id_fkey`
- `public.manuals.user_id` — `manuals_user_id_fkey`
- `public.profiles.user_id` — `profiles_user_id_fkey`

The `postgres` role has DELETE privilege on `auth.users`, so the `SECURITY DEFINER` function can attempt the final auth deletion. The function also explicitly deletes `agency_scripts` and `manual_templates` before that attempt rather than relying on those auth cascades.

## Migration

Applied as `20260909_admin_delete_account`. No migration file was created on disk; the migration was applied directly to the provisioned database.

`public.admin_delete_account(p_user_id uuid)` is `SECURITY DEFINER`, `LANGUAGE plpgsql`, and `SET search_path TO 'public'`.

Body order:

1. `public.is_admin()` check; raises `not authorized`.
2. Rejects `p_user_id = auth.uid()` with `cannot delete yourself`.
3. Rejects a target in `public.admin_users` with `cannot delete an admin`.
4. Rejects the owner of `aurora-dental-4k2m9x` with `cannot delete the demo account`.
5. Counts all manuals and active manuals (`is_published` and `archived_at IS NULL`).
6. Explicitly deletes all eight manual child tables.
7. Deletes manuals, user-owned scripts/templates, and the profile row.
8. Attempts `DELETE FROM auth.users`; catches failure and returns `auth_deleted: false` rather than failing or hiding the partial result.
9. Returns `jsonb_build_object('manuals_deleted', ..., 'active_deleted', ..., 'auth_deleted', ...)`.

`GRANT EXECUTE` exists for `authenticated`. `anon` and `public` hold no EXECUTE privilege. No table-level or column-level GRANT was added, and no table policy was added or altered. The existing `profiles` privileges still have no UPDATE privilege for `authenticated`.

## Admin page

Each admin table row has a separate destructive Delete action, not adjacent to the plan selector. The confirmation dialog shows email, agency, manual count, and active-manual count; warns that active manuals go permanently offline for clients; and keeps confirmation disabled until the exact email is typed.

After success, the page refetches `admin_overview()` and displays the deleted totals. When `auth_deleted` is false, it says that application data was removed but the login still exists. RPC errors are logged with `console.error` and the real RPC error message is displayed.

There is still no `/admin` navigation link. Non-admin users still receive the existing plain not-found screen.

## Verification

1. Simulated non-admin call to `admin_delete_account` returned `not authorized`.
2. Simulated admin self-delete returned `cannot delete yourself`.
3. Simulated admin deletion of the demo owner returned `cannot delete the demo account`.
4. The demo manual remained present, published, and unchanged at slug `aurora-dental-4k2m9x`.
5. Created a throwaway auth account with a published manual, account row, and maintenance row. The UI source requires exact-email confirmation and disables the button for a wrong email.
6. Deleted the throwaway account through the RPC. Result: `manuals_deleted: 1`, `active_deleted: 1`, `auth_deleted: true`.
7. Checked all eight manual child tables, the manual, profile, and `auth.users`: every count was zero. `get_public_manual` returned null for the deleted slug.
8. Signed up again with the deleted email through the real Supabase auth client. Signup succeeded and returned a live session, proving the original `auth.users` row was removed. The recreated throwaway account was then removed through the same RPC and returned `auth_deleted: true`.
9. The demo remained present and the admin overview returned to 12 accounts, 11 manuals, and 8 active manuals.

The production build and TypeScript check passed. No change was made to `get_public_manual`, quota functions, `admin_set_plan`, `admin_overview`, publish behavior, triggers, `admin_users`, `is_admin()`, `data/*`, `lib/completion.ts`, `lib/defaults.ts`, `lib/supabase.ts`, `lib/auth-context.tsx`, `app/reset-password/page.tsx`, or `app/login/page.tsx`.
