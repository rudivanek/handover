# PimpMyCopy Features Documentation

<!--
Version: 1.4.0
Last Updated: 2026-09-08T00:00:00Z
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

### 2.7 What Was Not Changed

- No database migrations, columns, policies, grants, triggers, or functions were modified.
- `is_published`, `archived_at`, `enforce_manual_quota()`, `plan_manual_limit()`, `admin_set_plan()`, the templates plan gate, and `get_public_manual` are untouched.
- The public manual page (`app/m/[slug]/page.tsx`) was not modified — none of this vocabulary appears on the client's page.
- JSON key names were preserved; only values changed.
- `edit.published` (the toast shown when clicking Publish) remains "Published" / "Publicado" — this is the action, not the state badge.
- `edit.notPublished` remains "Not published" / "No publicado" — this is the draft state label.
