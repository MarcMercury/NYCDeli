-- Migration 008: Fix RLS infinite recursion on user_profiles
-- The original policies on user_profiles referenced user_profiles in subqueries,
-- causing infinite recursion (500 errors from PostgREST).
-- Fix: Use a SECURITY DEFINER function to bypass RLS when checking the current user's role.

-- =====================================================
-- Helper function: get current user's role (bypasses RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- Drop old recursive policies
-- =====================================================
DROP POLICY IF EXISTS "Approved users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Approved users can view all photos" ON camper_photos;

-- =====================================================
-- Recreate policies using the helper function
-- =====================================================

-- user_profiles: approved/admin users can view all profiles
CREATE POLICY "Approved users can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    public.get_my_role() IN ('user', 'admin')
  );

-- user_profiles: users can update their own profile (but not change their role)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_my_role()
  );

-- user_profiles: admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
  );

-- camper_photos: approved users can view all photos
CREATE POLICY "Approved users can view all photos"
  ON camper_photos FOR SELECT
  USING (
    public.get_my_role() IN ('user', 'admin')
  );
