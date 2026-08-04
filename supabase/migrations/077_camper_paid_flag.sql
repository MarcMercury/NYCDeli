-- Track whether a camper has paid their camp dues.
ALTER TABLE campers
  ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN campers.paid IS 'Whether the camper has paid camp dues.';
