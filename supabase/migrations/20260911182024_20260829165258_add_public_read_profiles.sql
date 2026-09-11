DROP POLICY IF EXISTS "public_read_profiles" ON profiles;
CREATE POLICY "public_read_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM manuals WHERE manuals.user_id = profiles.user_id)
  );