-- Enable Realtime for the campers table so the Tent Size Summary
-- in the Layout builder auto-refreshes when shelter details change.
ALTER PUBLICATION supabase_realtime ADD TABLE campers;
