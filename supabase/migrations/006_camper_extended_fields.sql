-- Add missing columns to campers table
-- These fields are collected by the intake form but were not in the original schema

-- Safety & Medical
ALTER TABLE campers ADD COLUMN emergency_contact TEXT;
ALTER TABLE campers ADD COLUMN medical_conditions TEXT;
ALTER TABLE campers ADD COLUMN medications TEXT;
ALTER TABLE campers ADD COLUMN allergies TEXT;
ALTER TABLE campers ADD COLUMN dietary_restrictions TEXT;

-- About You
ALTER TABLE campers ADD COLUMN burn_count TEXT;
ALTER TABLE campers ADD COLUMN what_attracted_you TEXT;
ALTER TABLE campers ADD COLUMN referral_source TEXT;
ALTER TABLE campers ADD COLUMN character_references TEXT;
ALTER TABLE campers ADD COLUMN first_burn_hopes TEXT;

-- Agreements
ALTER TABLE campers ADD COLUMN volunteer_commitment BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE campers ADD COLUMN sober_shifts BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE campers ADD COLUMN background_check_consent BOOLEAN NOT NULL DEFAULT false;
