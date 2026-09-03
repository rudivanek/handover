-- Inter was removed from the agency font picklist (now Handover's own typeface is IBM Plex Sans).
-- Migrate any profiles still using the 'inter' slug to 'source-sans' so their manuals don't fall back to system.
UPDATE profiles
SET heading_font_key = 'source-sans'
WHERE heading_font_key = 'inter';

UPDATE profiles
SET body_font_key = 'source-sans'
WHERE body_font_key = 'inter';
