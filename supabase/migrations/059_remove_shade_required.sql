-- Remove shade_required column from campers.
-- The entire camp is shaded, so this field is no longer meaningful.

ALTER TABLE campers DROP COLUMN IF EXISTS shade_required;
