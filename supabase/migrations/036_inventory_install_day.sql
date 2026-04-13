-- Add install_day column to build_inventory and build_resources tables
-- This replaces the "Question" concept with a date that can be shared
-- between inventory items, tasks, and the schedule calendar.

ALTER TABLE build_inventory
  ADD COLUMN IF NOT EXISTS install_day date;

ALTER TABLE build_resources
  ADD COLUMN IF NOT EXISTS install_day date;
