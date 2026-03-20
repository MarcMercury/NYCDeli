-- Build Week Stages, Goals, Resources, Procedures, Questions
-- Comprehensive build week planning and tracking system

-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE build_stage_type AS ENUM (
  'planning', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'
);

CREATE TYPE build_category AS ENUM (
  'infrastructure', 'shelter', 'kitchen', 'logistics', 'safety', 'layout', 'decoration', 'personal'
);

CREATE TYPE build_resource_status AS ENUM ('have', 'need', 'fix', 'discard');
CREATE TYPE build_question_status AS ENUM ('open', 'resolved', 'deferred');

-- =====================================================
-- BUILD STAGES - The timeline backbone
-- =====================================================
CREATE TABLE build_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage build_stage_type NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  date_label TEXT,
  crew_size TEXT,
  builder_notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- BUILD GOALS - Tasks/objectives within each stage
-- =====================================================
CREATE TABLE build_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_id UUID NOT NULL REFERENCES build_stages(id) ON DELETE CASCADE,
  category build_category NOT NULL DEFAULT 'logistics',
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  status task_status NOT NULL DEFAULT 'pending',
  required_resources TEXT[] DEFAULT ARRAY[]::TEXT[],
  responsible_party TEXT,
  estimated_people INTEGER,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- BUILD RESOURCES - Supplies & materials tracking
-- =====================================================
CREATE TABLE build_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category build_category NOT NULL DEFAULT 'logistics',
  name TEXT NOT NULL,
  description TEXT,
  quantity TEXT,
  status build_resource_status NOT NULL DEFAULT 'have',
  priority TEXT,
  stage_needed build_stage_type,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- BUILD PROCEDURES - Step-by-step processes
-- =====================================================
CREATE TABLE build_procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category build_category NOT NULL DEFAULT 'logistics',
  title TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::JSONB,
  reference_links JSONB DEFAULT '[]'::JSONB,
  open_questions TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- BUILD QUESTIONS - Open questions & known pain points
-- =====================================================
CREATE TABLE build_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category build_category NOT NULL DEFAULT 'logistics',
  question TEXT NOT NULL,
  context TEXT,
  status build_question_status NOT NULL DEFAULT 'open',
  resolution TEXT,
  is_pain_point BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_build_stages_updated_at BEFORE UPDATE ON build_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_build_goals_updated_at BEFORE UPDATE ON build_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_build_resources_updated_at BEFORE UPDATE ON build_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_build_procedures_updated_at BEFORE UPDATE ON build_procedures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_build_questions_updated_at BEFORE UPDATE ON build_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE build_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON build_stages FOR SELECT USING (true);
CREATE POLICY "Public read access" ON build_goals FOR SELECT USING (true);
CREATE POLICY "Public read access" ON build_resources FOR SELECT USING (true);
CREATE POLICY "Public read access" ON build_procedures FOR SELECT USING (true);
CREATE POLICY "Public read access" ON build_questions FOR SELECT USING (true);

CREATE POLICY "Admin full access" ON build_stages FOR ALL USING (true);
CREATE POLICY "Admin full access" ON build_goals FOR ALL USING (true);
CREATE POLICY "Admin full access" ON build_resources FOR ALL USING (true);
CREATE POLICY "Admin full access" ON build_procedures FOR ALL USING (true);
CREATE POLICY "Admin full access" ON build_questions FOR ALL USING (true);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_build_goals_stage ON build_goals(stage_id);
CREATE INDEX idx_build_goals_category ON build_goals(category);
CREATE INDEX idx_build_goals_status ON build_goals(status);
CREATE INDEX idx_build_resources_status ON build_resources(status);
CREATE INDEX idx_build_questions_status ON build_questions(status);

-- =====================================================
-- SEED: STAGES
-- =====================================================
INSERT INTO build_stages (stage, title, description, date_label, crew_size, builder_notes, sort_order) VALUES
(
  'planning',
  'Planning & Reno Prep',
  'Pre-playa planning, site mapping, gear organization in Reno, and builder communication. Everything that happens before we hit the desert.',
  'Pre-Playa',
  'All builders',
  'Those who sign up for build need to be told what is expected and what it will be like. Review site map and familiarize yourself with immovable item placement—getting containers, water tower, and bike trailer positioned correctly is vital and not easy on a blank desert parcel.',
  0
),
(
  'monday',
  'Placement Day',
  'First boots on ground. Get placed, measure, position immovable items, and establish the camp footprint.',
  'Monday, Aug 24',
  '~3 people',
  'Bring water and food for at least two days with you. No services available yet. This is the foundation—getting placement right makes everything else possible.',
  1
),
(
  'tuesday',
  'Builder Arrival',
  'Main builder crew arrives. Establish basic infrastructure, shelter, and begin shade construction.',
  'Tuesday, Aug 25',
  '~20 people',
  'No food from Swing City yet—be prepared to eat without a microwave/stove/etc. Bring water for two days just in case. Builders should be able to have some free time and go for a walk. We should not have to work from waking to sleeping like last year.',
  2
),
(
  'wednesday',
  'Shade & Kitchen',
  'Continue shade structure, begin emptying containers, set up deli kitchen and community spaces.',
  'Wednesday, Aug 26',
  '~20 people',
  'Food starts today at lunch. Emptying containers is a big job—ideally packed so we can empty per stage and not everything at once. Everything that will blow away if windy needs to stay contained until needed.',
  3
),
(
  'thursday',
  'Systems & Comfort',
  'Finish kitchen, set up showers/sinks, prepare for Friday arrivals with power, water, and cooling.',
  'Thursday, Aug 27',
  '~20 people',
  NULL,
  4
),
(
  'friday',
  'Finishing & Arrivals',
  'Final touches, decoration, and welcoming the rest of camp. Transition from build mode to camp mode.',
  'Friday, Aug 28',
  'All camp',
  NULL,
  5
);

-- =====================================================
-- SEED: GOALS
-- =====================================================

-- Planning Stage Goals
INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, notes, sort_order)
SELECT s.id, 'layout', 'Site map with measurements',
  'Create site map with measurements, location of water tower, containers, and bicycle trailer. Print on paper and laminate.',
  1, ARRAY['Printer', 'Laminator', 'Measuring data from prior years'], 'Planning lead',
  'Getting the immovable items placed correctly is vital and not that easy on a blank desert parcel.', 0
FROM build_stages s WHERE s.stage = 'planning';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, notes, sort_order)
SELECT s.id, 'logistics', 'Distribute site map to Monday team',
  'Send laminated site map to Monday team in advance of getting to Reno so they can get familiar with it.',
  2, ARRAY['Laminated maps'], 'Planning lead',
  NULL, 1
FROM build_stages s WHERE s.stage = 'planning';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, notes, sort_order)
SELECT s.id, 'layout', 'Improve tent placement map',
  'Review and improve tent placement map from prior year. How can we do better?',
  3, ARRAY[]::TEXT[], 'Planning lead',
  NULL, 2
FROM build_stages s WHERE s.stage = 'planning';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, notes, sort_order)
SELECT s.id, 'logistics', 'Asynchronous planning discussion',
  'Set up and maintain shared documents for asynchronous discussion and planning.',
  3, ARRAY['Shared documents platform'], NULL,
  NULL, 3
FROM build_stages s WHERE s.stage = 'planning';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, notes, sort_order)
SELECT s.id, 'logistics', 'Builder expectation communication',
  'Communicate to all build week sign-ups what is expected and what the experience will be like.',
  2, ARRAY[]::TEXT[], 'Build lead',
  'People need to know this is hard physical work in extreme conditions.', 4
FROM build_stages s WHERE s.stage = 'planning';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, notes, sort_order)
SELECT s.id, 'logistics', 'Organize gear in Reno',
  'What is needed first should be in front. Backup/unneeded items at the back of container. Heavy wire spools, backup kitchen griddles, etc. should either stay in Reno or stay in back of container.',
  1, ARRAY[]::TEXT[], 'Container crew',
  'Solution needed for assembling tops of shade without drilling on the spot.', 5
FROM build_stages s WHERE s.stage = 'planning';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, notes, sort_order)
SELECT s.id, 'logistics', 'Prep builder-first-access gear',
  'Ensure builders have what is needed first readily accessible: measuring wheel, flags, shade poles, bungees, shade cloth, screws, ratchet straps, lag bolts, washers, trash cans, water pump, hose, power cables, breakout boxes, drills, batteries, chargers, military tent, carts/jack, scaffold.',
  1, ARRAY['Survey measuring wheel', 'Flags', 'Shade poles', 'Bungees', 'Shade cloth', 'Screws for poles', 'Ratchet straps', 'Lag bolts + washers (both sizes)', 'Trash can and bags', 'Pump for water tank', 'Hose for basic hookup', 'Power cables and breakout boxes', 'Drills + lag bolt bits + batteries + chargers', 'Military tent', 'Carts/Jack', 'Scaffold'], 'Container crew',
  'Builder gear on the right container, loaded in at the correct time as specified by NYC Container crew. Do NOT try to put all deli gear for all campers together—builders with builders, everyone else on when they arrive.', 6
FROM build_stages s WHERE s.stage = 'planning';

-- Monday Goals
INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'layout', 'Get placed by placement',
  'Arrive and get official placement from the Burning Man placement team.',
  1, ARRAY[]::TEXT[], 'Monday crew', 3,
  NULL, 0
FROM build_stages s WHERE s.stage = 'monday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'layout', 'Measure camp boundaries',
  'Use measuring wheel and ropes to establish camp boundaries and mark corners.',
  1, ARRAY['Survey measuring wheel', 'Pre-cut ropes at known lengths', 'Stakes/corners', 'Surveyors rope (marked with measurements)'], 'Monday crew', 3,
  'Set one corner, extend rope, check if straight, set next corner. All 4 corners marked, boundary mapped on playa. Use rope as boundary to measure and place everything per delivery order.', 1
FROM build_stages s WHERE s.stage = 'monday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Pike container drop',
  'Coordinate and position the Pike container delivery.',
  1, ARRAY[]::TEXT[], 'Monday crew', 3,
  'Getting containers in the correct position is vital to our success.', 2
FROM build_stages s WHERE s.stage = 'monday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Water tower positioning',
  'Position the water tower in its designated location per site map.',
  1, ARRAY['Site map'], 'Monday crew', 3,
  NULL, 3
FROM build_stages s WHERE s.stage = 'monday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'shelter', 'Initial shelter setup',
  'Set up personal tents/shelter OR setup the big military tent for group shelter.',
  2, ARRAY['Military tent', 'Personal tents'], 'Monday crew', 3,
  'Priority is safety above all else. Shelter is primary for builders—we have to have shelter for all available as close to arrival as possible.', 4
FROM build_stages s WHERE s.stage = 'monday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'layout', 'Flag layout of camp',
  'Place flags marking positions for camp structures per the site map.',
  2, ARRAY['Flags', 'Site map', 'Measuring wheel'], 'Monday crew', 3,
  NULL, 5
FROM build_stages s WHERE s.stage = 'monday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Test generator',
  'Start and test the generator. Check all fluids.',
  2, ARRAY['Generator', 'Extra fluids'], 'Monday crew', 1,
  'Generator might leak coolant in transit—bring extra of all fluids.', 6
FROM build_stages s WHERE s.stage = 'monday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Basic water access',
  'Get basic water hookup running if possible.',
  3, ARRAY['Pump for water tank', 'Hose'], 'Monday crew', 1,
  NULL, 7
FROM build_stages s WHERE s.stage = 'monday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Basic lighting',
  'Set up basic lighting for the camp area.',
  3, ARRAY['Power cables', 'Lights'], 'Monday crew', 1,
  NULL, 8
FROM build_stages s WHERE s.stage = 'monday';

-- Tuesday Goals
INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'layout', 'Continue flagging layout',
  'Continue flagging camp layout, including bike trailer placement.',
  1, ARRAY['Flags', 'Site map', 'Measuring wheel'], NULL, NULL,
  NULL, 0
FROM build_stages s WHERE s.stage = 'tuesday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Water basic hookup',
  'Complete water basic hookup if not done Monday.',
  1, ARRAY['Pump', 'Hose', 'Fittings'], NULL, 2,
  NULL, 1
FROM build_stages s WHERE s.stage = 'tuesday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Basic power setup',
  'Get basic power distribution running if not done Monday.',
  1, ARRAY['Power cables', 'Breakout boxes', 'Generator'], NULL, 2,
  NULL, 2
FROM build_stages s WHERE s.stage = 'tuesday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'logistics', 'Charge drill batteries',
  'Pull batteries for drills and get them charging.',
  2, ARRAY['Drill batteries', 'Battery chargers', 'Power'], NULL, 1,
  NULL, 3
FROM build_stages s WHERE s.stage = 'tuesday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'shelter', 'Military tent for shelter',
  'Set up military tent for immediate group shelter if not done Monday.',
  1, ARRAY['Military tent', 'Assembly instructions'], NULL, 4,
  'Need to determine which military tent we have and get assembly instructions in advance.', 4
FROM build_stages s WHERE s.stage = 'tuesday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'logistics', 'Fetch builder gear from container',
  'Go to container and retrieve builder gear and tools.',
  1, ARRAY['Cart/transport'], NULL, 3,
  NULL, 5
FROM build_stages s WHERE s.stage = 'tuesday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'shelter', 'Shade for builder tents',
  'Put up shade structure over builder tent area first.',
  1, ARRAY['Shade poles', 'Shade cloth', 'Bungees', 'Screws', 'Ratchet straps', 'Lag bolts', 'Washers', 'Drills'], NULL, 6,
  'This should be the first wall built. Flag/rope out first wall location.', 6
FROM build_stages s WHERE s.stage = 'tuesday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'personal', 'Setup personal tents',
  'Set up personal tents, ideally where they will live for the event.',
  2, ARRAY['Personal tents'], NULL, NULL,
  NULL, 7
FROM build_stages s WHERE s.stage = 'tuesday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Distribute power/water to hub camps',
  'Run power and water to hub camps. They have to help with their portion.',
  2, ARRAY['Power cables', 'Hoses', 'Fittings'], NULL, 3,
  'Hub camps must participate in their own hookups.', 8
FROM build_stages s WHERE s.stage = 'tuesday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'kitchen', 'Basic kitchen setup',
  'Set up a basic kitchen for builder meals.',
  2, ARRAY['Backup propane', 'Basic cooking gear', 'Water'], NULL, 2,
  NULL, 9
FROM build_stages s WHERE s.stage = 'tuesday';

-- Wednesday Goals
INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'shelter', 'Continue shade structure',
  'Continue building out the shade structure beyond builder tents.',
  1, ARRAY['Shade poles', 'Shade cloth', 'Ratchet straps', 'Climbing hangers', 'Drills', 'Scaffold'], NULL, 8,
  NULL, 0
FROM build_stages s WHERE s.stage = 'wednesday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'decoration', 'Setup camp chill tent',
  'Assemble and position the camp community chill tent.',
  2, ARRAY['Chill tent', 'Furniture'], NULL, 4,
  NULL, 1
FROM build_stages s WHERE s.stage = 'wednesday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'logistics', 'Empty containers (staged)',
  'Empty containers according to the staged plan. Do NOT empty everything at once—items will blow away in wind.',
  1, ARRAY['Carts', 'Tarps for wind protection'], NULL, 6,
  'Ideally we will have packed containers so we can empty per stage. Emptying everything is problematic—we basically got lucky last year that every pillow was not blown to the trash fence.', 2
FROM build_stages s WHERE s.stage = 'wednesday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'kitchen', 'Setup deli kitchen',
  'Full setup of the NYC Deli kitchen area.',
  1, ARRAY['Kitchen equipment', 'Counters', 'Power', 'Water'], NULL, 4,
  NULL, 3
FROM build_stages s WHERE s.stage = 'wednesday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'decoration', 'Setup public chill tent',
  'Set up the public-facing chill/hang tent.',
  2, ARRAY['Tent', 'Furniture', 'Decor'], NULL, 3,
  NULL, 4
FROM build_stages s WHERE s.stage = 'wednesday';

-- Thursday Goals
INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'kitchen', 'Finish deli & camp kitchen',
  'Complete setup of both deli kitchen and camp kitchen.',
  1, ARRAY['Remaining kitchen gear', 'Power', 'Water'], NULL, 4,
  NULL, 0
FROM build_stages s WHERE s.stage = 'thursday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'decoration', 'Decorate chill tents',
  'Decorate both camp and public chill tents.',
  3, ARRAY['Decor', 'Lights', 'Art'], NULL, 3,
  NULL, 1
FROM build_stages s WHERE s.stage = 'thursday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Setup shower',
  'Install and connect the camp shower.',
  1, ARRAY['Shower structure', 'Water hookup', 'Grey water containment'], NULL, 2,
  NULL, 2
FROM build_stages s WHERE s.stage = 'thursday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Setup sinks',
  'Install camp sinks with water connections.',
  1, ARRAY['Sinks', 'Plumbing', 'Grey water containment'], NULL, 2,
  NULL, 3
FROM build_stages s WHERE s.stage = 'thursday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'layout', 'Mark tent placement for arrivals',
  'Mark and flag tent placement spots for campers arriving Friday.',
  2, ARRAY['Flags', 'Site map', 'Measuring tools'], NULL, 2,
  NULL, 4
FROM build_stages s WHERE s.stage = 'thursday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Fly power to tents',
  'Run power cables to individual tent areas (flown along shade structure).',
  2, ARRAY['Power cables', 'Cable ties', 'Breakout boxes'], NULL, 3,
  'Open question: do we incorporate flying power cords along with putting up shade, or do it after?', 5
FROM build_stages s WHERE s.stage = 'thursday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Water for chill tents',
  'Run water to community/chill tent areas.',
  2, ARRAY['Hoses', 'Fittings'], NULL, 2,
  NULL, 6
FROM build_stages s WHERE s.stage = 'thursday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Ice machines',
  'Set up and power on ice machines.',
  2, ARRAY['Ice machines', 'Power', 'Water'], NULL, 1,
  NULL, 7
FROM build_stages s WHERE s.stage = 'thursday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'infrastructure', 'Swamp coolers',
  'Set up and activate swamp coolers for tent areas.',
  2, ARRAY['Swamp coolers', 'Power', 'Water'], NULL, 2,
  NULL, 8
FROM build_stages s WHERE s.stage = 'thursday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'shelter', 'Side shade',
  'Add side shade panels to shade structure.',
  3, ARRAY['Side shade panels', 'Attachment hardware'], NULL, 3,
  NULL, 9
FROM build_stages s WHERE s.stage = 'thursday';

-- Friday Goals
INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'decoration', 'Finishing touches',
  'Final decoration and beautification of camp spaces.',
  2, ARRAY['Decor', 'Lights'], NULL, NULL,
  NULL, 0
FROM build_stages s WHERE s.stage = 'friday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'shelter', 'Roof deck',
  'Set up the roof deck area.',
  2, ARRAY['Roof deck materials'], NULL, 4,
  NULL, 1
FROM build_stages s WHERE s.stage = 'friday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'decoration', 'Polaroid welcome wall',
  'Take polaroid on arrival of each camper, put on wall in chill tent.',
  3, ARRAY['Polaroid camera', 'Film', 'Wall/display surface'], NULL, 1,
  NULL, 2
FROM build_stages s WHERE s.stage = 'friday';

INSERT INTO build_goals (stage_id, category, title, description, priority, required_resources, responsible_party, estimated_people, notes, sort_order)
SELECT s.id, 'logistics', 'Arrivers organize container stuff',
  'New arrivals help organize and fetch their gear from containers.',
  2, ARRAY['Carts'], 'Arriving campers', NULL,
  NULL, 3
FROM build_stages s WHERE s.stage = 'friday';

-- =====================================================
-- SEED: RESOURCES
-- =====================================================

-- Items we HAVE
INSERT INTO build_resources (category, name, description, quantity, status, priority, stage_needed, notes, sort_order) VALUES
('layout', 'Survey measuring wheel', 'For measuring camp boundaries and placement distances', '1', 'have', 'critical', 'monday', NULL, 0),
('layout', 'Flags', 'For marking positions of structures and tents', 'Lots', 'have', 'critical', 'monday', NULL, 1),
('shelter', 'Shade poles', 'Vertical and horizontal poles for shade structure', NULL, 'have', 'critical', 'tuesday', NULL, 2),
('shelter', 'Bungees', 'For attaching shade cloth to poles', NULL, 'have', 'critical', 'tuesday', NULL, 3),
('shelter', 'Shade cloth', 'Shade fabric for the structure', NULL, 'have', 'critical', 'tuesday', NULL, 4),
('shelter', 'Screws for poles', 'Set screws for shade pole connections', NULL, 'have', 'critical', 'tuesday', NULL, 5),
('shelter', 'Ratchet straps', 'For vertical, horizontal, and diagonal shade bracing', NULL, 'have', 'critical', 'tuesday', 'Vertical (1-2 twists for wind), horizontal along top, diagonal V-shape between verticals', 6),
('shelter', 'Lag bolts + washers', 'Both sizes of washers for anchoring', NULL, 'have', 'critical', 'tuesday', 'Too much time spent finding the right washers last year', 7),
('logistics', 'Trash can and bags', 'Camp trash management', NULL, 'have', 'important', 'monday', NULL, 8),
('infrastructure', 'Pump for water tank', 'Water distribution pump', '1', 'have', 'critical', 'monday', NULL, 9),
('infrastructure', 'Hose for basic hookup', 'Initial water hookup hose', NULL, 'have', 'critical', 'monday', NULL, 10),
('infrastructure', 'Power cables and breakout boxes', 'For basic power distribution', NULL, 'have', 'critical', 'monday', NULL, 11),
('logistics', 'Drills + lag bolt bits', 'Cordless drills with appropriate bits', NULL, 'have', 'critical', 'tuesday', NULL, 12),
('logistics', 'Drill batteries + chargers', 'Spare batteries and charging stations', NULL, 'have', 'critical', 'tuesday', NULL, 13),
('shelter', 'Military tent', 'Large group shelter tent', '1', 'have', 'critical', 'monday', 'Need to identify which tent we have and get assembly instructions in advance', 14),
('logistics', 'Carts/Jack', 'For moving heavy items around camp', NULL, 'have', 'important', 'tuesday', NULL, 15),
('logistics', 'Scaffold', 'For elevated shade structure work', NULL, 'have', 'important', 'tuesday', NULL, 16),
('shelter', 'Pre-cut ropes at known lengths', 'Ropes cut to camp boundary dimensions for measurement', NULL, 'have', 'critical', 'monday', 'Camp is a rectangle—cut visible rope in known lengths. Consider surveyors rope with measurements.', 17),
('layout', 'Stakes/corner markers', 'For setting camp boundary corners', NULL, 'have', 'critical', 'monday', NULL, 18);

-- Items we NEED
INSERT INTO build_resources (category, name, description, quantity, status, priority, stage_needed, notes, sort_order) VALUES
('shelter', 'Small + large washers for lag bolts', 'Too much time spent finding the right washers last year—need more of both sizes', 'Lots', 'need', 'critical', 'tuesday', 'OR use climbing hangers instead of washers?', 20),
('shelter', 'Climbing hangers', 'Can serve as washers AND as connectors for ratchet straps—reduces need for straps that take up interior shade space', NULL, 'need', 'important', 'tuesday', 'Alternative to washers. Also useful for guy line anchors.', 21),
('kitchen', 'Electric kettle', 'To boil water for coffee/tea/dehydrated meals', '1', 'need', 'important', 'tuesday', NULL, 22),
('kitchen', 'Backup propane', 'For basic cooking before electric setup on Monday/early Tuesday', NULL, 'need', 'important', 'monday', NULL, 23),
('logistics', 'Trash bags that fit the trash cans', 'Last year''s bags didn''t fit properly', NULL, 'need', 'important', 'monday', NULL, 24),
('shelter', 'Chains OR tie down anchors', 'For shade structure guy lines—cheaper alternative to climbing hangers?', NULL, 'need', 'important', 'tuesday', 'Evaluate: climbing hangers vs chains vs tie down anchors for cost and effectiveness', 25),
('shelter', 'Zinc lubricant', 'For threads on connectors for shade structure—prevents seizing', NULL, 'need', 'important', 'tuesday', NULL, 26),
('logistics', 'Construction stilts (40 inches)', 'For elevated shade work instead of scaffold in some areas', '1 pair', 'need', 'nice to have', 'tuesday', NULL, 27),
('decoration', 'Folding bench for chill tent', 'Sit to take off and put on shoes at entrance', '1', 'need', 'nice to have', 'wednesday', NULL, 28),
('infrastructure', 'Extra generator fluids', 'Generator might leak coolant in transit—bring extra of all fluids', NULL, 'need', 'critical', 'monday', 'Known pain point from prior year', 29);

-- Items to DISCARD
INSERT INTO build_resources (category, name, description, quantity, status, priority, stage_needed, notes, sort_order) VALUES
('logistics', 'Broken/unused gear', 'Throw away or don''t bring broken items or stuff we will never need or use', NULL, 'discard', 'important', NULL, 'Audit all gear in Reno and remove deadweight', 30);

-- =====================================================
-- SEED: PROCEDURES
-- =====================================================

INSERT INTO build_procedures (category, title, description, steps, reference_links, open_questions, notes, sort_order) VALUES
(
  'layout',
  'Measuring and Laying Out Camp',
  'How to establish the camp footprint on the playa using ropes and stakes.',
  '[
    {"order": 1, "text": "Pre-playa: Determine camp rectangle dimensions (length of all sides)", "notes": null},
    {"order": 2, "text": "Cut a visible rope in the known lengths and bring to playa", "notes": "Consider surveyors rope which is marked with measurements"},
    {"order": 3, "text": "Bring stakes or similar to set corners and connect ropes with tension", "notes": null},
    {"order": 4, "text": "Set one corner stake on playa", "notes": null},
    {"order": 5, "text": "Extend rope from first corner, check if straight, set next corner", "notes": null},
    {"order": 6, "text": "Repeat until all 4 corners are marked and boundary is mapped", "notes": null},
    {"order": 7, "text": "Use the rope boundary to measure and place immovable items in delivery order", "notes": "4 containers, water tower, dumpster, porto, bike trailer"},
    {"order": 8, "text": "Measure and place flags for structures to build", "notes": "Shade structure first, then private tent, community tent, bike parking"},
    {"order": 9, "text": "Flag/rope out first wall to be built (should be shade for builder tents)", "notes": null}
  ]'::JSONB,
  '[]'::JSONB,
  ARRAY['Could use surveyors rope—is it worth the cost?'],
  'Getting the containers, bike trailer, and water tower in the correct position is vital to success. Immovable items in order: containers, water tower, dumpster, porto, bike trailer.',
  0
),
(
  'shelter',
  'Putting Up Shade Structure',
  'Assembly process for the 20×20 cube shade structure using poles, connectors, ratchet straps, and shade cloth.',
  '[
    {"order": 1, "text": "Layout all poles and the correct connectors for the section being built", "notes": null},
    {"order": 2, "text": "For each vertical pole: layout 1 footer, 1 ratchet strap, 1×14 lag bolt, 1× climbing hanger", "notes": null},
    {"order": 3, "text": "For each horizontal pole: layout 2 ratchet straps (one for along top pole, one for diagonal between verticals)", "notes": null},
    {"order": 4, "text": "Layout appropriate top connectors", "notes": null},
    {"order": 5, "text": "Assemble road-facing walls: three vertical poles and two horizontal", "notes": null},
    {"order": 6, "text": "Orient top connectors correctly—you should be able to see through the connection to the top horizontal poles", "notes": null},
    {"order": 7, "text": "Screw all eyelet connectors tight", "notes": null},
    {"order": 8, "text": "Assemble side walls: two vertical poles and two horizontal poles", "notes": null},
    {"order": 9, "text": "Attach shade cloth", "notes": "Open question: rope vs bungees for attachment?"},
    {"order": 10, "text": "Add ratchet strap bracing: vertical for each pole (1-2 twists for wind), horizontal for each top pole, diagonal V-shape between verticals", "notes": null},
    {"order": 11, "text": "Add climbing hangers as washers and ratchet strap connectors", "notes": "Reduces need for straps that take up interior shade space"},
    {"order": 12, "text": "Add guy lines on outside walls", "notes": "Double lag bolts tied together for guy lines?"}
  ]'::JSONB,
  '[
    {"title": "FutureTurtles Guide to Burning Man Shade Structures", "url": "https://futureturtles.com/2026/Guide%20to%20Burning%20Man%20Shade%20Structures.pdf"},
    {"title": "Disorient Square Shade Wiki", "url": "https://wiki.disorient.info/index.php?title=Square_Shade"},
    {"title": "Shade Structure Reference Doc", "url": "https://drive.google.com/file/d/1GtVs5iSAB_tdMWwS3UolpK_n6gilbq5I/view"},
    {"title": "Black Rock Hardware Instructions", "url": "https://formandreform.com/blackrock-hardware/instructions/"}
  ]'::JSONB,
  ARRAY[
    'Will plan to have no interior guy lines be viable and structurally sound?',
    'How feasible is it to use rope instead of bungees for shade cloth roof? Rope distributes pull on eyelets better and once adjusted might be easier/faster to put up and take down.',
    'Can we assemble top first, attach shade, then lift up long side and insert vertical poles? Would be much faster but only work for first row of cubes.',
    'How can we prep shade poles so no custom drilling required for assembly? Paint mark compatible poles? Drill on Reno visit? Or is screwing down set screws + ratchet strapping good enough?',
    'Consider ratchet strapping horizontally across the top?'
  ],
  'Shade frame is put up in 20×20 cubes, with two pole lengths per side. Changes from last year: vertical ratchet strap per pole, horizontal per top pole, diagonal between verticals, climbing hangers as washers and connectors.',
  1
),
(
  'logistics',
  'Container Load-In Plan',
  'How to organize and load the containers in Reno for efficient unloading on playa.',
  '[
    {"order": 1, "text": "What is needed first should be in front of the container", "notes": null},
    {"order": 2, "text": "Backup and unneeded items at the back—heavy wire spools, backup kitchen griddles, etc. should stay in Reno or stay in back of container permanently", "notes": null},
    {"order": 3, "text": "Builder gear goes on the right container", "notes": null},
    {"order": 4, "text": "Load builder gear at the correct time for Monday/Tuesday arrival as specified by NYC Container crew", "notes": null},
    {"order": 5, "text": "Do NOT mix all deli gear together—builders with builders, everyone else loaded for when they arrive", "notes": null},
    {"order": 6, "text": "Pack containers so we can empty per stage, not all at once", "notes": "Emptying everything is problematic because things blow away in wind"},
    {"order": 7, "text": "Audit and remove broken or no-longer-needed items before loading", "notes": null}
  ]'::JSONB,
  '[]'::JSONB,
  ARRAY[]::TEXT[],
  'Items that blow away need to stay contained until the stage where they are needed. We got lucky last year that pillows did not blow to the trash fence.',
  2
);

-- =====================================================
-- SEED: QUESTIONS & PAIN POINTS
-- =====================================================

-- Open Questions
INSERT INTO build_questions (category, question, context, status, is_pain_point, sort_order) VALUES
('shelter', 'Which military tent do we have?', 'Need to get assembly instructions in advance of playa.', 'open', false, 0),
('shelter', 'Which circus tent do we have?', 'Need specs and setup plan.', 'open', false, 1),
('shelter', 'How can we prep shade poles so no custom drilling required for assembly?', 'Paint mark compatible poles? Drill on Reno visit? Or is screwing down set screws + ratchet strapping good enough?', 'open', false, 2),
('logistics', 'What day can other camps pick up bikes?', 'Last year this wound up being work for us mostly—unloading and sorting all the bikes and interfacing for pickups. Need a plan for earliest pick up, who is coming to help unload, at what time. It is a lot of work and a lot of bikes.', 'open', false, 3),
('infrastructure', 'Do we incorporate flying power cords along with putting up shade? Or do it post?', 'Running power along the shade structure during assembly might be more efficient, but adds complexity to an already complex process.', 'open', false, 4),
('logistics', 'Do we want to add recycling cans to Deli?', 'We could at least separate recyclables. Might have volunteers to take to recycling camp.', 'open', false, 5),
('shelter', 'Can we assemble shade tops first, then lift and insert vertical poles?', 'Per FutureTurtles PDF this could work and be much faster, but may only work for first row of cubes.', 'open', false, 6),
('shelter', 'Rope vs bungees for shade cloth attachment?', 'Rope distributes pull on eyelets better and once adjusted might be easier/faster to put up and take down.', 'open', false, 7),
('shelter', 'Will plan for no interior guy lines be structurally sound?', 'Climbing hangers as connectors for ratchet straps would reduce need for straps that take up interior shade space.', 'open', false, 8);

-- Known Pain Points
INSERT INTO build_questions (category, question, context, status, is_pain_point, sort_order) VALUES
('layout', 'Tent positioning consistently needed better planning in advance', 'This comes up every year. Need a more rigorous pre-playa mapping process.', 'open', true, 10),
('layout', 'Getting containers, bike trailer, and water tower in correct position is vital', 'These immovable items define the rest of the camp layout. Mistakes here cascade.', 'open', true, 11),
('logistics', 'Finding things/looking for things takes massive amounts of time from building', 'Tool and gear organization is critical. Everything needs a known location.', 'open', true, 12),
('logistics', 'Tool organization/placement after use', 'Tools not being returned to designated areas causes delays and frustration.', 'open', true, 13),
('infrastructure', 'Generator might leak coolant in transit', 'Bring extra of all fluids for generator as a precaution.', 'open', true, 14),
('logistics', 'Better communication about grey water conservation', 'Need to improve awareness and consideration around grey water usage.', 'open', true, 15);
