# PimpMyCopy Features Documentation

<!--
Version: 1.5.0
Last Updated: 2026-09-11T00:00:00Z
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

### 3.18 Language Control Labels

The two language controls now identify what they change. The navigation language dropdown keeps its compact globe and EN/ES trigger, but adds an accessible label and hover title using `nav.interfaceLanguage`. Its opened menu starts with a non-interactive localized header, “Interface language” / “Idioma de la interfaz”, above the existing English and Español choices. The existing locale-change handler and profile UI locale behavior are unchanged.

The manual editor’s locale selector now shows the existing `edit.manualLanguage` label between its globe icon and EN/ES buttons on screens at least the small breakpoint. The label is hidden on narrower screens so the toolbar continues to fit, while the globe and buttons remain visible. The bordered control has the same localized label as its ARIA name for screen readers. This control continues to change `manuals.locale`, preserve the confirmation dialog, and leave editor field labels controlled by the interface language.

Both locale files now contain the matching key `nav.interfaceLanguage`: “Interface language” in English and “Idioma de la interfaz” in Spanish. No existing locale values were changed, and no database object, migration, grant, RLS policy, public-manual function, or maintenance preset behavior was modified. Locale key parity was verified with 543 identical keys. Type checking was not rerun for this label-only change; the production build passed after one transient filesystem retry. Browser verification was not available in this environment.

### 3.19 Domain Ownership and Registrar Access

The Domain & DNS editor now separates registered domain ownership from registrar-account access. `domain_owner` keeps its existing text column and accepts the tokens `@client`, `@agency`, `@third_party`, and `@unknown`, while any other value remains legacy or agency-written free text. A new nullable `manuals.registrar_access` column accepts `@client`, `@agency`, `@both`, and `@unknown`, or free text. Empty registrar access remains valid and optional.

The domain-owner editor uses a five-option selector: Client owns it, Agency owns it on the client's behalf, A third party owns it, Not confirmed, and Other…. Existing free text automatically appears as Other… with its exact text in the revealed noun-phrase input. Choosing a known option replaces the free text only when explicitly selected. The registrar-access editor uses the same pattern and includes The client's team, The agency, Both, Not confirmed, and Other…. Both values are autosaved, and duplicated manuals carry both values forward.

Published manuals render known tokens through localized defaults, including agency-name interpolation and the existing incomplete-token suppression rule. Legacy or new free text is rendered verbatim in its own paragraph and is never inserted into an application sentence. A domain-owner note appears after any rendered ownership value, while registrar access appears only when it has a value. The domain table displays localized option labels for known tokens, literal text for free text, and an em dash for empty values; it now includes a Registrar access row beneath Domain owner. English and Spanish contain matching keys for all new labels and options.

The migration added `registrar_access` without any data update, so existing manual timestamps and values remain unchanged. It re-issued the authenticated UPDATE column grant with the current allowlist plus `registrar_access`; the live catalogue includes that new column and still excludes protected columns including `slug` and `updated_at`. No RLS policy, public-manual function, completion field, hideable field, or maintenance-preset behavior was changed. Type checking and JSON validation passed; browser verification was not available in this environment.

### 3.20 DNS Handover Paths and Records

The Domain & DNS section remains one section with its existing number and contents-list entry, but it now documents the real handover choices instead of assuming every project changes nameservers. The editor adds four nullable/manual fields: `dns_managed_at` accepts `@registrar`, `@host`, `@cloudflare`, or free text; `dns_access` accepts `@client`, `@agency`, `@both`, `@unknown`, or free text; `dns_change` accepts only `@nameservers`, `@records`, or `@none`; and `mail_elsewhere` remains NULL until answered, then stores an explicit true or false. These four fields are deliberately excluded from `FIELD_KEYS` and completion calculation, so existing completion percentages and hideable-field behavior do not change.

Nameservers keep the existing single comma-separated `manuals.nameservers` column. The editor presents one input per trimmed value, supports adding and removing rows, joins non-empty values with `, ` on change, and focuses each newly created row. The published manual splits the same stored value into a readable list. When DNS changed through records, the editor stores A, AAAA, CNAME, MX, and TXT rows in the owner-scoped `dns_records` table; the records table is omitted from the published manual when empty. Stored nameservers and records remain visible even when the dropdown is unanswered or later contradicts them, so entered data cannot disappear because of a display choice.

The published Domain & DNS section prints localized sentences for known DNS-management, DNS-access, and handover-change tokens, and prints free-text answers verbatim as their own paragraphs. A true `mail_elsewhere` value shows the existing amber warning treatment used for the accounts note, explicitly warning that changing nameservers can move mail settings and interrupt email. The domain table keeps the existing rows and adds localized DNS managed-at, DNS access, and what-changed rows with an em dash when unanswered. A separate Type / Name / Value records table appears only when records exist. English and Spanish copy includes the specified DNS paths, option labels, editor guidance, warning, and record labels.

The migration added the four manuals columns without any data update, created `dns_records` with its record-type CHECK constraint, owner-scoped authenticated CRUD policies, authenticated grants, an explicit anonymous revoke, a `manual_id` index, and the existing `touch_parent_manual()` trigger. It re-issued the authenticated manuals UPDATE column grant with the four new columns while keeping protected columns including `slug`, `updated_at`, `id`, `user_id`, `created_at`, `published_at`, `hidden_fields`, and `hidden_sections` absent. `get_public_manual` was amended to add `dns_records` while retaining `maintenance_tasks`, `custom_sections`, `custom_fields`, `assets`, `coverage`, `edit_blocks`, `accounts`, `show_footer`, and `heading_font_key`; the manual contacts data remains private. Duplicate-as-template copies the four manual values and DNS record rows, while templates remain unchanged.

JSON validation and locale parity passed with 585 identical keys, TypeScript type checking passed, and the production build passed with the single-worker setting after one temporary filesystem resource error. Live verification confirmed the manuals UPDATE catalogue includes the four new DNS columns while `slug` and `updated_at` remain absent, anonymous `dns_records` privileges are empty, and `get_public_manual` retains all nine required keys while adding `dns_records`. Browser verification was not available in this environment.

The two Selects previously showed **Other…** for any unanswered field because an empty value is not a token and fell through to the `@other` branch. This was a display-only defect: the column stayed empty and the published page correctly printed nothing, but the form falsely implied the agency had chosen Other. The fix passes `undefined` as the Select value when the stored value is empty after trimming, so Radix shows the localized placeholder **Select…** / **Selecciona…** instead. The free-text input beneath each Select now appears only when the agency has actually chosen Other — either by selecting it from the dropdown (tracked via local state) or because the stored value is non-empty free text. An empty field shows the Select alone with nothing beneath it. A new locale key `common.selectPlaceholder` was added to both files. No migration, SQL, grant, RLS policy, stored value, public page, completion field, or other Select in the app was changed. Locale key parity was verified at 556 keys; the production build passed. Browser verification was not available in this environment.

### 3.21 Nameserver Block Copy

The published Domain & DNS section now keeps the nameserver explanation structurally separate from the nameserver list. The old `nameservers` default, which embedded `{nameservers}` in the middle of a sentence, was replaced with `nameservers_intro` and `nameservers_note` in English and Spanish. The intro renders only when at least one stored nameserver exists, followed by the existing comma-split, trimmed, filtered list and then the note as its own paragraph. This removes the orphaned full stop that appeared before “Nameservers tell…” when a block list was inserted into the sentence.

The nameserver column, comma-separated storage, editor repeater, split/join behavior, domain table list, interpolation helpers, empty-token suppression, all other Domain & DNS copy, locale files, database objects, grants, RLS policies, and `get_public_manual` were not changed. With no nameservers, the intro, list, and note all remain absent. The new English and Spanish defaults preserve the reviewed wording. Type checking and the production build passed; browser verification was not available in this environment.

### 3.22 Dropdown Clear Option and Nav Plan Badge Flash

The five Domain & DNS Select controls — `domain_owner`, `registrar_access`, `dns_managed_at`, `dns_access`, and `dns_change` — previously had no way back to blank once answered. A **Clear — not answered yet** / **Borrar — sin responder** option was added at the bottom of each Select, separated from the real options by a `SelectSeparator`. Selecting it writes an empty string to the column, so the field returns to showing the localized placeholder and behaves exactly as a never-answered field: no sentence on the published page, an em dash in the table. For the four fields with an Other free-text box, clearing also closes the box via the same local state the placeholder fix added. The sentinel value `@clear` never reaches the database and is not in any token list, so nothing else needs to know about it. Two locale keys were added: `common.clearSelection` in both English and Spanish. No token values, `lib/domain-ownership.ts`, the published page, `data/defaults.json`, completion, or placeholder behaviour were changed.

The navigation plan badge in `components/app-shell.tsx` previously flashed **Free · 1/1** for a paying agency while the profile was loading, because `profile?.plan || 'free'` defaulted to `free` before the profile arrived. The `profileLoaded` flag from `useAuth()` is now destructured and `renderPlanIndicator()` returns null until it is true, alongside the existing `liveCount === null` guard. The account-menu label likewise shows nothing rather than the raw email address until the profile has loaded. Rendering nothing for a moment is correct; rendering a wrong plan is not. `lib/auth-context.tsx`, the plan values, `PLAN_LABELS`, `PLAN_LIMITS`, the live-count fetch, the `manuals-changed` listener, the amber at-limit styling, and the language and account dropdowns themselves were not changed.

No migration, SQL, grant, RLS policy, or `get_public_manual` change was made. Locale key parity was verified at 586 identical keys. Type checking and the production build passed. Browser verification was not available in this environment.

### 3.23 Studio Plan Tier ($39/month, 10 active manuals)

The app now supports a fourth plan tier, **Studio**, sitting between Freelancer and Agency. The marketing site already sold it; the database and app did not recognize it.

**Database migration — 20260909_add_studio_plan:**

- `profiles_plan_check` widened from `('free','freelancer','agency')` to `('free','freelancer','studio','agency')`. No UPDATE was issued on any row — existing accounts keep their current plan.
- `plan_manual_limit(p_plan text)` amended to add `when 'studio' then 10` between the freelancer and agency branches. The function remains `language sql immutable` with the `else 1` fallback preserved unchanged.
- `admin_set_plan(p_user_id uuid, p_plan text)` amended to add `'studio'` to the valid-plan guard. The `is_admin()` check remains the first statement, and the `SECURITY DEFINER` attribute and `SET search_path TO 'public'` are preserved.
- `enforce_manual_quota()` and its trigger were not touched — they read the limit through `plan_manual_limit()`, so widening that function is the whole change.
- The `profiles` column-level UPDATE grant was NOT re-issued. `plan` remains absent from the UPDATE privilege list — that omission is the paywall. Confirmed post-migration: `authenticated` has UPDATE on 13 columns (agency_name, agency_website, body_font_key, brand_color, custom_font_name, custom_font_url, emergency_phone, heading_font_key, logo_storage_path, logo_url, support_email, support_hours, ui_locale) — `plan` is not among them.

**Frontend changes:**

- `lib/plans.ts`: `PLAN_LIMITS` now includes `studio: 10` between freelancer and agency. `PLAN_LABELS` includes `studio: { en: 'Studio', es: 'Studio' }` in the same position.
- `app/admin/page.tsx`: The private copy of `PLAN_LIMITS` includes `studio: 10`. A `<SelectItem value="studio">Studio</SelectItem>` was added between Freelancer and Agency in the plan selector.
- `app/settings/page.tsx`: The unexpected-plan guard now includes `'studio'` so it is treated as a known plan. A `studio` branch was added that mirrors the `freelancer` branch exactly: green check, `t('settings.studioPlan')`, the `usageLimited` line with count and limit, the upgrade button when `NEXT_PUBLIC_STRIPE_LINK` is set, and `settings.subscriptionNote`.

**Locale keys:**

- `settings.studioPlan` added to both files: "Studio — 10 active manuals at a time, no Handover branding." / "Studio — 10 manuales activos a la vez, sin marca de Handover."
- `settings.upgradePrice` replaced in both files to name all three paid tiers: "Freelancer $19/month for 3 active manuals. Studio $39/month for 10. Agency $79/month for unlimited. Billed monthly. Drafts and archived manuals are unlimited on every plan." / "Freelancer $19/mes para 3 manuales activos. Studio $39/mes para 10. Agency $79/mes para ilimitados. Facturación mensual. Los borradores y los manuales archivados son ilimitados en todos los planes."

**What was NOT changed:**

- `enforce_manual_quota()`, its trigger, the publish gate, `get_public_manual`, archiving, and `updated_at`.
- `is_admin()`, `admin_users`, `admin_overview()`, or the `SECURITY DEFINER` gate on `admin_set_plan()`.
- The free-plan footer rule: `show_footer` is `plan = 'free'` in `get_public_manual` and needs no change — Studio removes it exactly as Freelancer and Agency do.
- The templates paid-feature gate in `app/templates/page.tsx` (`plan === 'free'` → blocked). Studio is not free, so it gets templates automatically.
- Domain & DNS, maintenance presets, language controls, or anything outside the plan system.

Locale key parity was verified at 587 identical keys. Type checking and the production build passed. Browser verification was not available in this environment — the database-enforced quota limit (10 active manuals) and the admin plan selector should be confirmed visually as a signed-in user.

### 3.24 Plan-Limit Dialog Fixes (Studio Tier Exposure)

Four defects in the plan-limit dialog, exposed by the new Studio tier, were fixed. The dialog appears when publishing is refused by the database quota — the refusal itself is unchanged and still comes from Postgres.

**1 — Plan name shows the label, not the raw key.** Both `app/manuals/page.tsx` and `app/manuals/[id]/edit/page.tsx` passed `planLimitInfo.plan` (the raw database value like "studio") into `planLimit.body`. They now pass `PLAN_LABELS[planLimitInfo.plan]?.[locale] || planLimitInfo.plan`, using the same `PLAN_LABELS` from `lib/plans.ts` that the nav badge and Settings card already use. The `planLimit.body` string in both locale files is unchanged — `{plan}` stays a token; only what is passed into it changes.

**2 — Upgrade button shows the correct next tier.** Both files used a two-branch ternary: `free` → `planLimit.upgradeFree`, everything else → `planLimit.upgradeFreelancer`. A Freelancer hitting 3 was pushed straight to $79 Agency, skipping the $39 Studio tier. Replaced with an explicit next-step map: `free` → `upgradeFree` (3 for $19), `freelancer` → `upgradeStudio` (10 for $39, new key), `studio` → `upgradeAgency` (unlimited for $79, new key), anything else → `upgradeAgency`. The existing `planLimit.upgradeFreelancer` key is left in both locale files so nothing referencing it breaks silently. `agency` is unlimited and can never reach this dialog — the fallback covers it.

**3 — Upgrade link points to a working page.** Both files linked to `https://handover.agency/pricing`, which 404s — pricing is the `#pricing` section of the homepage. Changed both to `https://handover.agency/#pricing`.

**4 — Manuals-list count uses the shared limit constant.** `app/manuals/page.tsx` line 79 had a third hand-maintained copy of the plan limits: `plan === 'free' ? 1 : plan === 'freelancer' ? 3 : null`. On Studio this yielded `null`, so the header read "N active manuals" instead of "N of 10 active manuals" and the amber over-limit styling never fired. Replaced with `PLAN_LIMITS[plan] ?? null` from `lib/plans.ts`. The file now imports `PLAN_LIMITS` and `PLAN_LABELS` from `lib/plans.ts`; the edit page imports `PLAN_LABELS`.

Two locale keys were added to each file: `planLimit.upgradeStudio` and `planLimit.upgradeAgency`. The existing `planLimit.upgradeFree` and `planLimit.upgradeFreelancer` keys are unchanged. No database migration, SQL, grant, RLS policy, `enforce_manual_quota()`, `plan_manual_limit()`, `profiles_plan_check`, `planLimit.title`, `planLimit.body`, `planLimit.archive`, the archive flow, the `PLAN_LIMIT` error detection, Domain & DNS, or language controls were changed. Locale key parity was verified at 589 identical keys. Type checking and the production build passed. Browser verification was not available in this environment.

### 3.25 Public Manual Page — Mobile Readability

The public manual page (`/m/[slug]`) was made comfortable to read on phones below 640px wide. At 640px and wider, and in print, the page is unchanged. No migration, database change, `get_public_manual` change, or new dependency was made.

**Mobile CSS block** added to the end of `app/globals.css`, scoped to `@media screen and (max-width: 639px)` so print is never affected. Tables with the `m-stack` class collapse to stacked full-width blocks: every `td` becomes `display: block`, `thead` is hidden, `caption` stays visible, and each `tr` gets padding. Cells with a `data-label` attribute show that label as a small muted caption above the value. The `m-kv` class makes the first `td` of label/value tables smaller and muted. The `m-title` class bolds the primary cell of a stacked row (service name, task name).

**Table classes** added in `app/m/[slug]/page.tsx`:
- Site & Stack, Domain & DNS facts, Hosting & Email, and all custom-field tables (custom sections, and the custom-field tables under Accounts, Coverage, Maintenance, Emergency) get `m-stack m-kv`.
- Files & assets table gets `m-stack` only (first cell stays bold, not muted).
- Accounts table gets `m-stack`. The Service cell gets `m-title`. The Owner cell gets `data-label` with the localized owner label. The Admin email cell gets `data-label` with the localized admin email label, and becomes a `mailto:` link when the value contains `@`.
- Maintenance tables (one per cadence) get `m-stack`. The Task cell gets `m-title`. The Who cell gets `data-label`. The Notes cell, only rendered when notes exist, gets `data-label`.
- DNS records table gets `m-stack`. All three cells get `data-label` with the localized type/name/value labels.

**Text sizes** increased on phones: every table from `text-xs` to `text-sm`, every body paragraph and list item from `text-sm` to `text-base`, edit-block body text and coverage list items from `text-xs` to `text-sm`. The `sm:` classes are all preserved. Heading sizes, the small uppercase labels in the emergency card, and the amber note boxes were left alone. Side padding on the page wrapper and both sticky top bars went from `px-3` to `px-4`.

**Tappable contacts**: the emergency phone is now a `tel:` link, the emergency email, support email, and each account admin email are `mailto:` links (only when the value contains `@`), and the site URL is a link that adds `https://` when the scheme is missing (only when the value has no spaces). All links inherit colour and add `underline underline-offset-2` so they print the same as plain text.

**Contents**: the contents `div` gets `id="contents"` and `scroll-mt-20`. Contents links get `inline-block py-1.5 sm:py-0` for ~40px tap targets on phones. The sticky top bar gets a "Contents" button (outline, `asChild` wrapping an `<a href="#contents">`) before the PDF button, wrapped with the PDF button in a `flex shrink-0 gap-2` div. The button only appears when the contents list is rendered (`sectionList.length >= 4`).

No section order, section numbering, `sectionList`, `renderInterpolated`, `interpolate()`, suppression rules, `get_public_manual`, migration, grant, RLS, the `/m/` path, agency branding, Handover footer, editor, manuals list, localStorage, service worker, or manifest were changed. The existing `@media print` block in `globals.css` is untouched. Type checking and the production build passed. Browser verification was not available in this environment — the stacked tables, tappable contacts, enlarged text, and the Contents button should be confirmed visually on a 375px-wide viewport, and the print layout should be confirmed unchanged at 1024px and in Save as PDF.
