-- Camp Spot Selection Feature
-- "Airline seat selection" style camp location reservation system

-- ENUM for spot size category
CREATE TYPE spot_size AS ENUM ('small', 'medium', 'large', 'xlarge');
CREATE TYPE reservation_status AS ENUM ('reserved', 'released', 'admin_moved');

-- =====================================================
-- CAMP SPOTS TABLE - All available spots on the map
-- =====================================================
CREATE TABLE camp_spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Grid identity (like airline seats: row "A", seat "1" → "A1")
  row_label TEXT NOT NULL,        -- e.g., 'A', 'B', 'C'
  spot_number INTEGER NOT NULL,   -- e.g., 1, 2, 3
  label TEXT GENERATED ALWAYS AS (row_label || spot_number::TEXT) STORED,

  -- Physical position on map (feet from origin)
  x_position NUMERIC(6,2) NOT NULL,
  y_position NUMERIC(6,2) NOT NULL,

  -- Space dimensions (what fits here)
  spot_width_ft NUMERIC(5,1) NOT NULL CHECK (spot_width_ft > 0),
  spot_length_ft NUMERIC(5,1) NOT NULL CHECK (spot_length_ft > 0),

  -- Tent size constraints for this spot
  size_category spot_size NOT NULL DEFAULT 'medium',
  min_tent_width_ft NUMERIC(5,1) NOT NULL DEFAULT 5,
  max_tent_width_ft NUMERIC(5,1) NOT NULL,
  min_tent_length_ft NUMERIC(5,1) NOT NULL DEFAULT 5,
  max_tent_length_ft NUMERIC(5,1) NOT NULL,

  -- Spot features
  has_power BOOLEAN NOT NULL DEFAULT false,
  has_shade BOOLEAN NOT NULL DEFAULT false,
  is_accessible BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,   -- admin can disable
  notes TEXT,

  CONSTRAINT unique_spot UNIQUE (row_label, spot_number),
  CONSTRAINT valid_tent_width CHECK (min_tent_width_ft <= max_tent_width_ft),
  CONSTRAINT valid_tent_length CHECK (min_tent_length_ft <= max_tent_length_ft)
);

-- =====================================================
-- CAMP RESERVATIONS TABLE - Who reserved what
-- =====================================================
CREATE TABLE camp_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  spot_id UUID NOT NULL REFERENCES camp_spots(id) ON DELETE CASCADE,
  camper_id UUID NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  status reservation_status NOT NULL DEFAULT 'reserved',
  reserved_by UUID REFERENCES campers(id),  -- who made the reservation (self or admin)
  admin_notes TEXT,

  -- Only one active reservation per spot
  CONSTRAINT one_active_per_spot UNIQUE (spot_id) 
);

-- A camper can only have one active reservation
CREATE UNIQUE INDEX idx_one_reservation_per_camper 
  ON camp_reservations (camper_id) 
  WHERE status = 'reserved';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_camp_spots_row ON camp_spots(row_label);
CREATE INDEX idx_camp_spots_available ON camp_spots(is_available);
CREATE INDEX idx_camp_reservations_spot ON camp_reservations(spot_id);
CREATE INDEX idx_camp_reservations_camper ON camp_reservations(camper_id);
CREATE INDEX idx_camp_reservations_status ON camp_reservations(status);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER camp_spots_updated_at
  BEFORE UPDATE ON camp_spots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER camp_reservations_updated_at
  BEFORE UPDATE ON camp_reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE camp_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON camp_spots FOR SELECT USING (true);
CREATE POLICY "Admin full access spots" ON camp_spots FOR ALL USING (true);

CREATE POLICY "Public read" ON camp_reservations FOR SELECT USING (true);
CREATE POLICY "Allow reservation insert" ON camp_reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow reservation update" ON camp_reservations FOR UPDATE USING (true);
CREATE POLICY "Admin full access reservations" ON camp_reservations FOR ALL USING (true);

-- =====================================================
-- SYSTEM SETTINGS for camp selection feature
-- =====================================================
INSERT INTO system_settings (key, value) VALUES
  ('camp_selection_enabled', 'false'),
  ('camp_selection_open_date', '2026-08-01');

-- =====================================================
-- SEED DATA - Default camp grid (7 rows × 8 spots)
-- Small spots: 10×10, Medium: 12.5×10, Large: 15×10, XLarge: 17.5×10
-- =====================================================

-- Row A: Front row, mixed sizes (closest to common area)
INSERT INTO camp_spots (row_label, spot_number, x_position, y_position, spot_width_ft, spot_length_ft, size_category, min_tent_width_ft, max_tent_width_ft, min_tent_length_ft, max_tent_length_ft, has_shade, has_power) VALUES
  ('A', 1,  5,   10, 10, 10, 'small',  6, 10, 6, 10, true, true),
  ('A', 2,  17,  10, 10, 10, 'small',  6, 10, 6, 10, true, true),
  ('A', 3,  29,  10, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true),
  ('A', 4,  43.5, 10, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true),
  ('A', 5,  58,  10, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, false),
  ('A', 6,  72.5, 10, 10, 10, 'small',  6, 10, 6, 10, true, false),
  ('A', 7,  84.5, 10, 10, 10, 'small',  6, 10, 6, 10, true, false),
  ('A', 8,  96.5, 10, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true);

-- Row B
INSERT INTO camp_spots (row_label, spot_number, x_position, y_position, spot_width_ft, spot_length_ft, size_category, min_tent_width_ft, max_tent_width_ft, min_tent_length_ft, max_tent_length_ft, has_shade, has_power) VALUES
  ('B', 1,  5,   25, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true),
  ('B', 2,  19.5, 25, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true),
  ('B', 3,  34,  25, 15, 10, 'large',  10, 15, 8, 10, true, true),
  ('B', 4,  51,  25, 15, 10, 'large',  10, 15, 8, 10, true, true),
  ('B', 5,  68,  25, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, false),
  ('B', 6,  82.5, 25, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, false),
  ('B', 7,  97,  25, 10, 10, 'small',  6, 10, 6, 10, true, false),
  ('B', 8,  109, 25, 10, 10, 'small',  6, 10, 6, 10, true, true);

-- Row C
INSERT INTO camp_spots (row_label, spot_number, x_position, y_position, spot_width_ft, spot_length_ft, size_category, min_tent_width_ft, max_tent_width_ft, min_tent_length_ft, max_tent_length_ft, has_shade, has_power) VALUES
  ('C', 1,  5,   40, 10, 10, 'small',  6, 10, 6, 10, true, true),
  ('C', 2,  17,  40, 15, 10, 'large',  10, 15, 8, 10, true, true),
  ('C', 3,  34,  40, 15, 10, 'large',  10, 15, 8, 10, true, true),
  ('C', 4,  51,  40, 17.5, 10, 'xlarge', 12, 17.5, 8, 10, true, true),
  ('C', 5,  70.5, 40, 17.5, 10, 'xlarge', 12, 17.5, 8, 10, true, true),
  ('C', 6,  90,  40, 15, 10, 'large',  10, 15, 8, 10, true, false),
  ('C', 7,  107, 40, 10, 10, 'small',  6, 10, 6, 10, true, false),
  ('C', 8,  119, 40, 10, 10, 'small',  6, 10, 6, 10, true, true);

-- Row D (center row)
INSERT INTO camp_spots (row_label, spot_number, x_position, y_position, spot_width_ft, spot_length_ft, size_category, min_tent_width_ft, max_tent_width_ft, min_tent_length_ft, max_tent_length_ft, has_shade, has_power) VALUES
  ('D', 1,  5,   55, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true),
  ('D', 2,  19.5, 55, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true),
  ('D', 3,  34,  55, 17.5, 10, 'xlarge', 12, 17.5, 8, 10, true, true),
  ('D', 4,  53.5, 55, 17.5, 10, 'xlarge', 12, 17.5, 8, 10, true, true),
  ('D', 5,  73,  55, 15, 10, 'large',  10, 15, 8, 10, true, true),
  ('D', 6,  90,  55, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, false),
  ('D', 7,  104.5, 55, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, false),
  ('D', 8,  119, 55, 10, 10, 'small',  6, 10, 6, 10, true, true);

-- Row E
INSERT INTO camp_spots (row_label, spot_number, x_position, y_position, spot_width_ft, spot_length_ft, size_category, min_tent_width_ft, max_tent_width_ft, min_tent_length_ft, max_tent_length_ft, has_shade, has_power) VALUES
  ('E', 1,  5,   70, 15, 10, 'large',  10, 15, 8, 10, true, true),
  ('E', 2,  22,  70, 15, 10, 'large',  10, 15, 8, 10, true, true),
  ('E', 3,  39,  70, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true),
  ('E', 4,  53.5, 70, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true),
  ('E', 5,  68,  70, 10, 10, 'small',  6, 10, 6, 10, true, false),
  ('E', 6,  80,  70, 10, 10, 'small',  6, 10, 6, 10, true, false),
  ('E', 7,  92,  70, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, false),
  ('E', 8,  106.5, 70, 15, 10, 'large',  10, 15, 8, 10, true, true);

-- Row F
INSERT INTO camp_spots (row_label, spot_number, x_position, y_position, spot_width_ft, spot_length_ft, size_category, min_tent_width_ft, max_tent_width_ft, min_tent_length_ft, max_tent_length_ft, has_shade, has_power) VALUES
  ('F', 1,  5,   85, 10, 10, 'small',  6, 10, 6, 10, true, true),
  ('F', 2,  17,  85, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true),
  ('F', 3,  31.5, 85, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true),
  ('F', 4,  46,  85, 15, 10, 'large',  10, 15, 8, 10, true, true),
  ('F', 5,  63,  85, 15, 10, 'large',  10, 15, 8, 10, true, true),
  ('F', 6,  80,  85, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, false),
  ('F', 7,  94.5, 85, 10, 10, 'small',  6, 10, 6, 10, true, false),
  ('F', 8,  106.5, 85, 10, 10, 'small',  6, 10, 6, 10, true, true);

-- Row G (back row, quieter)
INSERT INTO camp_spots (row_label, spot_number, x_position, y_position, spot_width_ft, spot_length_ft, size_category, min_tent_width_ft, max_tent_width_ft, min_tent_length_ft, max_tent_length_ft, has_shade, has_power) VALUES
  ('G', 1,  5,   100, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true),
  ('G', 2,  19.5, 100, 10, 10, 'small',  6, 10, 6, 10, true, true),
  ('G', 3,  31.5, 100, 10, 10, 'small',  6, 10, 6, 10, true, true),
  ('G', 4,  43.5, 100, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true),
  ('G', 5,  58,  100, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, false),
  ('G', 6,  72.5, 100, 15, 10, 'large',  10, 15, 8, 10, true, false),
  ('G', 7,  89.5, 100, 10, 10, 'small',  6, 10, 6, 10, true, false),
  ('G', 8,  101.5, 100, 12.5, 10, 'medium', 8, 12.5, 8, 10, true, true);
