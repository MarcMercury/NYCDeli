-- Add direct link from camp_spots to floorplan_objects
ALTER TABLE camp_spots
  ADD COLUMN IF NOT EXISTS floorplan_object_id UUID;
