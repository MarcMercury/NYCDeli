-- Replace packed boolean with multi-step status tracking
-- Statuses: need → ordered → have → packed

ALTER TABLE packing_list_items
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'need'
  CHECK (status IN ('need', 'ordered', 'have', 'packed'));

-- Migrate existing data: packed=true → 'packed', packed=false → 'need'
UPDATE packing_list_items SET status = 'packed' WHERE packed = true;
UPDATE packing_list_items SET status = 'need' WHERE packed = false;

-- Drop the old packed column
ALTER TABLE packing_list_items DROP COLUMN IF EXISTS packed;
