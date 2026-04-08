-- Fix overly permissive RLS policies on tables that use USING (true) or WITH CHECK (true)
-- Replace with proper role-based checks using get_my_role() function

-- ============================================
-- floorplan_configs: restrict write to admin/builder
-- ============================================
DROP POLICY IF EXISTS "Anyone can view floorplan configs" ON floorplan_configs;
DROP POLICY IF EXISTS "Anyone can insert floorplan configs" ON floorplan_configs;
DROP POLICY IF EXISTS "Anyone can update floorplan configs" ON floorplan_configs;
DROP POLICY IF EXISTS "Anyone can delete floorplan configs" ON floorplan_configs;

CREATE POLICY "Authenticated users can view floorplan configs"
  ON floorplan_configs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and builders can insert floorplan configs"
  ON floorplan_configs FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins and builders can update floorplan configs"
  ON floorplan_configs FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin', 'builder'))
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins can delete floorplan configs"
  ON floorplan_configs FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================
-- floorplan_objects: restrict write to admin/builder
-- ============================================
DROP POLICY IF EXISTS "Anyone can view floorplan objects" ON floorplan_objects;
DROP POLICY IF EXISTS "Anyone can insert floorplan objects" ON floorplan_objects;
DROP POLICY IF EXISTS "Anyone can update floorplan objects" ON floorplan_objects;
DROP POLICY IF EXISTS "Anyone can delete floorplan objects" ON floorplan_objects;

CREATE POLICY "Authenticated users can view floorplan objects"
  ON floorplan_objects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and builders can insert floorplan objects"
  ON floorplan_objects FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins and builders can update floorplan objects"
  ON floorplan_objects FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin', 'builder'))
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins can delete floorplan objects"
  ON floorplan_objects FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================
-- floorplan_utility_lines: restrict write to admin/builder
-- ============================================
DROP POLICY IF EXISTS "Anyone can view utility lines" ON floorplan_utility_lines;
DROP POLICY IF EXISTS "Anyone can insert utility lines" ON floorplan_utility_lines;
DROP POLICY IF EXISTS "Anyone can update utility lines" ON floorplan_utility_lines;
DROP POLICY IF EXISTS "Anyone can delete utility lines" ON floorplan_utility_lines;

CREATE POLICY "Authenticated users can view utility lines"
  ON floorplan_utility_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and builders can insert utility lines"
  ON floorplan_utility_lines FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins and builders can update utility lines"
  ON floorplan_utility_lines FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin', 'builder'))
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins can delete utility lines"
  ON floorplan_utility_lines FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================
-- build_schedule_items: restrict write to admin/builder
-- ============================================
DROP POLICY IF EXISTS "Anyone can view build schedule" ON build_schedule_items;
DROP POLICY IF EXISTS "Authenticated users can insert build schedule" ON build_schedule_items;
DROP POLICY IF EXISTS "Authenticated users can update build schedule" ON build_schedule_items;
DROP POLICY IF EXISTS "Authenticated users can delete build schedule" ON build_schedule_items;

CREATE POLICY "Authenticated users can view build schedule"
  ON build_schedule_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and builders can insert build schedule"
  ON build_schedule_items FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins and builders can update build schedule"
  ON build_schedule_items FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin', 'builder'))
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins can delete build schedule"
  ON build_schedule_items FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================
-- electrical_load_config: restrict write to admin/builder
-- ============================================
DROP POLICY IF EXISTS "Anyone can view electrical config" ON electrical_load_config;
DROP POLICY IF EXISTS "Authenticated users can view electrical config" ON electrical_load_config;
DROP POLICY IF EXISTS "Authenticated users can insert electrical config" ON electrical_load_config;
DROP POLICY IF EXISTS "Authenticated users can update electrical config" ON electrical_load_config;
DROP POLICY IF EXISTS "Authenticated users can delete electrical config" ON electrical_load_config;

CREATE POLICY "Authenticated users can view electrical config"
  ON electrical_load_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and builders can insert electrical config"
  ON electrical_load_config FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins and builders can update electrical config"
  ON electrical_load_config FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin', 'builder'))
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins can delete electrical config"
  ON electrical_load_config FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================
-- electrical_distro_boxes: restrict write to admin/builder
-- ============================================
DROP POLICY IF EXISTS "Anyone can view distro boxes" ON electrical_distro_boxes;
DROP POLICY IF EXISTS "Authenticated users can view distro boxes" ON electrical_distro_boxes;
DROP POLICY IF EXISTS "Authenticated users can insert distro boxes" ON electrical_distro_boxes;
DROP POLICY IF EXISTS "Authenticated users can update distro boxes" ON electrical_distro_boxes;
DROP POLICY IF EXISTS "Authenticated users can delete distro boxes" ON electrical_distro_boxes;

CREATE POLICY "Authenticated users can view distro boxes"
  ON electrical_distro_boxes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and builders can insert distro boxes"
  ON electrical_distro_boxes FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins and builders can update distro boxes"
  ON electrical_distro_boxes FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin', 'builder'))
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins can delete distro boxes"
  ON electrical_distro_boxes FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================
-- electrical_load_items: restrict write to admin/builder
-- ============================================
DROP POLICY IF EXISTS "Anyone can view load items" ON electrical_load_items;
DROP POLICY IF EXISTS "Authenticated users can view load items" ON electrical_load_items;
DROP POLICY IF EXISTS "Authenticated users can insert load items" ON electrical_load_items;
DROP POLICY IF EXISTS "Authenticated users can update load items" ON electrical_load_items;
DROP POLICY IF EXISTS "Authenticated users can delete load items" ON electrical_load_items;

CREATE POLICY "Authenticated users can view load items"
  ON electrical_load_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and builders can insert load items"
  ON electrical_load_items FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins and builders can update load items"
  ON electrical_load_items FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin', 'builder'))
  WITH CHECK (get_my_role() IN ('admin', 'builder'));

CREATE POLICY "Admins can delete load items"
  ON electrical_load_items FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================
-- resource_edits: restrict write to admin
-- ============================================
DROP POLICY IF EXISTS "Admin full access resource edits" ON resource_edits;
DROP POLICY IF EXISTS "Anyone can view resource edits" ON resource_edits;
DROP POLICY IF EXISTS "Authenticated users can view resource edits" ON resource_edits;

CREATE POLICY "Authenticated users can view resource edits"
  ON resource_edits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert resource edits"
  ON resource_edits FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins can update resource edits"
  ON resource_edits FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins can delete resource edits"
  ON resource_edits FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');
