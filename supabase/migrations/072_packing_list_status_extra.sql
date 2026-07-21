-- Add two extra packing-list statuses: 'camp_provided' and 'na'
-- Existing statuses: need → ordered → have → packed

ALTER TABLE packing_list_items
  DROP CONSTRAINT IF EXISTS packing_list_items_status_check;

ALTER TABLE packing_list_items
  ADD CONSTRAINT packing_list_items_status_check
  CHECK (status IN ('need', 'ordered', 'have', 'packed', 'camp_provided', 'na'));
