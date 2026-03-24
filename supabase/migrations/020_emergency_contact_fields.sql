-- Migration: Split emergency_contact into separate name, number, relationship fields
-- The original emergency_contact column is preserved for backward compatibility

ALTER TABLE campers
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_number TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;

-- Backfill from existing emergency_contact where possible
-- (existing data is freeform text like "Mom, 212-555-5555" so we copy it to name as a fallback)
UPDATE campers
SET emergency_contact_name = emergency_contact
WHERE emergency_contact IS NOT NULL
  AND emergency_contact_name IS NULL;
