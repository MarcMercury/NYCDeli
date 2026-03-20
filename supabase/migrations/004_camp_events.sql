-- Migration: Pre-Burn Camp Events Calendar
-- Adds a simple events table for tracking camp events from now through the Burn

CREATE TABLE IF NOT EXISTS camp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_by TEXT
);

-- Index for date-range queries
CREATE INDEX idx_camp_events_date ON camp_events (event_date);

-- Enable RLS
ALTER TABLE camp_events ENABLE ROW LEVEL SECURITY;

-- App-level access (no auth required for camp coordination tool)
CREATE POLICY "Allow all access to camp_events"
  ON camp_events FOR ALL
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_camp_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER camp_events_updated_at
  BEFORE UPDATE ON camp_events
  FOR EACH ROW
  EXECUTE FUNCTION update_camp_events_updated_at();
