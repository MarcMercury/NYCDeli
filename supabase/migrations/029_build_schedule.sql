-- Build Schedule: day-by-day editable build task list
-- Replaces the static INFO tab with a comprehensive build schedule

CREATE TYPE build_schedule_day AS ENUM (
  'saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'
);

CREATE TYPE build_schedule_category AS ENUM (
  'delivery', 'infrastructure', 'shade', 'kitchen', 'electrical',
  'plumbing', 'layout', 'decoration', 'logistics', 'safety', 'other'
);

CREATE TABLE build_schedule_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  day         build_schedule_day NOT NULL DEFAULT 'monday',
  title       text NOT NULL,
  description text,
  category    build_schedule_category NOT NULL DEFAULT 'other',
  time_slot   text,               -- e.g. 'morning', 'afternoon', 'all_day'
  sort_order  int NOT NULL DEFAULT 0,
  is_delivery boolean NOT NULL DEFAULT false,
  completed   boolean NOT NULL DEFAULT false,
  assigned_to text,               -- person or crew responsible
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_build_schedule_day ON build_schedule_items (day, sort_order);

-- RLS
ALTER TABLE build_schedule_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "build_schedule_items_select"
  ON build_schedule_items FOR SELECT
  USING (true);

-- Authenticated users can insert/update/delete
CREATE POLICY "build_schedule_items_insert"
  ON build_schedule_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "build_schedule_items_update"
  ON build_schedule_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "build_schedule_items_delete"
  ON build_schedule_items FOR DELETE
  TO authenticated
  USING (true);

-- Seed with a comprehensive default build schedule
INSERT INTO build_schedule_items (day, title, category, time_slot, sort_order, is_delivery) VALUES
  -- Saturday (Early Arrival / Receiving)
  ('saturday', 'Receive container delivery', 'delivery', 'morning', 10, true),
  ('saturday', 'Unload & inventory container contents', 'logistics', 'morning', 20, false),
  ('saturday', 'Mark camp boundaries / lot corners', 'layout', 'afternoon', 30, false),
  ('saturday', 'Set up initial shade for staging area', 'shade', 'afternoon', 40, false),

  -- Sunday (Foundation Day)
  ('sunday', 'Receive lumber / large material delivery', 'delivery', 'morning', 10, true),
  ('sunday', 'Lay out camp footprint with tape & stakes', 'layout', 'morning', 20, false),
  ('sunday', 'Begin main shade structure frame', 'infrastructure', 'morning', 30, false),
  ('sunday', 'Run primary electrical conduit / cables', 'electrical', 'afternoon', 40, false),
  ('sunday', 'Set up generator / power distribution', 'electrical', 'afternoon', 50, false),

  -- Monday
  ('monday', 'Continue main shade structure — raise roof', 'infrastructure', 'morning', 10, false),
  ('monday', 'Install shade cloth / tarps on main structure', 'shade', 'morning', 20, false),
  ('monday', 'Build kitchen counter / prep surfaces', 'kitchen', 'afternoon', 30, false),
  ('monday', 'Run water lines to kitchen & gray water', 'plumbing', 'afternoon', 40, false),
  ('monday', 'Receive kitchen equipment delivery', 'delivery', 'afternoon', 50, true),

  -- Tuesday
  ('tuesday', 'Complete shade coverage — secondary structures', 'shade', 'morning', 10, false),
  ('tuesday', 'Install lighting — string lights & task lights', 'electrical', 'morning', 20, false),
  ('tuesday', 'Set up kitchen appliances & storage', 'kitchen', 'morning', 30, false),
  ('tuesday', 'Build lounge / chill area furniture', 'decoration', 'afternoon', 40, false),
  ('tuesday', 'Install safety equipment — fire extinguishers, first aid', 'safety', 'afternoon', 50, false),

  -- Wednesday
  ('wednesday', 'Install camp signage & address markers', 'layout', 'morning', 10, false),
  ('wednesday', 'Set up sound / A/V equipment', 'decoration', 'morning', 20, false),
  ('wednesday', 'Final plumbing connections & gray water test', 'plumbing', 'morning', 30, false),
  ('wednesday', 'Decoration & art installation', 'decoration', 'afternoon', 40, false),
  ('wednesday', 'Personal camp spot setup assistance', 'logistics', 'afternoon', 50, false),

  -- Thursday
  ('thursday', 'Systems check — power, water, gray water', 'safety', 'morning', 10, false),
  ('thursday', 'Final decoration & finishing touches', 'decoration', 'morning', 20, false),
  ('thursday', 'Stock kitchen with initial supplies', 'kitchen', 'afternoon', 30, false),
  ('thursday', 'Camp walkthrough & safety briefing', 'safety', 'afternoon', 40, false),
  ('thursday', 'Welcome early arrivals — orient to camp', 'logistics', 'afternoon', 50, false),

  -- Friday (Gate opens)
  ('friday', 'Final fixes & touch-ups', 'infrastructure', 'morning', 10, false),
  ('friday', 'Welcome committee setup', 'logistics', 'morning', 20, false),
  ('friday', 'Gate opens — greet campers as they arrive', 'logistics', 'afternoon', 30, false),
  ('friday', 'Help new arrivals with camp spot setup', 'logistics', 'afternoon', 40, false);
