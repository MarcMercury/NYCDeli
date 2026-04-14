-- Migration 045: Add second tent sharing slot
-- Allows up to 3 people per tent: primary + sharing_tent_with + sharing_tent_with_2

ALTER TABLE campers
  ADD COLUMN IF NOT EXISTS sharing_tent_with_2 UUID REFERENCES campers(id) ON DELETE SET NULL;
