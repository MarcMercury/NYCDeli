-- Migration 058: Add 'builder' role to SELECT policies on directory tables
--
-- Migration 032 added the 'builder' role but the SELECT RLS policies on
-- user_profiles, campers, and camper_photos still only allow ('user', 'admin').
-- As a result, users with role='builder' could only see their own profile
-- (via the self-fallback policy) and no campers at all on /campers.

-- user_profiles: allow builder to see all approved profiles
DROP POLICY IF EXISTS "Approved users can view all profiles" ON user_profiles;
CREATE POLICY "Approved users can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    public.get_my_role() IN ('user', 'admin', 'builder')
  );

-- campers: allow builder to read all campers, and let any approved user
-- read their own camper row as a safety fallback.
DROP POLICY IF EXISTS "campers_select_approved" ON campers;
CREATE POLICY "campers_select_approved"
  ON campers FOR SELECT
  USING (
    public.get_my_role() IN ('user', 'admin', 'builder')
  );

-- camper_photos: allow builder to view all photos
DROP POLICY IF EXISTS "Approved users can view all photos" ON camper_photos;
CREATE POLICY "Approved users can view all photos"
  ON camper_photos FOR SELECT
  USING (
    public.get_my_role() IN ('user', 'admin', 'builder')
  );
