-- Floorplan Editor Schema
-- Stores layout configurations and placed objects for the camp floorplan designer

-- Object type enum
CREATE TYPE floorplan_object_type AS ENUM (
  'tent',
  'kitchen',
  'grill',
  'prep_area',
  'service_area',
  'shade_structure',
  'common_area',
  'stage',
  'bar',
  'art_car',
  'porta_potty',
  'generator',
  'water_station',
  'first_aid',
  'fire_pit',
  'storage',
  'entrance',
  'fence',
  'custom'
);

-- Floorplan configurations (can have multiple saved layouts)
CREATE TABLE floorplan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Main Layout',
  width_ft NUMERIC NOT NULL DEFAULT 150,
  length_ft NUMERIC NOT NULL DEFAULT 300,
  grid_size_ft NUMERIC NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Objects placed on the floorplan
CREATE TABLE floorplan_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floorplan_id UUID NOT NULL REFERENCES floorplan_configs(id) ON DELETE CASCADE,
  object_type floorplan_object_type NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  x NUMERIC NOT NULL DEFAULT 0,
  y NUMERIC NOT NULL DEFAULT 0,
  width_ft NUMERIC NOT NULL DEFAULT 10,
  height_ft NUMERIC NOT NULL DEFAULT 10,
  rotation NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#94a3b8',
  z_index INTEGER NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  parent_id UUID REFERENCES floorplan_objects(id) ON DELETE SET NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by floorplan
CREATE INDEX idx_floorplan_objects_floorplan ON floorplan_objects(floorplan_id);
CREATE INDEX idx_floorplan_objects_parent ON floorplan_objects(parent_id);
CREATE INDEX idx_floorplan_objects_type ON floorplan_objects(object_type);

-- Insert a default floorplan config
INSERT INTO floorplan_configs (name, width_ft, length_ft, grid_size_ft, is_active)
VALUES ('NYC Deli Rats 2026', 150, 300, 10, true);

-- RLS policies
ALTER TABLE floorplan_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE floorplan_objects ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Anyone can view floorplan configs"
  ON floorplan_configs FOR SELECT USING (true);

CREATE POLICY "Anyone can view floorplan objects"
  ON floorplan_objects FOR SELECT USING (true);

-- Allow all to insert/update/delete (admin controls handled at app level)
CREATE POLICY "Anyone can insert floorplan configs"
  ON floorplan_configs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update floorplan configs"
  ON floorplan_configs FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete floorplan configs"
  ON floorplan_configs FOR DELETE USING (true);

CREATE POLICY "Anyone can insert floorplan objects"
  ON floorplan_objects FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update floorplan objects"
  ON floorplan_objects FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete floorplan objects"
  ON floorplan_objects FOR DELETE USING (true);
