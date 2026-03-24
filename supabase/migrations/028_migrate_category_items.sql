-- Move items to new categories (enum values added in 027)

-- Move all kitchen_item inventory items to kitchen
UPDATE build_inventory SET category = 'kitchen' WHERE category = 'kitchen_item';

-- Move Camp Boundaries from bm_utility to layout
UPDATE build_inventory SET category = 'layout' WHERE category = 'bm_utility' AND name = 'CAMP Boundaries';

-- Move any remaining bm_utility inventory items to other
UPDATE build_inventory SET category = 'other' WHERE category = 'bm_utility';

-- Move any kitchen_item resources to kitchen
UPDATE build_resources SET category = 'kitchen' WHERE category = 'kitchen_item';

-- Move any bm_utility resources to layout
UPDATE build_resources SET category = 'layout' WHERE category = 'bm_utility';
