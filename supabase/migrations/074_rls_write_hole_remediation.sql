-- =====================================================
-- Migration 074: RLS write-hole remediation (no capability regression)
-- =====================================================
-- Earlier "fix" migrations (035, 042, 062) added role-gated policies but
-- their DROP POLICY statements referenced the WRONG policy names, so the
-- original permissive `USING(true)/WITH CHECK(true)` write policies were
-- never removed. Because Postgres OR's permissive policies together, the
-- open (true) policy still wins — any authenticated user (and, for a few
-- tables, even anonymous/PUBLIC) can INSERT/UPDATE/DELETE.
--
-- This migration removes the leftover permissive WRITE policies, matching
-- the ACTUAL live policy names (verified via pg_policies).
--
-- Capability-preserving design:
--   • NO read (SELECT) policy is tightened — every user keeps the exact
--     same visibility they have today.
--   • Write access is restricted only to the roles/users who already
--     perform those writes in the app:
--       - build_* / electrical / inventory / camp_spots / resource_edits
--         → written only by admin/builder UIs  → gate to admin/builder
--         (resource_edits writes stay admin-only, as today).
--       - camp_reservations → written client-side by regular campers
--         reserving/releasing spots → stays writable by ANY authenticated
--         user; only anonymous/PUBLIC write access is removed. An explicit
--         DELETE policy is added so "release spot" keeps working.
-- =====================================================

-- ── build_schedule_items: drop leftover permissive writes ──
DROP POLICY IF EXISTS "build_schedule_items_insert" ON build_schedule_items;
DROP POLICY IF EXISTS "build_schedule_items_update" ON build_schedule_items;
DROP POLICY IF EXISTS "build_schedule_items_delete" ON build_schedule_items;

-- ── electrical_load_items: drop leftover permissive writes ──
DROP POLICY IF EXISTS "electrical_load_items_insert" ON electrical_load_items;
DROP POLICY IF EXISTS "electrical_load_items_update" ON electrical_load_items;
DROP POLICY IF EXISTS "electrical_load_items_delete" ON electrical_load_items;

-- ── resource_edits: drop the PUBLIC "FOR ALL USING(true)" hole ──
-- Admin-only insert/update/delete policies already exist and remain.
DROP POLICY IF EXISTS "Admin full access on resource edits" ON resource_edits;
-- Preserve current read behavior (resources overlay is world-readable today).
DROP POLICY IF EXISTS "resource_edits_public_read" ON resource_edits;
CREATE POLICY "resource_edits_public_read" ON resource_edits
  FOR SELECT USING (true);

-- ── build planning tables: replace PUBLIC "Admin full access" (FOR ALL true)
--    with admin/builder writes; keep the existing public read. ──
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['build_stages','build_goals','build_resources','build_procedures','build_questions']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admin full access" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_admin_builder_insert" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_admin_builder_update" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_admin_builder_delete" ON %I;', t, t);
    EXECUTE format($f$CREATE POLICY "%s_admin_builder_insert" ON %I
      FOR INSERT TO authenticated
      WITH CHECK (get_my_role() IN ('admin','builder'));$f$, t, t);
    EXECUTE format($f$CREATE POLICY "%s_admin_builder_update" ON %I
      FOR UPDATE TO authenticated
      USING (get_my_role() IN ('admin','builder'))
      WITH CHECK (get_my_role() IN ('admin','builder'));$f$, t, t);
    EXECUTE format($f$CREATE POLICY "%s_admin_builder_delete" ON %I
      FOR DELETE TO authenticated
      USING (get_my_role() IN ('admin','builder'));$f$, t, t);
  END LOOP;
END $$;

-- ── build_inventory_components: drop permissive writes, add admin/builder ──
DROP POLICY IF EXISTS "build_inventory_components_insert" ON build_inventory_components;
DROP POLICY IF EXISTS "build_inventory_components_update" ON build_inventory_components;
DROP POLICY IF EXISTS "build_inventory_components_delete" ON build_inventory_components;
CREATE POLICY "build_inventory_components_insert" ON build_inventory_components
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin','builder'));
CREATE POLICY "build_inventory_components_update" ON build_inventory_components
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('admin','builder'))
  WITH CHECK (get_my_role() IN ('admin','builder'));
CREATE POLICY "build_inventory_components_delete" ON build_inventory_components
  FOR DELETE TO authenticated
  USING (get_my_role() IN ('admin','builder'));

-- ── camp_spots: only the admin layout editor writes these ──
DROP POLICY IF EXISTS "Admin full access spots" ON camp_spots;
DROP POLICY IF EXISTS "camp_spots_admin_builder_insert" ON camp_spots;
DROP POLICY IF EXISTS "camp_spots_admin_builder_update" ON camp_spots;
DROP POLICY IF EXISTS "camp_spots_admin_builder_delete" ON camp_spots;
CREATE POLICY "camp_spots_admin_builder_insert" ON camp_spots
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin','builder'));
CREATE POLICY "camp_spots_admin_builder_update" ON camp_spots
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('admin','builder'))
  WITH CHECK (get_my_role() IN ('admin','builder'));
CREATE POLICY "camp_spots_admin_builder_delete" ON camp_spots
  FOR DELETE TO authenticated
  USING (get_my_role() IN ('admin','builder'));

-- ── camp_reservations: campers reserve their own spots client-side.
--    Keep writable by ANY authenticated user; remove anon/PUBLIC access.
--    Explicit DELETE policy added so releasing a spot still works. ──
DROP POLICY IF EXISTS "Admin full access reservations" ON camp_reservations;
DROP POLICY IF EXISTS "Allow reservation insert" ON camp_reservations;
DROP POLICY IF EXISTS "Allow reservation update" ON camp_reservations;
DROP POLICY IF EXISTS "camp_reservations_auth_insert" ON camp_reservations;
DROP POLICY IF EXISTS "camp_reservations_auth_update" ON camp_reservations;
DROP POLICY IF EXISTS "camp_reservations_auth_delete" ON camp_reservations;
CREATE POLICY "camp_reservations_auth_insert" ON camp_reservations
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "camp_reservations_auth_update" ON camp_reservations
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "camp_reservations_auth_delete" ON camp_reservations
  FOR DELETE TO authenticated
  USING (true);

-- =====================================================
-- Performance: add missing indexes on frequently-queried FKs
-- (purely additive — no behavior change)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_camper_photos_user_id
  ON camper_photos (user_id);
CREATE INDEX IF NOT EXISTS idx_packing_list_items_camper_id
  ON packing_list_items (camper_id);
