# PimpMyCopy Features Documentation

<!--
Version: 1.5.0
Last Updated: 2026-09-09T18:01:43Z
-->

## 1. Plan & Billing Card (Settings Page)

### 1.1 Three-Tier Plan Display

The Plan & Billing card on the Settings page (`app/settings/page.tsx`) now correctly handles all three plan values: `free`, `freelancer`, and `agency`. Previously, the card branched on `profile.plan === 'paid'`, a value that no longer exists — every account fell through to the free branch, including Agency subscribers.

**Current behavior:**

- **Free**: Shows "Free plan — one manual" text with an Upgrade button (when `NEXT_PUBLIC_STRIPE_LINK` is set). Shows current active manual usage as `{count} of {limit} active manuals`.
- **Freelancer**: Shows "Freelancer — 3 active manuals at a time, no Handover branding." with a green checkmark. Shows usage as `{count} of {limit} active manuals`. Upgrade button to Agency when `NEXT_PUBLIC_STRIPE_LINK` is set.
- **Agency**: Shows "Agency — unlimited manuals, no Handover branding." with a green checkmark. Shows usage as `{count} active manuals`. No Upgrade button.
- **Unexpected value**: Falls back to the free text and logs `console.error` with the unexpected plan value.

### 1.2 Usage Count

The card displays the account's current active manual count, using the same condition as the quota trigger and the nav indicator: `is_published = true AND archived_at IS NULL`. This count is fetched via a Supabase query in a `useEffect` that runs when the profile changes.

### 1.3 Subscription-End Note

Every plan branch now includes the note: "If a subscription ends, manuals already published stay online and readable, and the account returns to the free plan." This matches the published policy on the marketing site and legal page.

### 1.4 Updated Pricing Copy

`settings.upgradePrice` in both locale files now reads the current pricing:
- English: "Freelancer $19/month for 3 active manuals. Agency $79/month for unlimited. Billed monthly. Drafts and archived manuals are unlimited on every plan."
- Spanish: "Freelancer $19/mes por 3 manuales activos. Agencia $79/mes por ilimitados. Facturación mensual. Borradores y manuales archivados son ilimitados en todos los planes."

The old "$29/month or $290/year" pricing has been removed from all locale files.

### 1.5 Shared Plan Constants

Plan names and limits are now defined in `lib/plans.ts` and imported by both `AppShell` and the Settings page, so there is a single source of truth. Previously, `AppShell` defined its own `PLAN_LABELS` and `PLAN_LIMITS` constants inline.

## 2. Vocabulary Change: "Live" → "Active"

### 2.1 Rationale

"Live" implied that an archived manual was offline. In reality, archiving keeps the page online and read-only — the word was undermining trust in the part of the pricing that needs it most. "Active" is the correct term: the three manual states now read **Draft / Active / Archived** (English) and **Borrador / Activo / Archivado** (Spanish).

### 2.2 Affected Locale Keys (English)

The JSON key names are unchanged; only the values changed:

| Key | Old value | New value |
|-----|-----------|-----------|
| `edit.live` | Live | Active |
| `manuals.live` | Live | Active |
| `manuals.liveCount` | {live} of {limit} live manuals | {live} of {limit} active manuals. Archived manuals stay online and don't count. |
| `manuals.liveCountUnlimited` | {live} live manuals | {live} active manuals. Archived manuals stay online and don't count. |
| `manuals.copyLinkNotLive` | (unchanged text) | (unchanged text) |
| `planLimit.body` | You have {n} live manuals... | You have {n} active manuals... |
| `planLimit.upgradeFree` | 3 live manuals for $19/month | 3 active manuals for $19/month |
| `plan.liveCountUnlimited` | {live} live | {live} active |
| `manuals.deleteBodyLive` | "{name}" is live — ... | "{name}" is active — ... |
| `manuals.restoredDesc` | {name} is now live again. | {name} is now active again. |

### 2.3 Affected Locale Keys (Spanish)

| Key | Old value | New value |
|-----|-----------|-----------|
| `edit.live` | Publicado | Activo |
| `manuals.live` | Publicado | Activo |
| `manuals.liveCount` | {live} de {limit} manuales publicados | {live} de {limit} manuales activos. Los manuales archivados siguen en línea y no cuentan. |
| `manuals.liveCountUnlimited` | {live} manuales publicados | {live} manuales activos. Los manuales archivados siguen en línea y no cuentan. |
| `planLimit.body` | Tienes {n} manuales publicados... | Tienes {n} manuales activos... |
| `planLimit.upgradeFree` | 3 manuales publicados por $19/mes | 3 manuales activos por $19/mes |
| `plan.liveCountUnlimited` | {live} publicados | {live} activos |
| `manuals.deleteBodyLive` | "{name}" está publicado — ... | "{name}" está activo — ... |

### 2.4 AppShell Nav Indicator

The plan indicator chip in the navigation bar (`components/app-shell.tsx`) previously displayed "live" (English) or "publicados" (Spanish) for unlimited plans. These now read "active" and "activos" respectively.

### 2.5 Archived Reassurance

Wherever a count first appears to the user — the manuals list header and the plan-limit dialog — the number is followed by the reassurance: "Archived manuals stay online and don't count." (English) / "Los manuales archivados siguen en línea y no cuentan." (Spanish). This sentence is what actually removes the doubt about archiving.

### 2.6 New Locale Keys Added

- `settings.freelancerPlan`: Freelancer plan description
- `settings.agencyPlan`: Agency plan description
- `settings.usageLimited`: "{count} of {limit} active manuals"
- `settings.usageUnlimited`: "{count} active manuals"
- `settings.subscriptionNote`: Subscription-end policy note
- `manuals.archivedNote`: "Archived manuals stay online and don't count."

### 2.7 Plural Agreement Fix

The manuals list header previously rendered "1 active manuals" — the noun didn't agree with the count. Singular variants were added to both locale files (`manuals.liveCountSingular`, `manuals.liveCountUnlimitedSingular`) and the manuals page (`app/manuals/page.tsx`) now selects the singular variant when the count is exactly 1.

### 2.8 What Was Not Changed

- No database migrations, columns, policies, grants, triggers, or functions were modified.
- `is_published`, `archived_at`, `enforce_manual_quota()`, `plan_manual_limit()`, `admin_set_plan()`, the templates plan gate, and `get_public_manual` are untouched.
- JSON key names were preserved; only values changed.
- `edit.published` (the toast shown when clicking Publish) remains "Published" / "Publicado" — this is the action, not the state badge.
- `edit.notPublished` remains "Not published" / "No publicado" — this is the draft state label.

## 3. Handover Sign-off Checklist

### 3.1 Purpose

A six-item checklist the agency completes when the handover actually happens, shown on the client's manual as a completion record. The agency ticks these, never the client. The public manual page stays read-only for anonymous visitors — there is no form, button, or write path on the public page, and anon has no privilege on anything.

This feature replaces the separately-planned "credential transfer status" field. It is one tick on this list ("Credentials transferred separately"), not its own column.

### 3.2 Database Migration — 20260908_handover_signoff

Eight new columns added to `public.manuals`:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `signoff_domain` | boolean NOT NULL | false | Domain ownership confirmed |
| `signoff_hosting` | boolean NOT NULL | false | Hosting confirmed |
| `signoff_accounts` | boolean NOT NULL | false | Accounts and access reviewed |
| `signoff_credentials` | boolean NOT NULL | false | Credentials transferred separately |
| `signoff_maintenance` | boolean NOT NULL | false | Maintenance responsibilities explained |
| `signoff_files` | boolean NOT NULL | false | Files and assets delivered |
| `signoff_person` | text | NULL | Who the handover was confirmed with (free text) |
| `signoff_at` | timestamptz | NULL | Set when the agency marks the handover complete |

### 3.3 Column-Level UPDATE Grant — Before and After

**Before (21 columns):** archived_at, client_name, domain_expiry, domain_owner, email_provider, emergency_email, emergency_name, emergency_phone, emergency_role, framework_or_theme, host, host_plan, host_renewal, is_published, key_plugins, locale, nameservers, platform, registrar, site_name, site_url

**After (29 columns — 8 added):** All 21 above plus: signoff_accounts, signoff_at, signoff_credentials, signoff_domain, signoff_files, signoff_hosting, signoff_maintenance, signoff_person

**Deliberately absent (8 columns, still absent):** created_at, hidden_fields, hidden_sections, id, published_at, slug, updated_at, user_id

### 3.4 get_public_manual — Not Modified

`get_public_manual` was not modified. It builds its output as `to_jsonb(m) - 'user_id'`, so the eight new columns reach the public page automatically. This was confirmed by reading the function definition from the catalogue — it still uses the same `to_jsonb(m) - 'user_id'` expression.

### 3.5 anon Gained No Privilege

No new table was created, so no `REVOKE ... FROM anon` was needed. The `anon` role has zero table-level and zero column-level privileges on `public.manuals`, and this migration added none.

### 3.6 The Editor — app/manuals/[id]/edit/page.tsx

A new "Handover sign-off" section was added as the last accordion item, after "Client contacts (private)". It contains:

- Six checkboxes with plain labels (Domain ownership confirmed, Hosting confirmed, Accounts and access reviewed, Credentials transferred separately, Maintenance responsibilities explained, Files and assets delivered)
- A "Confirmed with" text field for the person's name (free text, screened warn-only with the existing `checkFieldName` helper — no secret-name CHECK constraint on the column)
- A tick count display ("{count} of 6 items ticked")
- A "Mark handover complete" action that stamps `signoff_at` to `now()`
- An "Undo" action that clears `signoff_at` back to null
- The date is set by the action, never typed

Two rules enforced:
1. Marking complete does not require every box ticked — some handovers genuinely have nothing to transfer. The tick count is shown but not gated on.
2. Sign-off is excluded from `computeCompletion` (confirmed — it measures whether the manual is written, not whether the project is finished). `lib/completion.ts` was not modified.

### 3.7 The Public Page — app/m/[slug]/page.tsx

When `signoff_at` is set, a block renders at the end of the manual, after the last section and before the footer. It is not in the contents list — it is a record, not a section.

The block shows:
- The date ("Handover completed on 7 September 2026" / "Entrega completada el 7 de septiembre de 2026")
- The ticked items only — never the unticked ones (an unfinished list on a client's page reads as an accusation)
- "Confirmed with {name}" when `signoff_person` is present

When `signoff_at` is null, nothing renders at all.

Wording is carefully chosen: this is a record of what was handed over and when. It is not a waiver, a receipt, or a signature. No copy anywhere implies the client agreed to anything or signed anything.

The block includes `break-inside: avoid` via a `.signoff-block` class in the print stylesheet (`app/globals.css`) so it prints intact and is not split across pages.

### 3.8 Duplicate and Template Behavior

`duplicate-as-template` explicitly lists columns to insert and does not include any `signoff_*` fields — a new client's manual starts with an empty, unstamped sign-off. Templates likewise carry none of this data, as they write to separate template tables that have no sign-off columns.

### 3.9 Plan Availability

Sign-off is available on all plans including free. It is not gated by plan.

### 3.10 New Locale Keys

**English (en.json):**
- `edit.sections.signoff`: "Handover sign-off"
- `edit.signoffDescription`: Description of the feature (not a signature or waiver)
- `edit.signoff.domain` through `edit.signoff.files`: Six checkbox labels
- `edit.signoff.confirmedWith`: "Confirmed with"
- `edit.signoff.confirmedWithPlaceholder`: "Person who confirmed the handover"
- `edit.signoff.markComplete`: "Mark handover complete"
- `edit.signoff.undo`: "Undo"
- `edit.signoff.completed`: "Handover completed on {date}"
- `edit.signoff.tickCount`: "{count} of 6 items ticked"
- `edit.signoff.warned`: Credential warning for the person field
- `public.signoffTitle`: "Handover completed on {date}"
- `public.signoffConfirmedWith`: "Confirmed with {name}"
- `public.signoffItems.domain` through `public.signoffItems.files`: Six item labels for the public page

**Spanish (es.json):**
- All corresponding keys with natural Spanish wording, not literal translations
- The three manual states read Borrador / Activo / Archivado
- The sign-off title reads "Entrega completada el {date}" — a record, not a signature

### 3.11 What Was Not Changed

- `get_public_manual`, the publish gate, `enforce_manual_quota()`, `plan_manual_limit()`, `admin_*` functions, `is_admin()`, the signup trigger, `touch_parent_manual`, `manuals_set_updated_at`, `lib/slug.ts`, `lib/manual-shape.ts`, `lib/plans.ts`, `lib/secret-names.ts`, the template tables, `agency_scripts`, `data/*`, any existing RLS policy, and the demo manual `aurora-dental-4k2m9x` were not modified.
- `lib/completion.ts` was not modified — sign-off is excluded by design (it doesn't reference signoff fields).
- No new table was created.
- `signoff_person` has no secret-name CHECK constraint — it is free prose, screened warn-only in the UI.

### 3.12 Two UI Bug Fixes — Key Plugins and Accounts Numbering

The Key plugins editor preserves the raw text while the user types instead of deriving the displayed input value from the parsed array after every keystroke. This allows commas, spaces, and subsequent plugin names to be entered naturally in one pass. On blur, the existing parsing rule is applied unchanged: split on commas, trim each item, and filter out empty items. The resulting array continues through the existing manual save flow, and the input is reseeded from that parsed array using the canonical comma-and-space format.

The general input rule is: never bind an input's value to a round-tripped derivation of its own `onChange`. Keep raw text in local input state and parse it only at a boundary such as blur or save.

The debounced auto-save effect no longer re-seeds the plugins text after a successful save. That re-seed was keyed on the whole manual object, so editing any field started a 1.2-second countdown; if the user clicked into Key plugins and started typing inside that window, the timer would fire and overwrite the text they were actively typing — the same defect the local state was added to fix, in a narrower window. The line was redundant: the field's onBlur handler already parses and re-seeds the canonical string, and fetchData seeds it when the manual loads.

The public Accounts & ownership section is always present because the page intentionally renders its empty state and the note that passwords are never stored. It is therefore included in the contents list even when there are no account rows. Section numbering continues to use the same shared section list, so sections after Accounts & ownership shift to their correct numbers and the contents anchors remain aligned.

If a rendered section requests an ID missing from the section list, the page logs the missing ID with `console.error` and omits the number rather than silently rendering `0.`. The section's anchor, contents link, empty state, and existing behavior remain unchanged.

No migration, schema, grant, RLS policy, public-manual function, completion logic, locale key, anchor ID, print style, or account-row behavior was changed.

### 3.13 Three Client-Render Bug Fixes — Date Off-by-One, Add-Button Focus, Stale Plan Badge

**Date off-by-one:** `domain_expiry` and `host_renewal` are date-only columns storing `YYYY-MM-DD`. `new Date('2027-03-14')` parses that as UTC midnight, and `toLocaleDateString` then renders it in the reader's timezone — so anywhere behind UTC it prints the previous day. A new helper `lib/date.ts` exports `parseDateValue` and `formatDateValue`. `parseDateValue` special-cases the date-only shape: it splits on `-` and constructs the date in local time via `new Date(y, m - 1, d)`. Full timestamps like `updated_at` and `signoff_at` keep the normal `new Date(val)` parse so they render in the reader's timezone as before. Both copies of `fmtDate` (in `lib/defaults.ts` and `app/m/[slug]/page.tsx`) now delegate to `formatDateValue`. The locale, format options, and `toLocaleDateString` call are unchanged — the parse is the only fix. No new dependency was added.

**Add-button focus swallowing typed text:** Every "Add ..." button kept DOM focus after the click, and the new row's input was never focused. Because the space bar activates a focused button, clicking "Add included item" and typing a sentence with spaces created one blank row per space. A `pendingFocus` state and effect were added: each add handler sets a focus key for the row just created, and the effect queries `[data-focus-key="..."]` and focuses it. Matching `data-focus-key` attributes were placed on the first input of every row type: accounts (Service), edit blocks (Block name), coverage (both included and billed, using `realIdx` not the filtered map index), maintenance tasks (task input), and custom fields (label input in both the builtin-section and custom-section renderers).

**Stale plan badge after publish:** The app shell refetches the active manual count on pathname change and on a `manuals-changed` window event. Publishing, unpublishing, archiving, and restoring happened on the edit page with no navigation and never dispatched the event, so the header badge was stale. `window.dispatchEvent(new Event('manuals-changed'))` is now dispatched immediately after the optimistic `setManual` in `doPublish`, `handleUnpublish`, `handleArchive`, and `handleRestore`, matching what the manuals list page already does.

No migration, grant, RLS policy, RPC, plan quota, publish gate, secret-name constraint, font, asset, or pluginsText blur handling was changed. `app/admin/page.tsx` and `app/manuals/page.tsx` still use plain `new Date()` for `created_at` (a timestamp, not a date-only column) and were not routed through the new helper.

### 3.14 Password Reset Loop — Detection Gate Replaced

The password reset page (`app/reset-password/page.tsx`) had two forms gated on `hasRecoverySession`: the email-request form and the set-new-password form. The gate was wrong. It called `supabase.auth.getSession()` and then required `new URL(window.location.href).searchParams.get('type') === 'recovery'`. That was never true: the Supabase client in `lib/supabase.ts` uses the implicit flow, so Supabase returns the recovery result in the URL hash (`#access_token=…&type=recovery`), not the query string — and `detectSessionInUrl: true` consumes and strips that hash on module import, before this component mounts. Reading `window.location` from the component cannot work. The page always fell through to the email-request form, even after clicking a valid recovery link.

**Fix — primary detection:** The component's first effect now subscribes to `supabase.auth.onAuthStateChange` and sets `hasRecoverySession` to true when the event is `PASSWORD_RECOVERY`. The subscription is unsubscribed on unmount. The auth event is the reliable signal with the implicit flow.

**Fix — fallback:** The effect also calls `getSession()` and, if a session exists, shows the set-password form. This covers the case where the recovery event fired before the subscription existed, and the intended consequence that a signed-in user visiting `/reset-password` sees the change-password screen (the app has no other way to change a password).

**Fix — error state:** An expired or already-used link comes back as `#error=…&error_description=…`. The hash is captured once at module scope, at import time, before the Supabase client strips it. If it carries an error, the page renders a third state: a short message that the link has expired or has already been used, and a button to request a new one that returns the page to its normal request form.

**Locale keys added** to both `locales/en.json` and `locales/es.json` alongside the existing `reset.*` keys:
- `reset.expiredTitle`: "This link has expired" / "Este enlace ha expirado"
- `reset.expiredDescription`: "This password reset link is no longer valid." / "Este enlace de restablecimiento ya no es válido."
- `reset.expiredMessage`: "This link has expired or has already been used. Request a new one and we'll send a fresh link to your email." / "Este enlace ha expirado o ya fue usado. Solicita uno nuevo y te enviaremos un enlace fresco a tu correo."
- `reset.requestNewLink`: "Request a new link" / "Solicitar un nuevo enlace"

**Not changed:** `lib/supabase.ts` (flow type, `detectSessionInUrl`), the `redirectTo` in `handleRequest`, the existing `reset.*` keys, the `updateUser` call, the redirect to `/manuals` after a successful update, the login page, and anything outside `app/reset-password/page.tsx` and the two locale files. No migration, schema change, grant, or RLS policy was made.

This is the same family as the sectionNumber 0 bug: a state the page couldn't determine, defaulting silently to a plausible-looking wrong screen.

### 3.15 Login and Signup Session/Error Handling

The login page now branches correctly on the result of `supabase.auth.signUp`. When `data.session` is present, email confirmation is not required for that account: the page routes directly to `/manuals`, using the same post-auth route as sign-in so `lib/auth-context.tsx` can create or confirm the profile row on the established session. When `data.session` is null, the existing confirmation screen remains unchanged, including the Resend action and its 60-second client-side countdown. The page does not read an auth setting or environment variable to choose between these cases.

Sign-in and signup errors are now logged with `console.error` using the real Supabase error object before any user-facing message is shown. HTTP 429 and known rate-limit codes use a specific wait-a-few-minutes message. Duplicate signup errors use known Supabase duplicate-account codes first, with a message fallback only when no code is available; they show a neutral message that does not confirm whether the address exists and switch the page back to the Sign in tab. All other signup errors keep the existing neutral error message. The existing neutral sign-in message that the email and password do not match is unchanged for non-rate-limit sign-in errors.

Two locale keys were added to both locale files: `login.rateLimited` and `login.alreadyRegistered`. The agency name field, eight-character password hint, lack of a confirm-password field, Resend countdown, auth flow configuration, profile-row creation, reset-password page, and sign-in route behavior were not changed. No migration, SQL, schema, grant, or RLS policy was created or modified.

### 3.16 Admin-Only Account Deletion

The Admin page now has a destructive Delete action in its own table column, separate from the plan selector. It is available only through the existing admin page; there is still no navigation link to `/admin`, and the existing non-admin not-found behavior remains unchanged.

Clicking Delete opens a confirmation dialog that shows the account email, agency name, total manual count, and active manual count. It warns that active manuals will go permanently offline for that agency's clients. The permanent-delete button remains disabled until the operator types the account email exactly. The confirmation and result copy is localized in English and Spanish.

The server-enforced operation is `public.admin_delete_account(p_user_id uuid)`, introduced by migration `20260909_admin_delete_account`. It is `SECURITY DEFINER`, uses `SET search_path TO 'public'`, and checks `public.is_admin()` inside the function. It refuses to delete the current administrator, any account in `admin_users`, or the account that owns the protected demo manual `aurora-dental-4k2m9x`. It counts total and active manuals before deleting.

Deletion is explicit and ordered. The function deletes `accounts`, `assets`, `coverage`, `custom_fields`, `custom_sections`, `edit_blocks`, `maintenance_tasks`, and `manual_contacts` rows for the user's manuals, then deletes the manuals, user-owned `agency_scripts` and `manual_templates`, the profile row, and finally attempts `auth.users`. If auth deletion cannot complete after application data is removed, the result returns `auth_deleted: false`; the Admin page says plainly that the application data was removed but the login still exists. Successful results show the total and active counts that were deleted. RPC errors are logged with the real error and their message is shown to the administrator.

The function grants EXECUTE only to `authenticated` and revokes it from `anon` and `public`. No table policy, table grant, column-level grant, existing function, quota rule, publish gate, trigger, admin list, or demo data was changed. In particular, the existing profiles UPDATE privilege remains absent for `authenticated`, so the plan remains client-unwritable as documented in section 30.

Verification completed: a simulated non-admin call returned `not authorized`; an administrator deleting their own account returned `cannot delete yourself`; deleting the demo owner returned `cannot delete the demo account`; the demo manual remained published. A throwaway account with a published manual, account row, and maintenance row was deleted with `manuals_deleted: 1`, `active_deleted: 1`, and `auth_deleted: true`; every checked child table, manual, profile, and auth row returned zero, and the public lookup returned null. The deleted email successfully signed up again with a live session, then the recreated throwaway account was removed through the same RPC. Admin overview counts returned to 12 accounts, 11 manuals, and 8 active manuals.

### 3.17 Maintenance Preset Language Re-rendering

Maintenance preset rows now retain a stable `preset_key` alongside their displayed `task` text. The 21 rows in `data/maintenance-presets.json` use permanent snake_case keys, and `lib/maintenance-presets.ts` resolves a known key to English or Spanish text while returning null for an unknown key. Unknown keys always fall back to the stored task text, so removing a preset later cannot blank an existing manual.

The `20260909_maintenance_preset_key` migration adds nullable `preset_key` columns to `maintenance_tasks` and `template_maintenance_tasks`. It backfills only exact matches against the preset's English or Spanish text; manually edited rows remain null. During the manual backfill and locale correction, the `touch_manual_on_maintenance_change` trigger is disabled and re-enabled afterward so the public Last updated date is not rewritten. Existing `get_public_manual`, policies, grants, and public maintenance rendering remain unchanged; the existing `to_jsonb(mt)` output automatically includes the new column.

The manual editor stores the preset key when loading a standard schedule, stores null for blank added rows, clears the key as soon as the task text is edited, and persists it on save. When the confirmed manual language changes, only rows with a known non-null key are looked up in the new locale and updated in both the database and editor state. Agency-written rows are not touched. Template schedules use the same key behavior for standard schedules, new rows, edits, saves, and duplication.

When creating a manual from a template, the task text is resolved with the new manual's locale while the key is copied across. Duplicating a manual and saving a manual as a template copy both the key and the stored task text unchanged. The existing cadence order, sort order, owner display, add-row focus behavior, completion calculation, print styles, dialog wording, and all preset English, Spanish, cadence, and owner values remain unchanged.

Migration verification reported 84 of 84 `maintenance_tasks` rows with non-null `preset_key` and 21 of 21 `template_maintenance_tasks` rows with non-null `preset_key`; no rows stayed null. The migration corrected 21 `maintenance_tasks` task texts for the Spanish manual, and all 21 now match their Spanish preset text with no English preset text remaining. Browser verification was not available in this environment; type checking and the production build passed.
