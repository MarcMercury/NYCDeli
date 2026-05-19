-- Migration 062: Inventory Components + Utility Line Enrichment + Reverse Links
--
-- 1. build_inventory_components — granular sub-items down to lag-bolt level.
-- 2. floorplan_utility_lines — add length, gauge/rating, source/target object FKs,
--    notes; turns drawn power/water lines into real requirement drivers.
-- 3. Reverse links across electrical_load_items, build_inventory,
--    build_schedule_items so the four systems are fully bidirectional.

-- ============================================================
-- 1. build_inventory_components (sub-items)
-- ============================================================
CREATE TABLE IF NOT EXISTS build_inventory_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_inventory_id uuid NOT NULL REFERENCES build_inventory(id) ON DELETE CASCADE,
  name text NOT NULL,
  qty_per_parent numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'each',
  category text,                 -- optional: hardware, fastener, wire, fitting, fabric, lumber, fuel, consumable, other
  size text,                     -- e.g. "1/2\" x 4\"", "12/3 SOOW"
  description text,
  notes text,
  have_qty numeric NOT NULL DEFAULT 0,    -- actual on hand
  needed_qty numeric NOT NULL DEFAULT 0,  -- total needed (qty_per_parent * parent.quantity_expected, recomputed)
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_components_parent
  ON build_inventory_components(parent_inventory_id);

ALTER TABLE build_inventory_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "build_inventory_components_select"
  ON build_inventory_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "build_inventory_components_insert"
  ON build_inventory_components FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "build_inventory_components_update"
  ON build_inventory_components FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "build_inventory_components_delete"
  ON build_inventory_components FOR DELETE TO authenticated USING (true);

-- Auto-recompute needed_qty when parent quantity_expected changes
CREATE OR REPLACE FUNCTION recompute_component_needed_qty()
RETURNS TRIGGER AS $$
BEGIN
  NEW.needed_qty := COALESCE(NEW.qty_per_parent, 0)
    * COALESCE((SELECT quantity_expected FROM build_inventory WHERE id = NEW.parent_inventory_id), 1);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recompute_component_needed_qty
  ON build_inventory_components;
CREATE TRIGGER trg_recompute_component_needed_qty
  BEFORE INSERT OR UPDATE OF qty_per_parent, parent_inventory_id
  ON build_inventory_components
  FOR EACH ROW EXECUTE FUNCTION recompute_component_needed_qty();

-- When parent quantity_expected changes, propagate to all children
CREATE OR REPLACE FUNCTION propagate_parent_qty_to_components()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_expected IS DISTINCT FROM OLD.quantity_expected THEN
    UPDATE build_inventory_components
       SET needed_qty = qty_per_parent * NEW.quantity_expected,
           updated_at = now()
     WHERE parent_inventory_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_propagate_parent_qty
  ON build_inventory;
CREATE TRIGGER trg_propagate_parent_qty
  AFTER UPDATE OF quantity_expected ON build_inventory
  FOR EACH ROW EXECUTE FUNCTION propagate_parent_qty_to_components();

-- ============================================================
-- 2. floorplan_utility_lines enrichment
-- ============================================================
ALTER TABLE floorplan_utility_lines
  ADD COLUMN IF NOT EXISTS length_ft numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wire_gauge text,           -- power: '10/3', '12/3', '6/3' | water: '3/4"', '1"'
  ADD COLUMN IF NOT EXISTS amp_rating numeric,        -- power lines only
  ADD COLUMN IF NOT EXISTS source_object_id uuid
    REFERENCES floorplan_objects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_object_id uuid
    REFERENCES floorplan_objects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_utility_lines_source
  ON floorplan_utility_lines(source_object_id);
CREATE INDEX IF NOT EXISTS idx_utility_lines_target
  ON floorplan_utility_lines(target_object_id);

-- ============================================================
-- 3. Reverse links
-- ============================================================

-- electrical_load_items can be driven by a drawn utility line and/or an inventory row
ALTER TABLE electrical_load_items
  ADD COLUMN IF NOT EXISTS utility_line_id uuid
    REFERENCES floorplan_utility_lines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inventory_id uuid
    REFERENCES build_inventory(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_electrical_load_items_utility_line
  ON electrical_load_items(utility_line_id) WHERE utility_line_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_electrical_load_items_inventory
  ON electrical_load_items(inventory_id) WHERE inventory_id IS NOT NULL;

-- build_inventory can back-link to an electrical_load_items row
ALTER TABLE build_inventory
  ADD COLUMN IF NOT EXISTS electrical_load_item_id uuid
    REFERENCES electrical_load_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS utility_line_id uuid
    REFERENCES floorplan_utility_lines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_build_inventory_electrical
  ON build_inventory(electrical_load_item_id) WHERE electrical_load_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_build_inventory_utility_line
  ON build_inventory(utility_line_id) WHERE utility_line_id IS NOT NULL;

-- build_schedule_items can derive from a utility line, inventory row, or electrical row
ALTER TABLE build_schedule_items
  ADD COLUMN IF NOT EXISTS utility_line_id uuid
    REFERENCES floorplan_utility_lines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inventory_id uuid
    REFERENCES build_inventory(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS electrical_load_item_id uuid
    REFERENCES electrical_load_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS depends_on uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_build_schedule_items_utility_line
  ON build_schedule_items(utility_line_id) WHERE utility_line_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_build_schedule_items_inventory
  ON build_schedule_items(inventory_id) WHERE inventory_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_build_schedule_items_electrical
  ON build_schedule_items(electrical_load_item_id) WHERE electrical_load_item_id IS NOT NULL;
