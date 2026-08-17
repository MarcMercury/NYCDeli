-- 081: Close read access for pending/anonymous users and restore builder reads.
--
-- Two problems fixed here:
--
-- 1. Pending (and in several cases fully anonymous) callers could read ops data
--    directly through PostgREST. The app redirects pending users to /pending,
--    but they still hold a valid session and the anon key is public, so the UI
--    redirect was the only thing stopping them. Policies below were `true` or
--    `auth.uid() IS NOT NULL`, neither of which looks at the role.
--
-- 2. `builder` was omitted from several *_select_approved policies, so the
--    builder role silently could not read kitchen/schedule/task data.
--
-- Unlike 035 and 042, every DROP here uses a policy name verified against
-- pg_policies on the live database.

-- Approved = anything past the pending gate. Denial sets role back to 'pending',
-- so denied accounts fail this too. Returns NULL for anon; coalesced to false.
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    public.get_my_role() = ANY (ARRAY['user', 'builder', 'admin']::user_role[]),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. Build task hierarchy — were readable by PUBLIC (no login at all)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read access" ON build_goals;
CREATE POLICY build_goals_select_approved ON build_goals
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS "Public read access" ON build_procedures;
CREATE POLICY build_procedures_select_approved ON build_procedures
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS "Public read access" ON build_questions;
CREATE POLICY build_questions_select_approved ON build_questions
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS "Public read access" ON build_resources;
CREATE POLICY build_resources_select_approved ON build_resources
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS "Public read access" ON build_stages;
CREATE POLICY build_stages_select_approved ON build_stages
  FOR SELECT USING (is_approved());

-- ---------------------------------------------------------------------------
-- 2. Inventory
-- ---------------------------------------------------------------------------

-- "Admin full access" was FOR ALL / TO PUBLIC / USING (true) despite its name:
-- an anonymous caller could INSERT/UPDATE/DELETE inventory. The real
-- admin/builder write policies (build_inventory_insert/update/delete) already
-- exist, so dropping this removes the hole without removing capability.
DROP POLICY IF EXISTS "Admin full access" ON build_inventory;
DROP POLICY IF EXISTS "Public read access" ON build_inventory;
DROP POLICY IF EXISTS build_inventory_select ON build_inventory;
CREATE POLICY build_inventory_select ON build_inventory
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS build_inventory_components_select ON build_inventory_components;
CREATE POLICY build_inventory_components_select ON build_inventory_components
  FOR SELECT USING (is_approved());

-- ---------------------------------------------------------------------------
-- 3. Build meetings
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS build_meetings_select ON build_meetings;
CREATE POLICY build_meetings_select ON build_meetings
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS build_meeting_sections_select ON build_meeting_sections;
CREATE POLICY build_meeting_sections_select ON build_meeting_sections
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS build_meeting_notes_select ON build_meeting_notes;
CREATE POLICY build_meeting_notes_select ON build_meeting_notes
  FOR SELECT USING (is_approved());

-- ---------------------------------------------------------------------------
-- 4. Build schedule — had one PUBLIC and one authenticated policy, both true
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can view build schedule" ON build_schedule_items;
DROP POLICY IF EXISTS build_schedule_items_select ON build_schedule_items;
CREATE POLICY build_schedule_items_select ON build_schedule_items
  FOR SELECT USING (is_approved());

-- ---------------------------------------------------------------------------
-- 5. Electrical
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can view electrical config" ON electrical_load_config;
DROP POLICY IF EXISTS electrical_load_config_select ON electrical_load_config;
CREATE POLICY electrical_load_config_select ON electrical_load_config
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS "Authenticated users can view load items" ON electrical_load_items;
DROP POLICY IF EXISTS electrical_load_items_select ON electrical_load_items;
CREATE POLICY electrical_load_items_select ON electrical_load_items
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS "Authenticated users can view distro boxes" ON electrical_distro_boxes;
DROP POLICY IF EXISTS electrical_distro_boxes_select ON electrical_distro_boxes;
CREATE POLICY electrical_distro_boxes_select ON electrical_distro_boxes
  FOR SELECT USING (is_approved());

-- ---------------------------------------------------------------------------
-- 6. Floorplan / camp map
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can view floorplan configs" ON floorplan_configs;
CREATE POLICY floorplan_configs_select ON floorplan_configs
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS "Authenticated users can view floorplan objects" ON floorplan_objects;
CREATE POLICY floorplan_objects_select ON floorplan_objects
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS "Authenticated users can view utility lines" ON floorplan_utility_lines;
CREATE POLICY floorplan_utility_lines_select ON floorplan_utility_lines
  FOR SELECT USING (is_approved());

-- ---------------------------------------------------------------------------
-- 7. Resource edits — resource_edits_public_read exposed these to anon
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can view resource edits" ON resource_edits;
DROP POLICY IF EXISTS resource_edits_public_read ON resource_edits;
CREATE POLICY resource_edits_select ON resource_edits
  FOR SELECT USING (is_approved());

-- ---------------------------------------------------------------------------
-- 8. Shift draft — were gated on `auth.uid() IS NOT NULL` / true
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS shift_drafts_select ON shift_drafts;
CREATE POLICY shift_drafts_select ON shift_drafts
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS shift_draft_order_select ON shift_draft_order;
CREATE POLICY shift_draft_order_select ON shift_draft_order
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS assignments_select ON shift_draft_assignments;
CREATE POLICY shift_draft_assignments_select ON shift_draft_assignments
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS shift_offerings_select ON shift_offerings;
CREATE POLICY shift_offerings_select ON shift_offerings
  FOR SELECT USING (is_approved());

-- ---------------------------------------------------------------------------
-- 9. Restore builder reads — these policies listed only user + admin
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS build_tasks_select_approved ON build_tasks;
CREATE POLICY build_tasks_select_approved ON build_tasks
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS camp_events_select_approved ON camp_events;
CREATE POLICY camp_events_select_approved ON camp_events
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS kitchen_roles_select_approved ON kitchen_roles;
CREATE POLICY kitchen_roles_select_approved ON kitchen_roles
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS kitchen_shifts_select_approved ON kitchen_shifts;
CREATE POLICY kitchen_shifts_select_approved ON kitchen_shifts
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS schedule_assignments_select_approved ON schedule_assignments;
CREATE POLICY schedule_assignments_select_approved ON schedule_assignments
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS checklist_templates_select_approved ON checklist_templates;
CREATE POLICY checklist_templates_select_approved ON checklist_templates
  FOR SELECT USING (is_approved());

-- system_settings keeps its public read policy on purpose: the proxy reads
-- maintenance_mode with an unauthenticated client on every request.
