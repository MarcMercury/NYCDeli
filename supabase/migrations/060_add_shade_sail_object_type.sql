-- Add 'shade_sail' to the floorplan_object_type enum.
-- Shade sail = adjustable rectangular shade covering with no posts.
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'shade_sail';
