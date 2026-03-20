-- NYCDeliRats2026 Auth, User Profiles & Camper Photos
-- Migration 007: Authentication system, approval workflow, photo uploads

-- =====================================================
-- USER ROLES ENUM
-- =====================================================
CREATE TYPE user_role AS ENUM ('pending', 'user', 'admin');

-- =====================================================
-- USER PROFILES TABLE
-- Links Supabase Auth users to the camp system
-- =====================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'pending',
  camper_id UUID REFERENCES campers(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  denied_at TIMESTAMPTZ,
  denied_reason TEXT,
  bio TEXT,
  CONSTRAINT valid_approval CHECK (
    (approved_at IS NULL AND approved_by IS NULL) OR
    (approved_at IS NOT NULL AND approved_by IS NOT NULL)
  )
);

-- =====================================================
-- CAMPER PHOTOS TABLE
-- Up to 3 photos per camper, stored in Supabase Storage
-- =====================================================
CREATE TABLE camper_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  display_order INTEGER NOT NULL CHECK (display_order >= 1 AND display_order <= 3),
  CONSTRAINT unique_photo_order UNIQUE (user_id, display_order)
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_camper ON user_profiles(camper_id);
CREATE INDEX idx_camper_photos_user ON camper_photos(user_id);

-- =====================================================
-- Row Level Security
-- =====================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE camper_photos ENABLE ROW LEVEL SECURITY;

-- User profiles: users can read their own, admins can read/write all
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Approved users can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('user', 'admin')
    )
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

CREATE POLICY "Auth trigger can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Camper photos: users can manage own, approved users can view all
CREATE POLICY "Users can manage own photos"
  ON camper_photos FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Approved users can view all photos"
  ON camper_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('user', 'admin')
    )
  );

-- =====================================================
-- Function: Auto-create profile on signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'pending');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Function: Link camper record on approval
-- When a user is approved and their email matches a camper,
-- auto-link them
-- =====================================================
CREATE OR REPLACE FUNCTION public.link_camper_on_approval()
RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'user' AND OLD.role = 'pending' AND NEW.camper_id IS NULL THEN
    UPDATE user_profiles
    SET camper_id = (
      SELECT id FROM campers WHERE email = NEW.email LIMIT 1
    )
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_approved
  AFTER UPDATE OF role ON user_profiles
  FOR EACH ROW
  WHEN (NEW.role = 'user' AND OLD.role = 'pending')
  EXECUTE FUNCTION public.link_camper_on_approval();

-- =====================================================
-- Storage bucket for camper photos
-- (Run in Supabase dashboard or via API)
-- =====================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('camper-photos', 'camper-photos', true);
