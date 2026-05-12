-- Migration 057: Case-insensitive camper linking + backfill
--
-- Problem: user_profiles.camper_id was set by exact email match in the
-- link_camper_on_approval() trigger. Auth emails are normalized to lowercase
-- but camper rows imported from the registration CSV often have mixed-case
-- emails, so the join silently produced NULL and users saw
-- "No registration record linked" on /profile.
--
-- Fix:
--   1. Rewrite link_camper_on_approval() to compare with LOWER() on both sides.
--   2. Backfill: link any approved user_profiles row (camper_id IS NULL)
--      whose email matches a camper by case-insensitive comparison.

CREATE OR REPLACE FUNCTION public.link_camper_on_approval()
RETURNS trigger AS $$
BEGIN
  IF NEW.role IN ('user', 'admin', 'builder')
     AND (OLD.role = 'pending' OR NEW.camper_id IS NULL)
     AND NEW.camper_id IS NULL THEN
    UPDATE user_profiles
    SET camper_id = (
      SELECT id FROM campers
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
      LIMIT 1
    )
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing approved users with no linked camper
UPDATE user_profiles up
SET camper_id = c.id
FROM campers c
WHERE up.camper_id IS NULL
  AND up.role <> 'pending'
  AND LOWER(TRIM(up.email)) = LOWER(TRIM(c.email));
