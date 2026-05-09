-- =====================================================
-- Migration 055: Build Week Meeting Agendas
-- =====================================================
-- Adds a structured 5-meeting agenda system for the build
-- team, with linkable resource URLs per section and shared
-- collaborative notes that persist as the team walks through
-- each meeting.
-- =====================================================

-- ── Meetings ──
CREATE TABLE IF NOT EXISTS build_meetings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  number        int  NOT NULL,
  month_label   text NOT NULL,
  title         text NOT NULL,
  subtitle      text NOT NULL,
  primary_goal  text,
  sort_order    int  NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_build_meetings_sort ON build_meetings (sort_order);

-- ── Sections (numbered agenda items + decisions blocks) ──
CREATE TABLE IF NOT EXISTS build_meeting_sections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      uuid NOT NULL REFERENCES build_meetings(id) ON DELETE CASCADE,
  sort_order      int  NOT NULL,
  number          int,
  kind            text NOT NULL DEFAULT 'section',  -- 'section' | 'decisions'
  title           text NOT NULL,
  body_md         text,
  resource_links  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_build_meeting_sections_meeting
  ON build_meeting_sections (meeting_id, sort_order);

-- ── Shared notes (per meeting, optionally per section) ──
CREATE TABLE IF NOT EXISTS build_meeting_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   uuid NOT NULL REFERENCES build_meetings(id) ON DELETE CASCADE,
  section_id   uuid REFERENCES build_meeting_sections(id) ON DELETE CASCADE,
  content      text NOT NULL DEFAULT '',
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS build_meeting_notes_section_unique
  ON build_meeting_notes (meeting_id, section_id) WHERE section_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS build_meeting_notes_general_unique
  ON build_meeting_notes (meeting_id) WHERE section_id IS NULL;

-- ── RLS ──
ALTER TABLE build_meetings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_meeting_sections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_meeting_notes     ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user
CREATE POLICY "build_meetings_select"
  ON build_meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "build_meeting_sections_select"
  ON build_meeting_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "build_meeting_notes_select"
  ON build_meeting_notes FOR SELECT TO authenticated USING (true);

-- Write meetings & sections: admins/builders only
CREATE POLICY "build_meetings_write"
  ON build_meetings FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin','builder')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin','builder')
  ));

CREATE POLICY "build_meeting_sections_write"
  ON build_meeting_sections FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin','builder')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin','builder')
  ));

-- Notes: any authenticated build-team member can write
CREATE POLICY "build_meeting_notes_write"
  ON build_meeting_notes FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin','builder')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin','builder')
  ));

-- =====================================================
-- Seed: 5 meetings + sections
-- =====================================================
INSERT INTO build_meetings (slug, number, month_label, title, subtitle, primary_goal, sort_order) VALUES
  ('meeting-1', 1, 'May',
   'Build Week 101: What You''re Walking Into',
   'Expectations, personal logistics, travel basics, and how to prepare yourself.',
   'Get everyone oriented, comfortable, and clear on what build week actually is. This meeting should be mostly about personal prep, travel logistics, expectations, and how builders should prepare themselves.',
   1),
  ('meeting-2', 2, 'June',
   'From Blank Desert to Camp: Understanding the Site Plan',
   'Camp layout, placement, measuring, flagging, and why immovable items matter.',
   'Make sure the team understands the physical layout of camp and why placement accuracy matters.',
   2),
  ('meeting-3', 3, 'July',
   'The Big Systems: Shade, Power, Water & Kitchen',
   'How the physical camp gets built and what systems must come online first.',
   'Move from general planning into practical build systems and identify what needs to be prepped before playa.',
   3),
  ('meeting-4', 4, 'August',
   'Locking the Build: Inventory, Vehicles, Supplies & Crews',
   'Final prep before playa — who brings what, what''s missing, and who owns each workstream.',
   'Lock the plan and assign responsibilities before build week begins.',
   4),
  ('meeting-5', 5, 'Final All-Hands Before Departure',
   'Boots on Playa: The Final Build Week Walkthrough',
   'Day-by-day schedule, safety briefing, arrival plan, and final assignments.',
   'Everyone leaves knowing exactly when they arrive, where they go, what they are responsible for, and what the build sequence is.',
   5)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- Sections — Meeting 1
-- =====================================================
INSERT INTO build_meeting_sections (meeting_id, sort_order, number, kind, title, body_md, resource_links)
SELECT m.id, x.sort_order, x.number, x.kind, x.title, x.body_md, x.resource_links::jsonb
FROM build_meetings m, (VALUES
  (10, 1, 'section', 'Welcome to Build Week',
   E'- Quick intro from Marc / Aaron\n- What build week is and why it matters\n- Build week is not just "camp setup" — it is the foundation for the entire camp experience\n- Safety, shelter, water, and calm execution come first',
   '[]'),
  (20, 2, 'section', 'Builder Introductions',
   E'Each person shares:\n- Name\n- Build / construction / playa experience\n- One thing they are excited about\n- One thing they are nervous about',
   '[{"label":"Build Roster","href":"/build-week"},{"label":"Camper Directory","href":"/campers"}]'),
  (30, 3, 'section', 'High-Level Build Week Overview',
   E'Explain the rough arc:\n- Pre-playa: planning, maps, inventory, Reno organization\n- Sunday / Monday: arrivals, Fernley houses, vehicle prep, survey team, placement, camp layout\n- Tuesday: full builder arrival, shade, personal tents, basic systems\n- Wednesday: kitchen, chill tents, staged container unloading, Swing City food begins\n- Thursday: showers, sinks, grey water, power, swamp coolers, tent placement\n- Friday: final touches, signage, safety walkthrough, transition to camp mode',
   '[{"label":"Full Build Schedule","href":"/build-week"}]'),
  (40, 4, 'section', 'Travel & Arrival Expectations',
   E'- Strong preference for early Reno arrivals\n- Fernley houses are booked Sunday 8/23 at 4 PM through Tuesday 8/25 at 10 AM\n- Goal is to cluster flights so the 15-passenger van can shuttle groups from RNO to Fernley\n- All builders should be in the build houses by Monday night\n- Build Sunday is now part of the plan, not just Monday',
   '[{"label":"Builder Arrival Info","href":"/build-week"}]'),
  (50, 5, 'section', 'Personal Logistics: What Each Builder Needs to Handle',
   E'Cover expectations for:\n- Flights\n- Tickets\n- RNO pickup needs\n- Personal camping gear\n- Water and food for early build\n- Personal shade / tent readiness\n- Dust protection\n- Gloves, headlamp, work clothes, eye protection\n- Being prepared for limited food, water, power, and comfort early in the week',
   '[{"label":"Personal Profile / Packing","href":"/profile"},{"label":"Resources & Guides","href":"/resources"}]'),
  (60, 6, 'section', 'Food Reality Check',
   E'Important message:\n- Camp feeds builders, but early build is basic\n- Sunday through Wednesday morning is mostly Fernley takeout, house breakfasts, coolers, snacks, and builder-prepped food\n- Swing City catering starts Wednesday PM and runs through Friday night\n- Tuesday builders should not expect a functioning camp kitchen yet',
   '[{"label":"Kitchen Plan","href":"/kitchen"}]'),
  (70, 7, 'section', 'Expectations Around Work Pace',
   E'Set the tone:\n- We will work hard, but the goal is not to grind people from waking to sleeping\n- Shelter and safety come first\n- Weather may interrupt work\n- Builders should have some free time if the plan is executed well\n- Communication and tool discipline matter',
   '[]'),
  (80, 8, 'section', 'What Happens Before the Next Meeting',
   E'Assignments:\n- Complete flight / availability poll\n- Confirm who can arrive Sunday vs Monday\n- Confirm who needs RNO pickup\n- Confirm builder headcount\n- Share any dietary needs\n- Begin personal packing checklist',
   '[{"label":"Update Your Profile","href":"/profile"}]'),
  (90, NULL, 'decisions', 'Decisions Needed by End of Meeting',
   E'- Who is likely arriving Sunday\n- Who is likely arriving Monday\n- Who needs Reno pickup\n- Who has unusual travel constraints\n- Who has build experience that may affect team assignments',
   '[]')
) AS x(sort_order, number, kind, title, body_md, resource_links)
WHERE m.slug = 'meeting-1'
ON CONFLICT DO NOTHING;

-- =====================================================
-- Sections — Meeting 2
-- =====================================================
INSERT INTO build_meeting_sections (meeting_id, sort_order, number, kind, title, body_md, resource_links)
SELECT m.id, x.sort_order, x.number, x.kind, x.title, x.body_md, x.resource_links::jsonb
FROM build_meetings m, (VALUES
  (10, 1, 'section', 'Review Site Map',
   E'Cover:\n- Camp rectangle dimensions\n- Location of containers\n- Water tower\n- Bike trailer\n- Dumpster\n- Portos\n- Shade structures\n- Private tent areas\n- Community tent\n- Public chill area\n\nThe planning notes emphasize that the site map should include measurements, water tower, containers, and bike trailer, and should be printed / laminated for playa use.',
   '[{"label":"Layout Editor","href":"/layout"},{"label":"2D Camp Map","href":"/map"},{"label":"3D Layout View","href":"/layout-view"}]'),
  (20, 2, 'section', 'Why Layout Matters',
   E'Explain:\n- Getting the containers, bike trailer, and water tower placed correctly is vital\n- Errors in immovable item placement cascade into the rest of the build\n- A blank desert parcel is harder to work with than people expect\n- The Monday / survey team needs to know the map before arriving',
   '[]'),
  (30, 3, 'section', 'Measuring & Flagging Process',
   E'Walk through:\n- Setting the first corner\n- Using rope / surveyors tape / measuring wheel\n- Marking all four corners\n- Flagging immovable items first\n- Then flagging shade, tents, kitchen, chill areas, and bike zones',
   '[{"label":"Layout Editor","href":"/layout"}]'),
  (40, 4, 'section', 'Sunday / Monday Survey Team',
   E'Cover:\n- Who is on the survey team\n- Who stays in Fernley for vehicle prep and shopping\n- What the survey team must complete before Monday deliveries\n- What tools they need: measuring wheel, flags, ropes, stakes, laminated site map',
   '[{"label":"Build Roster","href":"/build-week"},{"label":"Inventory","href":"/build-week"}]'),
  (50, 5, 'section', 'Tent Placement Improvements',
   E'Discuss:\n- How to improve the tent placement map\n- How to avoid moving tents after setup\n- Whether builder tents can be placed under permanent shade early\n- How to mark arriving camper spots for Friday / Saturday',
   '[{"label":"Camp Spot Selection","href":"/camp-selection"},{"label":"3D Layout View","href":"/layout-view"}]'),
  (60, 6, 'section', 'Open Questions',
   E'- Do we have final camp dimensions?\n- Do we have final placement orientation?\n- Do we have final tent counts?\n- Do we know where hub camps need water / power?\n- When can other camps pick up bikes?',
   '[]'),
  (70, NULL, 'decisions', 'Decisions Needed by End of Meeting',
   E'- Confirm survey team\n- Confirm map owner\n- Confirm site map revision deadline\n- Confirm what gets printed / laminated\n- Confirm first items to flag on playa',
   '[]')
) AS x(sort_order, number, kind, title, body_md, resource_links)
WHERE m.slug = 'meeting-2'
ON CONFLICT DO NOTHING;

-- =====================================================
-- Sections — Meeting 3
-- =====================================================
INSERT INTO build_meeting_sections (meeting_id, sort_order, number, kind, title, body_md, resource_links)
SELECT m.id, x.sort_order, x.number, x.kind, x.title, x.body_md, x.resource_links::jsonb
FROM build_meetings m, (VALUES
  (10, 1, 'section', 'Shade Structure Plan',
   E'Cover:\n- 30x50 shade sections\n- Builder tent shade is first priority\n- Shade over community areas comes next\n- Shade structure sequence: layout poles, connectors, vertical poles, horizontal poles, ratchet straps, shade cloth\n- Discuss whether tops can be assembled without drilling on playa\n- Discuss whether poles can be pre-marked or pre-drilled during Reno prep\n\nThe notes specifically call out shade structure questions around pre-drilling, compatible poles, ratchet strapping, and reducing on-playa custom work.',
   '[{"label":"Shade Guide","href":"/build-week"},{"label":"Inventory","href":"/build-week"}]'),
  (20, 2, 'section', 'Shade Open Questions',
   E'Discuss:\n- Do we need holes or can set screws + ratchet straps work?\n- Do we use climbing hangers instead of washers?\n- Do we use rope, bungees, or both for shade cloth?\n- Can we avoid interior guy lines safely?\n- Do we fly power cords while shade goes up or after?',
   '[]'),
  (30, 3, 'section', 'Power Plan',
   E'Cover:\n- Generator testing\n- Extra generator fluids\n- Basic power hookup\n- Breakout boxes\n- Charging drill batteries\n- Power distribution to hub camps\n- Flying power to individual tent areas\n\nKnown issue: generator may leak coolant in transit, so extra fluids should be brought.',
   '[{"label":"Electrical Load Calculator","href":"/build-week"}]'),
  (40, 4, 'section', 'Water / Plumbing Plan',
   E'Cover:\n- Water tower placement\n- Pump\n- Initial hose hookup\n- Drinking water access\n- Water to chill tents\n- Shower\n- Sinks\n- Grey water system\n- Conservation expectations',
   '[{"label":"Layout Editor","href":"/layout"}]'),
  (50, 5, 'section', 'Kitchen Plan',
   E'Cover:\n- Basic kitchen Tuesday\n- Full deli kitchen Wednesday\n- Swing City catering Wednesday PM through Friday\n- Propane backup\n- Electric kettle\n- Early food limitations',
   '[{"label":"Kitchen","href":"/kitchen"}]'),
  (60, 6, 'section', 'Container Strategy',
   E'Cover:\n- Do not unload everything at once\n- Pull items by stage and need\n- Keep things that are not needed in the back / container\n- Builder-first gear needs to be accessible\n- Wind risk: pillows, light objects, loose items\n\nThe notes specifically identify staged unloading as a major improvement because emptying everything wastes time and creates wind risk.',
   '[{"label":"Inventory","href":"/build-week"}]'),
  (70, NULL, 'decisions', 'Decisions Needed by End of Meeting',
   E'- Final shade build method\n- Final list of shade supplies still needed\n- Power team lead\n- Water / plumbing team lead\n- Kitchen setup lead\n- Container unloading system',
   '[]')
) AS x(sort_order, number, kind, title, body_md, resource_links)
WHERE m.slug = 'meeting-3'
ON CONFLICT DO NOTHING;

-- =====================================================
-- Sections — Meeting 4
-- =====================================================
INSERT INTO build_meeting_sections (meeting_id, sort_order, number, kind, title, body_md, resource_links)
SELECT m.id, x.sort_order, x.number, x.kind, x.title, x.body_md, x.resource_links::jsonb
FROM build_meetings m, (VALUES
  (10, 1, 'section', 'Reno Inventory / Organization',
   E'Cover:\n- What needs to be verified in Reno\n- What should be cleaned, thrown away, or left behind\n- What needs to be placed first-access in containers\n- What belongs in builder bins\n- What should stay deep in storage\n\nThe planning notes emphasize that gear needed first should be in front, while backups and rarely needed items should stay in the back or in storage.',
   '[{"label":"Inventory","href":"/build-week"}]'),
  (20, 2, 'section', 'First-Access Builder Gear',
   E'Confirm the early-access list:\n- Survey measuring wheel\n- Flags\n- Shade poles\n- Bungees / shade cloth\n- Ratchet straps\n- Lag bolts\n- Washers / climbing hangers\n- Trash cans and bags\n- Pump\n- Hose\n- Power cables\n- Breakout boxes\n- Drills\n- Batteries\n- Chargers\n- Military tent\n- Carts / jack\n- Scaffold',
   '[{"label":"Inventory","href":"/build-week"}]'),
  (30, 3, 'section', 'Supply Gaps / Purchasing',
   E'Review:\n- Washers or climbing hangers\n- Trash bags that fit cans\n- Zinc lubricant\n- Propane backup\n- Electric kettle\n- Generator fluids\n- Tie-down anchors / chains / climbing hangers\n- Any missing shade hardware\n- Potential recycling cans',
   '[{"label":"Inventory","href":"/build-week"}]'),
  (40, 4, 'section', 'Vehicle & Transportation Logistics',
   E'Cover:\n- 15-passenger van\n- Dualie pickup\n- Reefer\n- Generator tow\n- Costco / shopping run\n- Propane refill\n- Fuel\n- Luggage transport\n- Who drives what\n- Who arrives when',
   '[{"label":"Build Roster","href":"/build-week"}]'),
  (50, 5, 'section', 'Crew Assignments',
   E'Assign tentative teams:\n- Survey / layout\n- Container crew\n- Shade team\n- Power team\n- Water / plumbing team\n- Kitchen team\n- Decor / chill tent team\n- Safety / first aid\n- Bike trailer coordination',
   '[{"label":"Build Roster","href":"/build-week"}]'),
  (60, 6, 'section', 'Final Open Questions',
   E'- Which military tent do we have?\n- Which circus tent do we have?\n- Do we have assembly instructions?\n- What day can other camps pick up bikes?\n- Who helps unload and sort bikes?\n- What needs to be pre-drilled, marked, or bundled before playa?',
   '[]'),
  (70, NULL, 'decisions', 'Decisions Needed by End of Meeting',
   E'- Final purchasing list\n- Final Reno prep owner\n- Final container load-in strategy\n- Final team leads\n- Final vehicle plan\n- Final unresolved questions list',
   '[]')
) AS x(sort_order, number, kind, title, body_md, resource_links)
WHERE m.slug = 'meeting-4'
ON CONFLICT DO NOTHING;

-- =====================================================
-- Sections — Meeting 5
-- =====================================================
INSERT INTO build_meeting_sections (meeting_id, sort_order, number, kind, title, body_md, resource_links)
SELECT m.id, x.sort_order, x.number, x.kind, x.title, x.body_md, x.resource_links::jsonb
FROM build_meetings m, (VALUES
  (10, 1, 'section', 'Final Attendance & Arrival Roll Call',
   E'Confirm:\n- Who arrives Sunday\n- Who arrives Monday\n- Who needs airport pickup\n- Who is going directly to Fernley\n- Who is going to playa Monday\n- Who is going Tuesday\n- Emergency contacts',
   '[{"label":"Build Roster","href":"/build-week"}]'),
  (20, 2, 'section', 'Build Week Day-by-Day Walkthrough',
   E'**Sunday 8/23**\n- Reno arrivals\n- Shopping\n- Vehicle prep\n- Fernley house check-in\n- Takeout dinner\n- Possible early playa crew / prep\n\n**Monday 8/24**\n- Survey team to playa\n- Placement\n- Boundaries measured\n- Immovable item flags placed\n- Containers, water tank, dumpster, portos, bike trailer delivered\n- Generator tested\n- Basic power / water / lighting\n- Military tent or initial shelter\n\n**Tuesday 8/25**\n- AirBnB checkout\n- Full caravan to playa\n- Builder orientation\n- Shade over builder tents\n- Personal tents\n- Drill batteries charging\n- Power and water distribution\n- Basic kitchen\n\n**Wednesday 8/26**\n- Swing City dinner begins\n- Continue shade\n- Staged container unloading\n- Deli kitchen\n- Camp chill tent\n- Public chill tent\n- Grey water\n- Additional electrical\n\n**Thursday 8/27**\n- Finish kitchen\n- Shower\n- Sinks\n- Fly power to tents\n- Ice machines\n- Swamp coolers\n- Water to chill tents\n- Mark arriving camper tent spots\n- Systems walkthrough\n\n**Friday 8/28**\n- Signage\n- Decor\n- Side shade\n- Roof deck\n- Safety equipment\n- Kitchen stocking\n- Final plumbing / grey water test\n- Polaroid welcome wall\n- Final walkthrough\n- Build complete\n\nThis sequence follows the build week task plan from Sunday 8/23 through Friday 8/28.',
   '[{"label":"Full Schedule","href":"/build-week"},{"label":"Layout Editor","href":"/layout"}]'),
  (30, 3, 'section', 'Safety Briefing',
   E'Cover:\n- Hydration\n- Heat\n- Gloves / eye protection\n- Headlamps\n- Working around vehicles\n- Working around containers\n- Power safety\n- Generator safety\n- Ratchet strap / lag bolt safety\n- Dust / wind shutdown expectations\n- No one works beyond their ability',
   '[{"label":"Resources","href":"/resources"}]'),
  (40, 4, 'section', 'Communication Rules',
   E'Cover:\n- Where updates will be posted\n- Who makes final calls\n- How task assignments work\n- How to ask for help\n- Where tools go after use\n- How to report broken / missing items\n- How daily priorities will be communicated\n\nTool organization and losing time searching for items were identified as known pain points, so this needs to be explicitly covered.',
   '[]'),
  (50, 5, 'section', 'Builder Expectations',
   E'Final reminder:\n- Bring water and food for early days\n- Do not assume kitchen or power is ready\n- Be flexible\n- Be safe\n- Ask questions early\n- Respect the plan\n- Keep tools organized\n- Build week is a team sport',
   '[]'),
  (60, 6, 'section', 'Final Questions',
   E'Take final questions on:\n- Flights\n- Airport pickup\n- Fernley houses\n- Playa arrival\n- Food\n- Personal gear\n- Safety\n- Assignments\n- Anything confusing',
   '[]'),
  (70, NULL, 'decisions', 'Decisions Needed by End of Meeting',
   E'- Final arrival list\n- Final airport pickup list\n- Final team assignments\n- Final packing reminders\n- Final emergency contact list\n- Final day-one communication plan',
   '[]')
) AS x(sort_order, number, kind, title, body_md, resource_links)
WHERE m.slug = 'meeting-5'
ON CONFLICT DO NOTHING;
