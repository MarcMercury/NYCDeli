-- Migration 041: Allow users to update their own camper record
--
-- Migration 012 replaced the old permissive "Own record update" policy with
-- "campers_update_admin" (admin-only), which broke profile self-editing for
-- regular users.  This adds a companion policy so authenticated users can
-- update their own camper row (linked via user_profiles.camper_id).
--
-- Uses a SECURITY DEFINER helper to avoid RLS recursion on user_profiles.

-- =====================================================
-- Helper function: get current user's linked camper_id
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_my_camper_id()
RETURNS UUID AS $$
  SELECT camper_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- Policy: users can UPDATE their own camper record
-- =====================================================
CREATE POLICY "campers_update_own"
  ON campers FOR UPDATE
  USING (
    id = public.get_my_camper_id()
  )
  WITH CHECK (
    id = public.get_my_camper_id()
  );
