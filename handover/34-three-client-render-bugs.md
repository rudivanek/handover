# Three Client-Render Bug Fixes

## 1. Date off-by-one

`domain_expiry` and `host_renewal` are date-only columns storing `YYYY-MM-DD`. `new Date('2027-03-14')` parses that as UTC midnight, and `toLocaleDateString` renders it in the reader's timezone — so anywhere behind UTC it prints the previous day.

A new helper `lib/date.ts` exports `parseDateValue` and `formatDateValue`. `parseDateValue` special-cases the date-only shape: it splits on `-` and constructs the date in local time via `new Date(y, m - 1, d)`. Full timestamps (`updated_at`, `signoff_at`) keep the normal `new Date(val)` parse so they render in the reader's timezone as before.

Both copies of `fmtDate` — in `lib/defaults.ts` and `app/m/[slug]/page.tsx` — now delegate to `formatDateValue`. The locale, format options, and `toLocaleDateString` call are unchanged. The parse is the only fix. No new dependency was added.

`app/admin/page.tsx` and `app/manuals/page.tsx` format `created_at`, a timestamp. They keep the plain `new Date()` and were not routed through the new helper.

## 2. Add-button focus swallowing typed text

Every "Add ..." button kept DOM focus after the click, and the new row's input was never focused. Because the space bar activates a focused button, clicking "Add included item" and typing a sentence with spaces created one blank row per space — same on every Add button.

A `pendingFocus` state and effect were added to the edit page. Each add handler sets a focus key for the row just created; the effect queries `[data-focus-key="..."]` and focuses it on the next render.

Focus keys and matching `data-focus-key` attributes:

| Row type | Focus key | Input |
|---|---|---|
| Accounts | `account-${idx}` | Service input |
| Edit blocks | `editblock-${idx}` | Block name input |
| Coverage (both lists) | `coverage-${realIdx}` | Item input |
| Maintenance tasks | `task-${task.id}` | Task input |
| Custom fields (builtin + custom) | `cf-${field.id}` | Label input |

Coverage uses `realIdx` (the index into the full coverage array), not the filtered map index — two lists render out of one array, and the filtered index points at the wrong row.

## 3. Stale plan badge after publish

The app shell refetches the active manual count on pathname change and on a `manuals-changed` window event. Publishing, unpublishing, archiving, and restoring happened on the edit page with no navigation and never dispatched the event, so the header badge was stale. That stale count also feeds the plan-limit warning.

`window.dispatchEvent(new Event('manuals-changed'))` is now dispatched immediately after the optimistic `setManual` in `doPublish`, `handleUnpublish`, `handleArchive`, and `handleRestore`, matching what `app/manuals/page.tsx` already does.

## What was not changed

No migration, grant, RLS policy, RPC, plan quota, publish gate, secret-name constraint, font, asset, or pluginsText blur handling was changed. The `/m/` URL prefix, section anchor ids, locale keys, print styles, and `get_public_manual` are untouched.
