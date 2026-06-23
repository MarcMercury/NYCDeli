-- Migration 066: Add tent sharing slots 3, 4, and 5
-- Allows up to 6 people per shelter: primary + sharing_tent_with + sharing_tent_with_2..5
-- Needed to accommodate RV groups (e.g. the Shai Olsher RV: 6 people in one RV).

ALTER TABLE campers
  ADD COLUMN IF NOT EXISTS sharing_tent_with_3 UUID REFERENCES campers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sharing_tent_with_4 UUID REFERENCES campers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sharing_tent_with_5 UUID REFERENCES campers(id) ON DELETE SET NULL;
