/*
# Public read on profiles for branded manual pages

1. Purpose
   The public /m/[slug] page renders a manual in the agency's branding.
   It needs to read the owning agency's profile (logo, brand color, agency
   name, support contact info). This migration adds a SELECT policy that
   allows anon + authenticated users to read a profile ONLY IF that profile
   belongs to a user who owns at least one manual. This keeps the data
   exposed to the minimum needed for the public manual page.

2. Security
   - New SELECT policy "public_read_profiles" on profiles, scoped TO anon,
     authenticated, with a USING predicate that requires an existing manual
     for that profile's user_id.
   - No write policies change — profiles remain owner-scoped for writes.
*/

DROP POLICY IF EXISTS "public_read_profiles" ON profiles;
CREATE POLICY "public_read_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.user_id = profiles.user_id)
  );
