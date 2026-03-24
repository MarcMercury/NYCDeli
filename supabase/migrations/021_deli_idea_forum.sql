-- Migration: Deli Idea Forum
-- A place for campers to submit ideas/input for camp, and admins to review them

CREATE TABLE IF NOT EXISTS deli_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_deli_ideas_user ON deli_ideas (user_id);
CREATE INDEX idx_deli_ideas_category ON deli_ideas (category);
CREATE INDEX idx_deli_ideas_is_read ON deli_ideas (is_read);
CREATE INDEX idx_deli_ideas_created ON deli_ideas (created_at DESC);

-- Enable RLS
ALTER TABLE deli_ideas ENABLE ROW LEVEL SECURITY;

-- Users can read their own ideas
CREATE POLICY "Users can view own ideas"
  ON deli_ideas FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own ideas
CREATE POLICY "Users can submit ideas"
  ON deli_ideas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all ideas
CREATE POLICY "Admins can view all ideas"
  ON deli_ideas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can update ideas (mark as read)
CREATE POLICY "Admins can update ideas"
  ON deli_ideas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_deli_ideas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deli_ideas_updated_at
  BEFORE UPDATE ON deli_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_deli_ideas_updated_at();
