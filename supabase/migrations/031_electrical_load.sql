-- ============================================
-- 031: Electrical Load Calculator
-- ============================================

-- Generator / power source config
CREATE TABLE IF NOT EXISTS electrical_load_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generator_kw numeric NOT NULL DEFAULT 125,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Distro boxes
CREATE TABLE IF NOT EXISTS electrical_distro_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  max_amps numeric NOT NULL DEFAULT 100,
  voltage numeric NOT NULL DEFAULT 120,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Electrical load items (the appliances / circuits)
CREATE TABLE IF NOT EXISTS electrical_load_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  voltage numeric NOT NULL DEFAULT 120,
  amperage numeric NOT NULL DEFAULT 0,
  wattage numeric NOT NULL DEFAULT 0,
  plug_type text NOT NULL DEFAULT 'standard',
  quantity integer NOT NULL DEFAULT 1,
  total_amps numeric NOT NULL DEFAULT 0,
  total_wattage numeric NOT NULL DEFAULT 0,
  notes text,
  distro_box_id uuid REFERENCES electrical_distro_boxes(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_electrical_load_items_distro ON electrical_load_items(distro_box_id);

-- RLS
ALTER TABLE electrical_load_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE electrical_distro_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE electrical_load_items ENABLE ROW LEVEL SECURITY;

-- Policies — read for all authenticated, write for all authenticated (camp tool)
CREATE POLICY "electrical_load_config_select" ON electrical_load_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "electrical_load_config_insert" ON electrical_load_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "electrical_load_config_update" ON electrical_load_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "electrical_load_config_delete" ON electrical_load_config FOR DELETE TO authenticated USING (true);

CREATE POLICY "electrical_distro_boxes_select" ON electrical_distro_boxes FOR SELECT TO authenticated USING (true);
CREATE POLICY "electrical_distro_boxes_insert" ON electrical_distro_boxes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "electrical_distro_boxes_update" ON electrical_distro_boxes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "electrical_distro_boxes_delete" ON electrical_distro_boxes FOR DELETE TO authenticated USING (true);

CREATE POLICY "electrical_load_items_select" ON electrical_load_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "electrical_load_items_insert" ON electrical_load_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "electrical_load_items_update" ON electrical_load_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "electrical_load_items_delete" ON electrical_load_items FOR DELETE TO authenticated USING (true);

-- Seed: single config row
INSERT INTO electrical_load_config (generator_kw) VALUES (125)
ON CONFLICT DO NOTHING;

-- Seed: distro boxes (6 boxes, 100A each)
INSERT INTO electrical_distro_boxes (name, max_amps, voltage, notes, sort_order) VALUES
  ('RV-1', 100, 120, 'RV distro bank 1', 0),
  ('RV-2', 100, 120, 'RV distro bank 2', 1),
  ('1', 100, 120, 'Distro Box 1 – Kitchen', 2),
  ('2', 100, 120, 'Distro Box 2 – General/Lights', 3),
  ('3', 100, 120, 'Distro Box 3 – NYC Tent/Shower', 4),
  ('4', 100, 120, 'Distro Box 4 – Public Tent', 5),
  ('5', 100, 120, 'Distro Box 5 – Tent Section 1', 6),
  ('6', 100, 120, 'Distro Box 6 – Tent Section 2', 7);

-- Seed: electrical load items
-- We'll reference distro boxes by name using a subquery
INSERT INTO electrical_load_items (name, location, voltage, amperage, wattage, plug_type, quantity, total_amps, total_wattage, notes, distro_box_id, sort_order) VALUES
  ('RV 1', 'Road', 120, 26, 3120, 'TT-30', 1, 30, 3500, '30A RV distro (dedicated)', (SELECT id FROM electrical_distro_boxes WHERE name = 'RV-1'), 0),
  ('RV 2', 'Road', 120, 26, 3120, 'TT-30', 1, 30, 3500, '30A RV distro (dedicated)', (SELECT id FROM electrical_distro_boxes WHERE name = 'RV-1'), 1),
  ('RV 3', 'Road', 120, 26, 3120, 'TT-30', 1, 30, 3500, '30A RV distro (dedicated)', (SELECT id FROM electrical_distro_boxes WHERE name = 'RV-2'), 2),
  ('RV 4', 'Road', 120, 26, 3120, 'TT-30', 1, 30, 3500, '30A RV distro (dedicated)', (SELECT id FROM electrical_distro_boxes WHERE name = 'RV-2'), 3),
  ('RV 5', 'Road', 120, 26, 3120, 'TT-30', 1, 30, 3500, '30A RV distro (dedicated)', (SELECT id FROM electrical_distro_boxes WHERE name = 'RV-2'), 4),
  ('Microwave', 'Kitchen', 120, 9, 1000, 'standard', 2, 20, 2000, '1 per circuit', (SELECT id FROM electrical_distro_boxes WHERE name = '1'), 5),
  ('Kettle', 'Kitchen', 120, 8, 1000, 'standard', 2, 20, 2000, '1 per circuit', (SELECT id FROM electrical_distro_boxes WHERE name = '1'), 6),
  ('5 Gallon Heated Water Dispenser', 'Kitchen', 120, 12, 1500, 'standard', 2, 30, 3000, '1 per circuit', (SELECT id FROM electrical_distro_boxes WHERE name = '1'), 7),
  ('Tool Rechargers', 'Anywhere', 120, 0.25, 50, 'standard', 4, 5, 200, 'light load', (SELECT id FROM electrical_distro_boxes WHERE name = '2'), 8),
  ('Bistro Lights (Camp Lights)', 'Anywhere', 120, 0.5, 75, 'standard', 5, 5, 400, 'assume 100ft runs', (SELECT id FROM electrical_distro_boxes WHERE name = '2'), 9),
  ('Swamp Coolers', 'NYC Tent', 120, 6, 500, 'standard', 2, 15, 1000, NULL, (SELECT id FROM electrical_distro_boxes WHERE name = '3'), 10),
  ('Ice Maker', 'NYC Tent', 120, 10, 800, 'standard', 2, 20, 2000, '1 per circuit', (SELECT id FROM electrical_distro_boxes WHERE name = '3'), 11),
  ('Water Heater (Shower)', 'Shower', 120, 17, 2000, 'standard', 1, 20, 2000, 'dedicated', (SELECT id FROM electrical_distro_boxes WHERE name = '3'), 12),
  ('Swamp Coolers', 'Public Tent', 120, 6, 500, 'standard', 4, 20, 1500, 'Hessaire MC92V', (SELECT id FROM electrical_distro_boxes WHERE name = '4'), 13),
  ('DJ Equip', 'Public Tent', 120, 0.75, 100, 'standard', 1, 5, 200, 'deck + speakers', (SELECT id FROM electrical_distro_boxes WHERE name = '4'), 14),
  ('Tent Section 1', 'Anywhere', 120, 0.75, 120, 'standard', 25, 50, 7000, 'distributed across circuits', (SELECT id FROM electrical_distro_boxes WHERE name = '5'), 15),
  ('Tent Section 2', 'Anywhere', 120, 0.75, 120, 'standard', 25, 50, 7000, 'distributed across circuits', (SELECT id FROM electrical_distro_boxes WHERE name = '6'), 16);
