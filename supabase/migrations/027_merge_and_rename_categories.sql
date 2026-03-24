-- Add 'kitchen' and 'layout' to inventory_category enum
-- NOTE: enum additions must be committed separately from usage.
-- Run 027a first, then 027b.
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'kitchen';
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'layout';
