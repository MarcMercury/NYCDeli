-- Add Size (W) and Size (L) columns to build_inventory
-- Update inventory categories: remove amenity_equip, add electrical, plumbing, furniture

-- =====================================================
-- ADD SIZE COLUMNS
-- =====================================================
ALTER TABLE build_inventory ADD COLUMN size_w TEXT;
ALTER TABLE build_inventory ADD COLUMN size_l TEXT;

-- =====================================================
-- UPDATE CATEGORIES ENUM
-- =====================================================

-- Create the new enum
CREATE TYPE inventory_category_v2 AS ENUM (
  'shade_structure',
  'tool',
  'large_equipment',
  'container',
  'kitchen_item',
  'av_equip',
  'electrical',
  'plumbing',
  'furniture',
  'other',
  'bm_utility'
);

-- Migrate column
ALTER TABLE build_inventory
  ALTER COLUMN category DROP DEFAULT;

ALTER TABLE build_inventory
  ALTER COLUMN category TYPE inventory_category_v2
  USING CASE category::text
    WHEN 'amenity_equip' THEN 'furniture'::inventory_category_v2
    ELSE category::text::inventory_category_v2
  END;

ALTER TABLE build_inventory
  ALTER COLUMN category SET DEFAULT 'other'::inventory_category_v2;

-- Swap types
DROP TYPE inventory_category;
ALTER TYPE inventory_category_v2 RENAME TO inventory_category;
