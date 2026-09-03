/*
# Add ui_locale to profiles and locale to manuals

1. New Columns
- `profiles.ui_locale` text NOT NULL DEFAULT 'en' — per-user UI language.
- `manuals.locale` text NOT NULL DEFAULT 'en' — per-manual language, independent of UI.

2. Security
- Both columns are user-editable. ui_locale is editable by the profile owner
  (existing profiles RLS already covers this). locale is editable by the
  manual owner (existing manuals RLS already covers this).
- No new RLS policies needed — existing policies already allow owners to
  UPDATE their own rows, and public SELECT already reads all columns.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ui_locale text NOT NULL DEFAULT 'en';
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

-- Backfill existing manuals to 'en' (column default handles new rows)
UPDATE manuals SET locale = 'en' WHERE locale IS NULL;
