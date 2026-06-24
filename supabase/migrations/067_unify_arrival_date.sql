-- =====================================================
-- 067: Unify arrival date into a single source of truth
-- =====================================================
-- The app previously stored two arrival dates per camper:
--   * arrival_date            (general / burn arrival)
--   * build_week_arrival_date (build-week-specific arrival)
-- The Builder List read from build_week_arrival_date while the camper
-- profile read from arrival_date, so the two views disagreed.
--
-- Going forward `arrival_date` is the single source of truth everywhere
-- (profile, builder list, campers directory, admin). For builders, their
-- arrival_date IS their build-week arrival, so we backfill it from the
-- old column before retiring it.
-- =====================================================

-- 1. Drop the constraint and index that reference the old column.
ALTER TABLE campers DROP CONSTRAINT IF EXISTS valid_build_week;
DROP INDEX IF EXISTS idx_campers_build_week;

-- 2. Backfill: a builder's single arrival_date becomes their build-week
--    arrival. Guard against violating the valid_dates check
--    (departure_date >= arrival_date).
UPDATE campers
SET arrival_date = build_week_arrival_date
WHERE build_week_attending = true
  AND build_week_arrival_date IS NOT NULL
  AND build_week_arrival_date <= departure_date;

-- 3. Retire the old column.
ALTER TABLE campers DROP COLUMN IF EXISTS build_week_arrival_date;

-- 4. Recreate the build-week index against the unified arrival_date.
CREATE INDEX idx_campers_build_week ON campers(build_week_attending, arrival_date);
