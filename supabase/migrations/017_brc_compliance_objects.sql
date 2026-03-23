-- BRC Camp Layout Compliance: new object types, frontage, and metadata
-- Adds object types required for Burning Man camp layout submissions

-- New object types for BRC compliance
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'fire_lane';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'road';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'path_of_travel';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'fuel_storage';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'propane_storage';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'flame_effect';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'fire_extinguisher';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'vehicle';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'rv';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'pc_container';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'trash_receptacle';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'sign';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'distance_marker';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'neighbor_zone';

-- Add frontage and metadata columns to floorplan_configs
ALTER TABLE floorplan_configs
  ADD COLUMN IF NOT EXISTS frontage_sides JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS camp_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS playa_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS layout_version INTEGER NOT NULL DEFAULT 1;
