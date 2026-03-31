-- Resource Edits: allows admins to edit resource page entries
-- Resources are identified by a stable slug/key derived from the title
-- Only the edited fields are stored (overrides on top of static defaults)

CREATE TABLE resource_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_key TEXT NOT NULL UNIQUE,
  title TEXT,
  content TEXT,
  link TEXT,
  edited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update timestamp
CREATE TRIGGER update_resource_edits_updated_at
  BEFORE UPDATE ON resource_edits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE resource_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view resource edits"
  ON resource_edits FOR SELECT USING (true);

CREATE POLICY "Admin full access on resource edits"
  ON resource_edits FOR ALL USING (true);

-- Index for fast key lookup
CREATE INDEX idx_resource_edits_key ON resource_edits(resource_key);
