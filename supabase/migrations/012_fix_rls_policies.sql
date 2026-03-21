-- Migration 012: Replace permissive RLS policies with proper auth-based policies
-- CRITICAL: Previous policies used USING (true) which effectively disabled RLS.
-- This migration replaces all policies with proper auth-based checks.
--
-- Requires: get_my_role() function from migration 008.

-- =====================================================
-- Drop all old permissive policies
-- =====================================================

-- campers table
DROP POLICY IF EXISTS "Public read" ON campers;
DROP POLICY IF EXISTS "Own record update" ON campers;
DROP POLICY IF EXISTS "Allow intake insert" ON campers;
DROP POLICY IF EXISTS "Admin full access campers" ON campers;

-- kitchen_roles table
DROP POLICY IF EXISTS "Public read" ON kitchen_roles;
DROP POLICY IF EXISTS "Admin full access roles" ON kitchen_roles;

-- kitchen_shifts table
DROP POLICY IF EXISTS "Public read" ON kitchen_shifts;
DROP POLICY IF EXISTS "Admin full access shifts" ON kitchen_shifts;

-- schedule_assignments table
DROP POLICY IF EXISTS "Public read" ON schedule_assignments;
DROP POLICY IF EXISTS "Admin full access assignments" ON schedule_assignments;

-- build_tasks table
DROP POLICY IF EXISTS "Public read" ON build_tasks;
DROP POLICY IF EXISTS "Admin full access tasks" ON build_tasks;

-- checklist_templates table
DROP POLICY IF EXISTS "Public read" ON checklist_templates;
DROP POLICY IF EXISTS "Admin full access templates" ON checklist_templates;

-- camper_checklists table
DROP POLICY IF EXISTS "Own checklist read" ON camper_checklists;
DROP POLICY IF EXISTS "Own checklist write" ON camper_checklists;

-- system_settings table
DROP POLICY IF EXISTS "Public read" ON system_settings;
DROP POLICY IF EXISTS "Admin full access settings" ON system_settings;


-- =====================================================
-- CAMPERS TABLE POLICIES
-- =====================================================

-- Anyone can INSERT a camper record (intake form — no auth yet)
CREATE POLICY "campers_insert_intake"
  ON campers FOR INSERT
  WITH CHECK (true);

-- Approved users and admins can read all campers
CREATE POLICY "campers_select_approved"
  ON campers FOR SELECT
  USING (
    public.get_my_role() IN ('user', 'admin')
  );

-- Admins can update any camper
CREATE POLICY "campers_update_admin"
  ON campers FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
  );

-- Admins can delete campers
CREATE POLICY "campers_delete_admin"
  ON campers FOR DELETE
  USING (
    public.get_my_role() = 'admin'
  );


-- =====================================================
-- KITCHEN ROLES TABLE POLICIES
-- =====================================================

-- Approved users can view kitchen roles
CREATE POLICY "kitchen_roles_select_approved"
  ON kitchen_roles FOR SELECT
  USING (
    public.get_my_role() IN ('user', 'admin')
  );

-- Only admins can modify kitchen roles
CREATE POLICY "kitchen_roles_modify_admin"
  ON kitchen_roles FOR ALL
  USING (
    public.get_my_role() = 'admin'
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
  );


-- =====================================================
-- KITCHEN SHIFTS TABLE POLICIES
-- =====================================================

-- Approved users can view shifts
CREATE POLICY "kitchen_shifts_select_approved"
  ON kitchen_shifts FOR SELECT
  USING (
    public.get_my_role() IN ('user', 'admin')
  );

-- Only admins can modify shifts
CREATE POLICY "kitchen_shifts_modify_admin"
  ON kitchen_shifts FOR ALL
  USING (
    public.get_my_role() = 'admin'
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
  );


-- =====================================================
-- SCHEDULE ASSIGNMENTS TABLE POLICIES
-- =====================================================

-- Approved users can view assignments
CREATE POLICY "schedule_assignments_select_approved"
  ON schedule_assignments FOR SELECT
  USING (
    public.get_my_role() IN ('user', 'admin')
  );

-- Only admins can modify assignments
CREATE POLICY "schedule_assignments_modify_admin"
  ON schedule_assignments FOR ALL
  USING (
    public.get_my_role() = 'admin'
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
  );


-- =====================================================
-- BUILD TASKS TABLE POLICIES
-- =====================================================

-- Approved users can view tasks
CREATE POLICY "build_tasks_select_approved"
  ON build_tasks FOR SELECT
  USING (
    public.get_my_role() IN ('user', 'admin')
  );

-- Only admins can modify tasks
CREATE POLICY "build_tasks_modify_admin"
  ON build_tasks FOR ALL
  USING (
    public.get_my_role() = 'admin'
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
  );


-- =====================================================
-- CHECKLIST TEMPLATES TABLE POLICIES
-- =====================================================

-- Approved users can view templates
CREATE POLICY "checklist_templates_select_approved"
  ON checklist_templates FOR SELECT
  USING (
    public.get_my_role() IN ('user', 'admin')
  );

-- Only admins can modify templates
CREATE POLICY "checklist_templates_modify_admin"
  ON checklist_templates FOR ALL
  USING (
    public.get_my_role() = 'admin'
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
  );


-- =====================================================
-- CAMPER CHECKLISTS TABLE POLICIES
-- =====================================================

-- Users can read their own checklists; admins can read all
CREATE POLICY "camper_checklists_select"
  ON camper_checklists FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    OR camper_id IN (
      SELECT up.camper_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

-- Users can update their own checklists
CREATE POLICY "camper_checklists_update_own"
  ON camper_checklists FOR UPDATE
  USING (
    camper_id IN (
      SELECT up.camper_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

-- Admins can do anything on checklists
CREATE POLICY "camper_checklists_admin"
  ON camper_checklists FOR ALL
  USING (
    public.get_my_role() = 'admin'
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
  );


-- =====================================================
-- SYSTEM SETTINGS TABLE POLICIES
-- =====================================================

-- Approved users can read settings
CREATE POLICY "system_settings_select_approved"
  ON system_settings FOR SELECT
  USING (
    public.get_my_role() IN ('user', 'admin')
  );

-- Only admins can modify settings
CREATE POLICY "system_settings_modify_admin"
  ON system_settings FOR ALL
  USING (
    public.get_my_role() = 'admin'
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
  );
