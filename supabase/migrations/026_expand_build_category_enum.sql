-- Add inventory categories to the build_category enum so resources can use them too
ALTER TYPE build_category ADD VALUE IF NOT EXISTS 'shade_structure';
ALTER TYPE build_category ADD VALUE IF NOT EXISTS 'tool';
ALTER TYPE build_category ADD VALUE IF NOT EXISTS 'large_equipment';
ALTER TYPE build_category ADD VALUE IF NOT EXISTS 'container';
ALTER TYPE build_category ADD VALUE IF NOT EXISTS 'kitchen_item';
ALTER TYPE build_category ADD VALUE IF NOT EXISTS 'av_equip';
ALTER TYPE build_category ADD VALUE IF NOT EXISTS 'electrical';
ALTER TYPE build_category ADD VALUE IF NOT EXISTS 'plumbing';
ALTER TYPE build_category ADD VALUE IF NOT EXISTS 'furniture';
ALTER TYPE build_category ADD VALUE IF NOT EXISTS 'other';
ALTER TYPE build_category ADD VALUE IF NOT EXISTS 'bm_utility';
