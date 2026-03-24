-- Migration: Create archived_applicants table for storing denied applicants
-- that admins want to remove so they can reapply with the same email.

CREATE TABLE archived_applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_by UUID,
  original_user_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  playa_name TEXT,
  denied_at TIMESTAMPTZ,
  denied_reason TEXT,
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  camper_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE archived_applicants ENABLE ROW LEVEL SECURITY;

-- Only admins can access archived applicants
CREATE POLICY "admins_manage_archived_applicants" ON archived_applicants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Index on email for lookups
CREATE INDEX idx_archived_applicants_email ON archived_applicants(email);
