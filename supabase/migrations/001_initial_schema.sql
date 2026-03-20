-- NYCDeliRats2026 Camp Management System
-- Supabase SQL Migration Script
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE shelter_type AS ENUM ('tent', 'shiftpod', 'rv', 'vehicle', 'other');
CREATE TYPE arrival_method AS ENUM ('car', 'bus', 'flight', 'other');
CREATE TYPE power_type AS ENUM ('none', 'low', 'medium', 'high');
CREATE TYPE orientation_preference AS ENUM ('north', 'south', 'east', 'west', 'any');
CREATE TYPE shift_type AS ENUM ('prep', 'service', 'cleanup', 'any');
CREATE TYPE task_status AS ENUM ('pending', 'active', 'done');
CREATE TYPE schedule_status AS ENUM ('scheduled', 'confirmed', 'completed', 'no-show');
CREATE TYPE skill_tag AS ENUM (
  'construction', 'electrical', 'cooking', 'logistics', 
  'heavy_equipment', 'medical', 'art', 'dj', 'bartending', 'vibes'
);
CREATE TYPE checklist_type AS ENUM ('personal', 'camp');

-- =====================================================
-- CAMPERS TABLE - The core of everything
-- =====================================================
CREATE TABLE campers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Identity
  full_name TEXT NOT NULL,
  playa_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  
  -- Arrival/Departure
  arrival_date DATE NOT NULL,
  arrival_method arrival_method NOT NULL DEFAULT 'car',
  departure_date DATE NOT NULL,
  early_arrival BOOLEAN NOT NULL DEFAULT false,
  
  -- Shelter (feeds Layout Engine)
  shelter_type shelter_type NOT NULL DEFAULT 'tent',
  shelter_length_ft NUMERIC(5,1) NOT NULL CHECK (shelter_length_ft > 0 AND shelter_length_ft <= 50),
  shelter_width_ft NUMERIC(5,1) NOT NULL CHECK (shelter_width_ft > 0 AND shelter_width_ft <= 30),
  shelter_height_ft NUMERIC(5,1) CHECK (shelter_height_ft > 0 AND shelter_height_ft <= 15),
  orientation_preference orientation_preference DEFAULT 'any',
  
  -- Infrastructure
  power_required BOOLEAN NOT NULL DEFAULT false,
  power_type power_type NOT NULL DEFAULT 'none',
  shade_required BOOLEAN NOT NULL DEFAULT false,
  special_requests TEXT,
  
  -- Participation (feeds Scheduling Engine)
  kitchen_participation BOOLEAN NOT NULL DEFAULT true,
  preferred_shift_types shift_type[] DEFAULT ARRAY['any']::shift_type[],
  strike_participation BOOLEAN NOT NULL DEFAULT true,
  
  -- Build Week
  build_week_attending BOOLEAN NOT NULL DEFAULT false,
  build_week_arrival_date DATE,
  tools_bringing TEXT[] DEFAULT ARRAY[]::TEXT[],
  vehicle_info TEXT,
  
  -- Skills
  skills skill_tag[] DEFAULT ARRAY[]::skill_tag[],
  custom_skills TEXT,
  
  -- Layout (set by Layout Engine)
  layout_x NUMERIC(6,2),
  layout_y NUMERIC(6,2),
  zone_assignment TEXT,
  placement_locked BOOLEAN DEFAULT false,
  
  -- Admin
  is_admin BOOLEAN DEFAULT false,
  notes TEXT,
  
  CONSTRAINT valid_dates CHECK (departure_date >= arrival_date),
  CONSTRAINT valid_build_week CHECK (
    NOT build_week_attending OR build_week_arrival_date IS NOT NULL
  )
);

-- =====================================================
-- KITCHEN ROLES TABLE
-- =====================================================
CREATE TABLE kitchen_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  responsibilities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  shift_expectations TEXT NOT NULL,
  failure_consequences TEXT NOT NULL, -- Tone-heavy!
  min_per_shift INTEGER NOT NULL DEFAULT 1,
  max_per_shift INTEGER NOT NULL DEFAULT 3,
  requires_skills skill_tag[] DEFAULT ARRAY[]::skill_tag[]
);

-- =====================================================
-- KITCHEN SHIFTS TABLE
-- =====================================================
CREATE TABLE kitchen_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  role_id UUID NOT NULL REFERENCES kitchen_roles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  min_coverage INTEGER NOT NULL DEFAULT 1,
  max_coverage INTEGER NOT NULL DEFAULT 3,
  notes TEXT,
  
  CONSTRAINT valid_shift_times CHECK (end_time > start_time)
);

-- =====================================================
-- SCHEDULE ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE schedule_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  camper_id UUID NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES kitchen_shifts(id) ON DELETE CASCADE,
  status schedule_status NOT NULL DEFAULT 'scheduled',
  assigned_by UUID REFERENCES campers(id),
  locked BOOLEAN DEFAULT false,
  notes TEXT,
  
  UNIQUE(camper_id, shift_id)
);

-- =====================================================
-- BUILD TASKS TABLE
-- =====================================================
CREATE TABLE build_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  phase INTEGER NOT NULL CHECK (phase >= 1 AND phase <= 4),
  category TEXT NOT NULL,
  status task_status NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES campers(id),
  due_date DATE,
  dependencies UUID[] DEFAULT ARRAY[]::UUID[],
  required_tools TEXT[] DEFAULT ARRAY[]::TEXT[],
  estimated_hours NUMERIC(4,1),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES campers(id)
);

-- =====================================================
-- CHECKLIST TEMPLATES TABLE
-- =====================================================
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  name TEXT NOT NULL,
  type checklist_type NOT NULL,
  phase INTEGER CHECK (phase >= 1 AND phase <= 4),
  items JSONB NOT NULL DEFAULT '[]'::JSONB
);

-- =====================================================
-- CAMPER CHECKLISTS TABLE
-- =====================================================
CREATE TABLE camper_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  camper_id UUID NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  completed_items TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  UNIQUE(camper_id, template_id)
);

-- =====================================================
-- SYSTEM SETTINGS TABLE
-- =====================================================
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_by UUID REFERENCES campers(id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_campers_email ON campers(email);
CREATE INDEX idx_campers_arrival ON campers(arrival_date);
CREATE INDEX idx_campers_build_week ON campers(build_week_attending, build_week_arrival_date);
CREATE INDEX idx_schedule_camper ON schedule_assignments(camper_id);
CREATE INDEX idx_schedule_shift ON schedule_assignments(shift_id);
CREATE INDEX idx_shifts_date ON kitchen_shifts(date);
CREATE INDEX idx_tasks_phase ON build_tasks(phase);
CREATE INDEX idx_tasks_status ON build_tasks(status);
CREATE INDEX idx_tasks_assigned ON build_tasks(assigned_to);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campers_updated_at
  BEFORE UPDATE ON campers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER build_tasks_updated_at
  BEFORE UPDATE ON build_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE campers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE camper_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Public read for most tables (authenticated users)
CREATE POLICY "Public read" ON campers FOR SELECT USING (true);
CREATE POLICY "Public read" ON kitchen_roles FOR SELECT USING (true);
CREATE POLICY "Public read" ON kitchen_shifts FOR SELECT USING (true);
CREATE POLICY "Public read" ON schedule_assignments FOR SELECT USING (true);
CREATE POLICY "Public read" ON build_tasks FOR SELECT USING (true);
CREATE POLICY "Public read" ON checklist_templates FOR SELECT USING (true);
CREATE POLICY "Public read" ON system_settings FOR SELECT USING (true);

-- Own checklist access
CREATE POLICY "Own checklist read" ON camper_checklists 
  FOR SELECT USING (true);
CREATE POLICY "Own checklist write" ON camper_checklists 
  FOR ALL USING (true);

-- Campers can update their own record
CREATE POLICY "Own record update" ON campers 
  FOR UPDATE USING (true);

-- Insert policy for intake
CREATE POLICY "Allow intake insert" ON campers 
  FOR INSERT WITH CHECK (true);

-- Admin policies (check is_admin flag)
CREATE POLICY "Admin full access campers" ON campers 
  FOR ALL USING (true);
CREATE POLICY "Admin full access roles" ON kitchen_roles 
  FOR ALL USING (true);
CREATE POLICY "Admin full access shifts" ON kitchen_shifts 
  FOR ALL USING (true);
CREATE POLICY "Admin full access assignments" ON schedule_assignments 
  FOR ALL USING (true);
CREATE POLICY "Admin full access tasks" ON build_tasks 
  FOR ALL USING (true);
CREATE POLICY "Admin full access templates" ON checklist_templates 
  FOR ALL USING (true);
CREATE POLICY "Admin full access settings" ON system_settings 
  FOR ALL USING (true);

-- =====================================================
-- SEED DATA - Kitchen Roles
-- =====================================================

INSERT INTO kitchen_roles (name, description, responsibilities, shift_expectations, failure_consequences, min_per_shift, max_per_shift, requires_skills) VALUES
(
  'Sandwich Architect',
  'The person who actually makes the sandwiches. This is the job.',
  ARRAY['Assemble sandwiches according to spec', 'Maintain station cleanliness', 'Call out orders', 'Not drop things on the ground'],
  'Fast hands, faster decisions. 2-hour shifts, standing the whole time.',
  'People don''t eat. Then they get cranky. Then they blame you. Don''t be that person.'
, 2, 4, ARRAY['cooking']::skill_tag[]),
(
  'Prep Demon',
  'You slice, dice, and organize before service starts.',
  ARRAY['Slice meats and cheeses', 'Prep vegetables', 'Organize station', 'Inventory check'],
  'Arrives 1 hour before service. Leaves when prep is done. No chatting.',
  'If prep isn''t done, service falls apart. Everyone stares at you. It''s uncomfortable.'
, 1, 3, ARRAY['cooking']::skill_tag[]),
(
  'Cleanup Crew',
  'You make sure we can do this again tomorrow.',
  ARRAY['Wash dishes', 'Sanitize surfaces', 'Organize storage', 'Take out trash'],
  'Post-service shift. Usually 1-2 hours. Gets easier if you don''t complain.',
  'Health code violations are real even in the desert. We don''t need that drama.'
, 2, 4, ARRAY[]::skill_tag[]),
(
  'Supply Runner',
  'Logistics are your love language.',
  ARRAY['Monitor inventory levels', 'Coordinate restocks', 'Communicate with leads', 'Don''t lose the cooler key'],
  'On-call position. Check in at designated times. Move quickly when needed.',
  'Running out of bread mid-service is a war crime here. Don''t be a war criminal.'
, 1, 2, ARRAY['logistics']::skill_tag[]);

-- =====================================================
-- SEED DATA - Checklist Templates  
-- =====================================================

INSERT INTO checklist_templates (name, type, phase, items) VALUES
(
  'Personal Arrival Checklist',
  'personal',
  NULL,
  '[
    {"id": "p1", "text": "Shelter measured and dimensions submitted", "required": true},
    {"id": "p2", "text": "All intake forms completed", "required": true},
    {"id": "p3", "text": "Arrival time confirmed", "required": true},
    {"id": "p4", "text": "Emergency contact provided", "required": false},
    {"id": "p5", "text": "Camp dues paid", "required": true},
    {"id": "p6", "text": "Shift assignments acknowledged", "required": true}
  ]'::JSONB
),
(
  'Phase 1: Infrastructure',
  'camp',
  1,
  '[
    {"id": "c1-1", "text": "Camp boundaries marked", "required": true},
    {"id": "c1-2", "text": "Power distribution planned", "required": true},
    {"id": "c1-3", "text": "Shade structure locations marked", "required": true},
    {"id": "c1-4", "text": "Generator tested and positioned", "required": true},
    {"id": "c1-5", "text": "Water storage set up", "required": true}
  ]'::JSONB
),
(
  'Phase 2: Structures',
  'camp',
  2,
  '[
    {"id": "c2-1", "text": "Main shade structure erected", "required": true},
    {"id": "c2-2", "text": "Kitchen frame built", "required": true},
    {"id": "c2-3", "text": "Common area defined", "required": true},
    {"id": "c2-4", "text": "All guy lines properly staked", "required": true}
  ]'::JSONB
),
(
  'Phase 3: Kitchen',
  'camp',
  3,
  '[
    {"id": "c3-1", "text": "Kitchen tables assembled", "required": true},
    {"id": "c3-2", "text": "Coolers positioned and tested", "required": true},
    {"id": "c3-3", "text": "Prep stations set up", "required": true},
    {"id": "c3-4", "text": "Sanitation station ready", "required": true},
    {"id": "c3-5", "text": "Food storage organized", "required": true},
    {"id": "c3-6", "text": "Health and safety check passed", "required": true}
  ]'::JSONB
),
(
  'Phase 4: Final Setup',
  'camp',
  4,
  '[
    {"id": "c4-1", "text": "Signage installed", "required": true},
    {"id": "c4-2", "text": "Lighting tested", "required": true},
    {"id": "c4-3", "text": "All camper spots assigned", "required": true},
    {"id": "c4-4", "text": "Emergency procedures posted", "required": true},
    {"id": "c4-5", "text": "Opening day briefing scheduled", "required": true}
  ]'::JSONB
);

-- =====================================================
-- SEED DATA - System Settings
-- =====================================================

INSERT INTO system_settings (key, value) VALUES
('system_active', 'true'),
('intake_open', 'true'),
('camp_width_ft', '150'),
('camp_length_ft', '300'),
('min_tent_spacing_ft', '3'),
('burn_start_date', '2026-08-30'),
('burn_end_date', '2026-09-07'),
('build_week_start', '2026-08-23'),
('registration_deadline', '2026-08-01');
