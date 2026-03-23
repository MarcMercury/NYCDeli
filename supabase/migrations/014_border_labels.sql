-- Add border labels to floorplan_configs
ALTER TABLE floorplan_configs
  ADD COLUMN IF NOT EXISTS border_label_north text,
  ADD COLUMN IF NOT EXISTS border_label_south text,
  ADD COLUMN IF NOT EXISTS border_label_east  text,
  ADD COLUMN IF NOT EXISTS border_label_west  text;
