-- Add 'pre_build' to the build_schedule_day enum for PRE-Build Week items
-- and seed default pre-build tasks

ALTER TYPE build_schedule_day ADD VALUE IF NOT EXISTS 'pre_build' BEFORE 'saturday';

-- Seed PRE-Build Week items
INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery) VALUES
  ('pre_build', 'Admin planning session', 'Core admin team aligns on layout, logistics, roles, and timeline', 'logistics', NULL, 10, false),
  ('pre_build', 'Full team chat group launch', 'Create and onboard all campers into the group chat (WhatsApp/Signal/etc.)', 'logistics', NULL, 20, false),
  ('pre_build', 'Full team meeting 1', 'Introductions, camp vision, build week overview', 'logistics', NULL, 30, false),
  ('pre_build', 'Full team meeting 2', 'Review camp layout, shade structures, and placement', 'logistics', NULL, 40, false),
  ('pre_build', 'Full team meeting 3', 'Electrical plan, kitchen setup, and plumbing review', 'logistics', NULL, 50, false),
  ('pre_build', 'Full team meeting 4', 'Inventory review, supply gaps, and purchasing assignments', 'logistics', NULL, 60, false),
  ('pre_build', 'Full team meeting 5', 'Build week schedule walkthrough and crew assignments', 'logistics', NULL, 70, false),
  ('pre_build', 'Full team meeting 6', 'Final logistics — travel, arrival times, emergency contacts', 'logistics', NULL, 80, false),
  ('pre_build', 'Verify inventory in Reno', 'Physically confirm all stored items, check condition, update inventory list', 'logistics', NULL, 90, false),
  ('pre_build', 'Confirm builder headcount & arrival dates', 'Lock in who is attending build week and when they arrive', 'logistics', NULL, 100, false),
  ('pre_build', 'Finalize supply list & place orders', 'Review supply gaps, order remaining materials, confirm delivery dates', 'logistics', NULL, 110, false),
  ('pre_build', 'Coordinate vehicle & trailer logistics', 'Confirm trucks, trailers, tow vehicles, and fuel stops for the drive in', 'delivery', NULL, 120, true),
  ('pre_build', 'Review camp layout & placement plan', 'Walk through the layout map, confirm structure positions and orientation', 'layout', NULL, 130, false),
  ('pre_build', 'Distribute build week schedule to team', 'Share the finalized day-by-day schedule with all builders', 'logistics', NULL, 140, false),
  ('pre_build', 'Test generators & electrical equipment', 'Run generators, test distro boxes, verify wiring and adapters work', 'electrical', NULL, 150, false),
  ('pre_build', 'Confirm storage unit access in Reno', 'Verify keys/codes, confirm access hours, coordinate pickup timing', 'logistics', NULL, 160, false);
