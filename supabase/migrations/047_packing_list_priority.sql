-- Add priority field to packing list items
ALTER TABLE packing_list_items
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'must'
  CHECK (priority IN ('must', 'nice', 'optional'));
