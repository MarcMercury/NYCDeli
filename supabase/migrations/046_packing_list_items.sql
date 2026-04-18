-- Packing list items: stores editable per-camper packing list entries
CREATE TABLE IF NOT EXISTS packing_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camper_id uuid NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'Uncategorized',
  item text NOT NULL,
  packed boolean NOT NULL DEFAULT false,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by camper
CREATE INDEX idx_packing_list_items_camper ON packing_list_items(camper_id);

-- RLS
ALTER TABLE packing_list_items ENABLE ROW LEVEL SECURITY;

-- Users can read their own packing list items (via camper link)
CREATE POLICY "Users can view own packing list items"
  ON packing_list_items FOR SELECT
  USING (
    camper_id IN (
      SELECT camper_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can insert their own packing list items
CREATE POLICY "Users can insert own packing list items"
  ON packing_list_items FOR INSERT
  WITH CHECK (
    camper_id IN (
      SELECT camper_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can update their own packing list items
CREATE POLICY "Users can update own packing list items"
  ON packing_list_items FOR UPDATE
  USING (
    camper_id IN (
      SELECT camper_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can delete their own packing list items
CREATE POLICY "Users can delete own packing list items"
  ON packing_list_items FOR DELETE
  USING (
    camper_id IN (
      SELECT camper_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins full access to packing list items"
  ON packing_list_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
