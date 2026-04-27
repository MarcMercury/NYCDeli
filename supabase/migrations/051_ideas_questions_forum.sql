-- Migration: Extend deli_ideas to support both Ideas and Questions
-- Adds a post_type discriminator + admin response fields so camp leads
-- can answer questions submitted by campers (no chat — single response per post).

ALTER TABLE deli_ideas
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'idea',
  ADD COLUMN IF NOT EXISTS admin_response TEXT,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES auth.users(id);

-- Constrain to known types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deli_ideas_post_type_check'
  ) THEN
    ALTER TABLE deli_ideas
      ADD CONSTRAINT deli_ideas_post_type_check
      CHECK (post_type IN ('idea', 'question'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deli_ideas_post_type ON deli_ideas (post_type);
CREATE INDEX IF NOT EXISTS idx_deli_ideas_responded ON deli_ideas (post_type, responded_at);
