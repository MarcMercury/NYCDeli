-- Migration 042: Audit fixes
-- 1. Lock down build_inventory RLS (was USING(true))
-- 2. Prevent circular tent-sharing references
-- 3. Add missing indexes on frequently queried columns

-- ═══════════════════════════════════════════════════════════════
-- 1. Fix build_inventory RLS — restrict to admin/builder for writes
-- ═══════════════════════════════════════════════════════════════

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Enable read for authenticated" ON build_inventory;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON build_inventory;
DROP POLICY IF EXISTS "Enable update for authenticated" ON build_inventory;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON build_inventory;

-- Read: any authenticated user
CREATE POLICY "build_inventory_select"
  ON build_inventory FOR SELECT
  TO authenticated
  USING (true);

-- Insert/Update/Delete: admin or builder only
CREATE POLICY "build_inventory_insert"
  ON build_inventory FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "build_inventory_update"
  ON build_inventory FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "build_inventory_delete"
  ON build_inventory FOR DELETE
  TO authenticated
  USING (get_my_role() IN ('admin', 'builder'));

-- ═══════════════════════════════════════════════════════════════
-- 2. Prevent circular tent-sharing self-reference
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE campers
  DROP CONSTRAINT IF EXISTS no_self_tent_sharing;

ALTER TABLE campers
  ADD CONSTRAINT no_self_tent_sharing
  CHECK (sharing_tent_with IS NULL OR id != sharing_tent_with);

-- ═══════════════════════════════════════════════════════════════
-- 3. Add missing indexes on frequently queried columns
-- ═══════════════════════════════════════════════════════════════

-- campers.email — used for auth lookups and CSV import matching
CREATE INDEX IF NOT EXISTS idx_campers_email ON campers (email);

-- system_settings.key — direct lookups by key
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings (key);

-- schedule_assignments.status — filtered by status frequently
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_status ON schedule_assignments (status);

-- camp_reservations unique primary per spot
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_per_spot
  ON camp_reservations (spot_id)
  WHERE is_primary = true AND status = 'reserved';

-- deli_ideas — prevent is_read/read_at contradiction
ALTER TABLE deli_ideas
  DROP CONSTRAINT IF EXISTS ideas_read_consistency;

ALTER TABLE deli_ideas
  ADD CONSTRAINT ideas_read_consistency
  CHECK (is_read = false OR read_at IS NOT NULL);
