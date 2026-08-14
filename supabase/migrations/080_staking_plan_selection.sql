-- Persist the Staking Plan object selection with the floorplan so the plan
-- survives leaving and returning to /admin/staking-plan.
-- NULL = never saved (page falls back to "all stakeable objects").

ALTER TABLE floorplan_configs
  ADD COLUMN IF NOT EXISTS staking_plan_selection UUID[];

COMMENT ON COLUMN floorplan_configs.staking_plan_selection IS
  'Floorplan object ids included on the printable Site Staking & Flagging Plan. NULL = not yet saved (defaults to every stakeable object).';
