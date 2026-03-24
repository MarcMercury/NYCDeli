-- Update inventory categories to match camp-specific terminology
-- New categories: shade_structure, tool, large_equipment, container,
--                 kitchen_item, av_equip, amenity_equip, other, bm_utility

-- Step 1: Create the new enum type
CREATE TYPE inventory_category_new AS ENUM (
  'shade_structure',
  'tool',
  'large_equipment',
  'container',
  'kitchen_item',
  'av_equip',
  'amenity_equip',
  'other',
  'bm_utility'
);

-- Step 2: Migrate existing column to new enum, mapping old values
ALTER TABLE build_inventory
  ALTER COLUMN category DROP DEFAULT;

ALTER TABLE build_inventory
  ALTER COLUMN category TYPE inventory_category_new
  USING CASE category::text
    WHEN 'kitchen'    THEN 'kitchen_item'::inventory_category_new
    WHEN 'tools'      THEN 'tool'::inventory_category_new
    WHEN 'shade'      THEN 'shade_structure'::inventory_category_new
    WHEN 'structures'  THEN 'shade_structure'::inventory_category_new
    WHEN 'electrical'  THEN 'av_equip'::inventory_category_new
    WHEN 'lighting'    THEN 'av_equip'::inventory_category_new
    WHEN 'water'       THEN 'amenity_equip'::inventory_category_new
    WHEN 'safety'      THEN 'amenity_equip'::inventory_category_new
    WHEN 'decor'       THEN 'amenity_equip'::inventory_category_new
    WHEN 'signage'     THEN 'other'::inventory_category_new
    WHEN 'personal'    THEN 'other'::inventory_category_new
    WHEN 'misc'        THEN 'other'::inventory_category_new
    ELSE 'other'::inventory_category_new
  END;

ALTER TABLE build_inventory
  ALTER COLUMN category SET DEFAULT 'other'::inventory_category_new;

-- Step 3: Drop old type, rename new type to canonical name
DROP TYPE inventory_category;
ALTER TYPE inventory_category_new RENAME TO inventory_category;
