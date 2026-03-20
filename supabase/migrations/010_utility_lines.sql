-- Utility Lines for Floorplan Editor
-- Stores power and water line routes drawn on the floorplan

CREATE TABLE floorplan_utility_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floorplan_id UUID NOT NULL REFERENCES floorplan_configs(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL CHECK (line_type IN ('power', 'water')),
  points JSONB NOT NULL DEFAULT '[]'::jsonb,
  label TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by floorplan
CREATE INDEX idx_utility_lines_floorplan ON floorplan_utility_lines(floorplan_id);

-- RLS policies
ALTER TABLE floorplan_utility_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view utility lines"
  ON floorplan_utility_lines FOR SELECT USING (true);

CREATE POLICY "Anyone can insert utility lines"
  ON floorplan_utility_lines FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update utility lines"
  ON floorplan_utility_lines FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete utility lines"
  ON floorplan_utility_lines FOR DELETE USING (true);
