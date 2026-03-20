-- Migration 009: Create camper-photos storage bucket and policies
-- The bucket creation was commented out in migration 007; this migration
-- creates it and sets up the necessary storage RLS policies.

-- =====================================================
-- Create the storage bucket (idempotent)
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('camper-photos', 'camper-photos', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage RLS Policies for camper-photos bucket
-- =====================================================

-- Allow authenticated users to upload their own photos
-- Files are stored as {user_id}/{order}.{ext}
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'camper-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update (upsert) their own photos
CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'camper-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'camper-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anyone to read photos (bucket is public)
CREATE POLICY "Anyone can view camper photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'camper-photos');
