-- Migration 038: Layout ↔ Inventory/Electrical/Schedule Interconnectivity
--
-- Adds floorplan_object_id linking columns to build_inventory, build_resources,
-- electrical_load_items, build_schedule_items, and build_goals so that every
-- item placed on the camp layout map can be traced through inventory,
-- electrical load, and build schedule systems.
--
-- Also links build_schedule_items → build_goals and build_stages for
-- full task hierarchy connectivity.

-- ============================================================
-- 1. Link build_inventory ↔ floorplan_objects
-- ============================================================
ALTER TABLE build_inventory
  ADD COLUMN IF NOT EXISTS floorplan_object_id UUID REFERENCES floorplan_objects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_build_inventory_floorplan_obj
  ON build_inventory(floorplan_object_id) WHERE floorplan_object_id IS NOT NULL;

-- ============================================================
-- 2. Link build_resources ↔ floorplan_objects
-- ============================================================
ALTER TABLE build_resources
  ADD COLUMN IF NOT EXISTS floorplan_object_id UUID REFERENCES floorplan_objects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_build_resources_floorplan_obj
  ON build_resources(floorplan_object_id) WHERE floorplan_object_id IS NOT NULL;

-- ============================================================
-- 3. Link electrical_load_items ↔ floorplan_objects
-- ============================================================
ALTER TABLE electrical_load_items
  ADD COLUMN IF NOT EXISTS floorplan_object_id UUID REFERENCES floorplan_objects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_electrical_load_items_floorplan_obj
  ON electrical_load_items(floorplan_object_id) WHERE floorplan_object_id IS NOT NULL;

-- ============================================================
-- 4. Link build_schedule_items ↔ floorplan_objects, goals, and stages
-- ============================================================
ALTER TABLE build_schedule_items
  ADD COLUMN IF NOT EXISTS floorplan_object_id UUID REFERENCES floorplan_objects(id) ON DELETE SET NULL;

ALTER TABLE build_schedule_items
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES build_goals(id) ON DELETE SET NULL;

ALTER TABLE build_schedule_items
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES build_stages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_build_schedule_items_floorplan_obj
  ON build_schedule_items(floorplan_object_id) WHERE floorplan_object_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_build_schedule_items_goal
  ON build_schedule_items(goal_id) WHERE goal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_build_schedule_items_stage
  ON build_schedule_items(stage_id) WHERE stage_id IS NOT NULL;

-- ============================================================
-- 5. Link build_goals ↔ floorplan_objects
-- ============================================================
ALTER TABLE build_goals
  ADD COLUMN IF NOT EXISTS floorplan_object_id UUID REFERENCES floorplan_objects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_build_goals_floorplan_obj
  ON build_goals(floorplan_object_id) WHERE floorplan_object_id IS NOT NULL;
