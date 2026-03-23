-- Add missing floorplan object types to the enum
-- These types exist in the UI (object-templates.ts) but were never added to the database enum,
-- causing bike_parking, swamp_cooler, refrigerated_truck, greywater_tank, table,
-- shower_container, and sink_hose objects to silently fail on save.

ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'refrigerated_truck';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'bike_parking';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'greywater_tank';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'swamp_cooler';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'table';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'shower_container';
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'sink_hose';
