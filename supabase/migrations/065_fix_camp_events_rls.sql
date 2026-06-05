-- Migration 065: Lock down camp_events RLS
--
-- Problem: Migration 004 created `FOR ALL USING (true) WITH CHECK (true)` with no
-- role restriction, so ANY request (including unauthenticated) could insert, edit,
-- or delete calendar events. This is the same anti-pattern that 012_fix_rls_policies
-- corrected for the other tables, but camp_events was missed.
--
-- Fix: approved users (user/admin) may read; only admins may write.
-- Uses the SECURITY DEFINER helper public.get_my_role() from migration 008.

DROP POLICY IF EXISTS "Allow all access to camp_events" ON camp_events;

-- Read: any approved user (user or admin)
CREATE POLICY "camp_events_select_approved"
  ON camp_events FOR SELECT
  USING (public.get_my_role() IN ('user', 'admin'));

-- Insert: admins only
CREATE POLICY "camp_events_insert_admin"
  ON camp_events FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

-- Update: admins only
CREATE POLICY "camp_events_update_admin"
  ON camp_events FOR UPDATE
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Delete: admins only
CREATE POLICY "camp_events_delete_admin"
  ON camp_events FOR DELETE
  USING (public.get_my_role() = 'admin');
