ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ui_locale text NOT NULL DEFAULT 'en';
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

UPDATE manuals SET locale = 'en' WHERE locale IS NULL;