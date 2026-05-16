-- Add 'stairs_ladder' to the floorplan_object_type enum.
-- Represents an airplane-style rolling stair / ladder structure
-- with customizable width, depth (footprint), and elevation (platform height).
ALTER TYPE floorplan_object_type ADD VALUE IF NOT EXISTS 'stairs_ladder';
