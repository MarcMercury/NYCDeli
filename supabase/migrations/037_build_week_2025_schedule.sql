-- Build Week 2025 Schedule
-- Sunday Aug 23: Builder arrival & initial setup
-- Monday Aug 24: Container / water tank / major item delivery
-- Tuesday Aug 25: Main build day 1 (shade, power, water)
-- Wednesday Aug 26: Main build day 2 (kitchen, containers emptied)
-- Thursday Aug 27: Systems & comfort (showers, sinks, cooling)
-- Friday Aug 28: Finishing touches & welcome prep
-- Saturday Aug 29: Minor items only — build complete

-- =====================================================
-- UPDATE BUILD STAGES with correct 2025 dates
-- =====================================================
UPDATE build_stages SET
  title = 'Planning & Reno Prep',
  description = 'Pre-playa planning, site mapping, gear organization in Reno, and builder communication. Everything that happens before we hit the desert.',
  date_label = 'Pre-Playa',
  crew_size = 'All builders',
  builder_notes = 'Those who sign up for build need to be told what is expected and what it will be like. Review site map and familiarize yourself with immovable item placement. Containers, water tower, and bike trailer delivered Monday — Sunday crew must have boundaries measured and placement flagged before delivery arrives.',
  updated_at = NOW()
WHERE stage = 'planning';

UPDATE build_stages SET
  title = 'Delivery & Placement Day',
  description = 'Main containers, water tank, and other major items delivered. Position immovable items per site map. Open containers and begin staged unloading of builder-priority gear.',
  date_label = 'Monday, Aug 24',
  crew_size = '~5-8 people',
  builder_notes = 'Sunday crew should already have camp boundaries measured and flagged. Container and water tower positioning is VITAL — getting this wrong cascades into every other build day. Coordinate delivery windows. Generator test and basic power/water hookup if time allows.',
  updated_at = NOW()
WHERE stage = 'monday';

UPDATE build_stages SET
  title = 'Main Build Day 1',
  description = 'Full builder crew active. Primary focus: shade structure over builder tents, basic power distribution, water hookup, military tent for group shelter.',
  date_label = 'Tuesday, Aug 25',
  crew_size = '~15-20 people',
  builder_notes = 'No food service yet — bring your own food and water for the day. Shade over builder tents is #1 priority. Military tent goes up for group shelter. Get power running and water distributed. Builders should have some free time — we should not have to work from waking to sleeping like last year.',
  updated_at = NOW()
WHERE stage = 'tuesday';

UPDATE build_stages SET
  title = 'Main Build Day 2',
  description = 'Continue shade expansion. Begin emptying containers in staged fashion. Full deli kitchen setup. Community spaces take shape.',
  date_label = 'Wednesday, Aug 26',
  crew_size = '~15-20 people',
  builder_notes = 'Food service starts today at lunch (Swing City or camp kitchen). Empty containers per stage — do NOT dump everything at once or it will blow away. Kitchen setup is a big push today. Shade structure should be mostly complete by end of day.',
  updated_at = NOW()
WHERE stage = 'wednesday';

UPDATE build_stages SET
  title = 'Systems & Comfort',
  description = 'Finish kitchen, install showers and sinks, run power to tent areas, set up swamp coolers and ice machines. Prepare camp for Friday arrivals.',
  date_label = 'Thursday, Aug 27',
  crew_size = '~15-20 people',
  builder_notes = 'Focus shifts from structure to systems and livability. Showers, sinks, grey water all connected. Power flown to individual tent spots. Ice machines and swamp coolers running. Mark tent placements for arriving campers. Camp should feel livable by end of day.',
  updated_at = NOW()
WHERE stage = 'thursday';

UPDATE build_stages SET
  title = 'Finishing & Decoration',
  description = 'Decoration, art installation, final systems checks, side shade panels. Transition from build mode to camp mode. Welcome prep for Saturday.',
  date_label = 'Friday, Aug 28',
  crew_size = '~15-20 people',
  builder_notes = 'Decorate chill tents, set up sound/AV, install camp signage. Final walkthrough of all systems — power, water, grey water. Stock kitchen. Side shade and finishing structural touches. Roof deck setup. Build should be 95%+ complete by end of day.',
  updated_at = NOW()
WHERE stage = 'friday';

-- =====================================================
-- REPLACE BUILD SCHEDULE ITEMS with 2025 schedule
-- =====================================================
DELETE FROM build_schedule_items;

INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery, assigned_to, notes) VALUES

-- ═══════════════════════════════════════════════════════
-- SUNDAY AUG 23 — Builder Arrival & Initial Setup
-- ═══════════════════════════════════════════════════════
('sunday', 'Builder advance crew arrives', 'First boots on playa. Bring water and food for at least 2 days — no services available yet.', 'logistics', 'morning', 10, false, 'Sunday crew', 'Arrive early to maximize daylight. Bring personal shelter.'),
('sunday', 'Get placed by placement team', 'Check in with Burning Man placement and receive official camp placement.', 'layout', 'morning', 20, false, 'Sunday crew', 'This determines everything — be ready to go when they call.'),
('sunday', 'Measure camp boundaries', 'Use measuring wheel and pre-cut ropes to establish camp rectangle. Set corner stakes and boundary ropes.', 'layout', 'morning', 30, false, 'Sunday crew', 'Set one corner, extend rope, check if straight, set next. All 4 corners marked.'),
('sunday', 'Flag immovable item positions', 'Mark positions for containers, water tower, dumpster, porto-potties, bike trailer per site map.', 'layout', 'afternoon', 40, false, 'Sunday crew', 'These MUST be positioned before Monday delivery. Getting this right is vital.'),
('sunday', 'Flag shade structure layout', 'Mark positions for shade structure walls and main community areas.', 'layout', 'afternoon', 50, false, 'Sunday crew', 'Flag/rope out the first wall to be built (builder tent shade).'),
('sunday', 'Set up personal shelter for Sunday crew', 'Pitch personal tents or set up military tent for overnight shelter.', 'infrastructure', 'afternoon', 60, false, 'Sunday crew', 'Safety first — shelter before dark.'),
('sunday', 'Basic camp setup', 'Set up trash cans, basic lighting, and staging area for Monday deliveries.', 'logistics', 'afternoon', 70, false, 'Sunday crew', 'Create a clear staging zone for where containers will be unloaded.'),

-- ═══════════════════════════════════════════════════════
-- MONDAY AUG 24 — Delivery & Placement Day
-- ═══════════════════════════════════════════════════════
('monday', '🚚 Container delivery (Pike)', 'Main storage containers arrive. Direct placement per flagged positions from Sunday.', 'delivery', 'morning', 10, true, 'Delivery crew', 'Container positioning is VITAL and cascading — every error compounds. Coordinate with driver.'),
('monday', '🚚 Water tank delivery', 'Water tank / tower arrives. Position in designated location per site map.', 'delivery', 'morning', 20, true, 'Delivery crew', 'Must be positioned before anything blocks access path.'),
('monday', '🚚 Dumpster & porto-potties', 'Grey water dumpster and portable toilets delivered.', 'delivery', 'morning', 30, true, 'Delivery crew', NULL),
('monday', '🚚 Bike trailer delivery', 'Community bike trailer positioned per site map.', 'delivery', 'morning', 40, true, 'Delivery crew', NULL),
('monday', 'Open containers — retrieve builder-priority gear', 'Open containers and pull out builder-first-access items: shade poles, drills, ratchet straps, lag bolts, washers, bungees, shade cloth, military tent.', 'logistics', 'morning', 50, false, 'Monday crew', 'Builder gear should be packed at the front/top of the container per Reno prep.'),
('monday', 'Test generator', 'Start generator, check all fluids. Bring extra coolant — it may leak in transit.', 'electrical', 'afternoon', 60, false, 'Monday crew', 'Known issue: generator leaks coolant during transport. Bring extra of all fluids.'),
('monday', 'Basic power hookup', 'Run primary power cables from generator, set up first breakout box for tool charging.', 'electrical', 'afternoon', 70, false, 'Monday crew', 'Priority: get drills charging.'),
('monday', 'Basic water hookup', 'Connect pump to water tank and run initial hose for drinking water access.', 'plumbing', 'afternoon', 80, false, 'Monday crew', NULL),
('monday', 'Begin military tent setup', 'Start assembling military tent for group shelter — finalize tomorrow if needed.', 'infrastructure', 'afternoon', 90, false, 'Monday crew', 'Need assembly instructions identified in advance. Shelter is critical for builder safety.'),
('monday', 'Basic lighting for work area', 'String up task lighting around main work area for early morning / evening use.', 'electrical', 'afternoon', 100, false, 'Monday crew', NULL),

-- ═══════════════════════════════════════════════════════
-- TUESDAY AUG 25 — Main Build Day 1
-- ═══════════════════════════════════════════════════════
('tuesday', 'Main builder crew arrives', 'Full build team on-site. Morning orientation and task assignments.', 'logistics', 'morning', 10, false, 'Build lead', 'Go over site map, explain the plan, assign teams. Set expectations for pace — not dawn to dusk.'),
('tuesday', 'Complete military tent', 'Finish military tent assembly if not complete from Monday.', 'infrastructure', 'morning', 20, false, 'Team A', NULL),
('tuesday', 'Charge drill batteries', 'Pull all drill batteries and get them on chargers. Rotate throughout the day.', 'logistics', 'morning', 25, false, NULL, 'Ongoing — keep batteries rotating all day.'),
('tuesday', 'Begin shade structure — builder tent wall', 'First priority: build shade over builder tent area. This is the first wall.', 'shade', 'morning', 30, false, 'Shade team', 'Flag/rope out first wall location. Poles → connectors → cloth → ratchet straps.'),
('tuesday', 'Continue shade — expand to second wall', 'Extend shade structure to second wall and begin connecting.', 'shade', 'afternoon', 40, false, 'Shade team', 'Apply zinc lubricant to threaded connectors to prevent seizing.'),
('tuesday', 'Complete power distribution', 'Full power cable runs from generator to breakout boxes across camp.', 'electrical', 'morning', 50, false, 'Electrical team', NULL),
('tuesday', 'Complete water distribution', 'Run water lines to key locations. Distribute water to hub camps — they must help with their portion.', 'plumbing', 'afternoon', 60, false, 'Plumbing team', 'Hub camps must participate in their own hookups.'),
('tuesday', 'Set up personal builder tents', 'Builders set up personal tents in designated spots, ideally permanent locations.', 'logistics', 'afternoon', 70, false, 'All builders', 'Try to set up where you will live for the event.'),
('tuesday', 'Basic kitchen setup', 'Set up a basic cooking station for builder meals (propane stove, water, basic prep surface).', 'kitchen', 'afternoon', 80, false, 'Kitchen team', 'Full kitchen comes Wednesday — this is just basics for builder meals.'),

-- ═══════════════════════════════════════════════════════
-- WEDNESDAY AUG 26 — Main Build Day 2
-- ═══════════════════════════════════════════════════════
('wednesday', 'Continue shade structure expansion', 'Extend shade to cover community areas, chill tent zones, and kitchen.', 'shade', 'morning', 10, false, 'Shade team', 'Shade should be substantially complete by end of day.'),
('wednesday', 'Empty containers — staged unloading', 'Empty containers per staged plan. Pull items by category/need, NOT everything at once.', 'logistics', 'morning', 20, false, 'Container crew', 'Do NOT empty everything — items WILL blow away in wind. Unload what is needed for the day.'),
('wednesday', 'Full deli kitchen setup', 'Build kitchen counters, install appliances, set up prep surfaces, connect power and water to kitchen.', 'kitchen', 'morning', 30, false, 'Kitchen team', 'This is a big push — kitchen should be functional by end of day.'),
('wednesday', 'Set up camp chill tent', 'Assemble and position the camp community chill tent with basic furniture.', 'decoration', 'afternoon', 40, false, 'Decor team', NULL),
('wednesday', 'Set up public chill tent', 'Set up the public-facing chill/hang tent.', 'decoration', 'afternoon', 50, false, 'Decor team', NULL),
('wednesday', 'Grey water system setup', 'Install grey water containment and connect to kitchen, shower, and sink drain points.', 'plumbing', 'afternoon', 60, false, 'Plumbing team', NULL),
('wednesday', 'Run additional electrical circuits', 'Expand power distribution to tent areas, kitchen, and community spaces.', 'electrical', 'afternoon', 70, false, 'Electrical team', NULL),

-- ═══════════════════════════════════════════════════════
-- THURSDAY AUG 27 — Systems & Comfort
-- ═══════════════════════════════════════════════════════
('thursday', 'Finish deli & camp kitchen', 'Complete any remaining kitchen setup — both deli service kitchen and camp communal kitchen.', 'kitchen', 'morning', 10, false, 'Kitchen team', NULL),
('thursday', 'Install shower', 'Set up camp shower structure, connect water supply and grey water drain.', 'plumbing', 'morning', 20, false, 'Plumbing team', NULL),
('thursday', 'Install sinks', 'Mount and connect camp sinks with water supply and grey water.', 'plumbing', 'morning', 30, false, 'Plumbing team', NULL),
('thursday', 'Fly power to individual tent spots', 'Run power cables along shade structure to individual tent areas with breakout boxes.', 'electrical', 'morning', 40, false, 'Electrical team', 'Open question: fly power during shade construction or after? After is easier but requires re-climbing.'),
('thursday', 'Set up ice machines', 'Position, connect power and water, and start ice machines.', 'electrical', 'afternoon', 50, false, NULL, NULL),
('thursday', 'Set up swamp coolers', 'Install and activate swamp coolers for tent areas. Connect power and water.', 'electrical', 'afternoon', 60, false, NULL, NULL),
('thursday', 'Run water to chill tents', 'Extend water lines to community and chill tent areas.', 'plumbing', 'afternoon', 70, false, 'Plumbing team', NULL),
('thursday', 'Mark tent spots for arriving campers', 'Flag and mark individual tent placement spots for campers arriving Friday/Saturday.', 'layout', 'afternoon', 80, false, NULL, 'Use site map tent placement assignments.'),
('thursday', 'Systems walkthrough', 'Test all systems — power everywhere, water pressure, grey water flow, generator load check.', 'safety', 'afternoon', 90, false, 'Build lead', 'Fix any issues found. This is the last full build day for major systems.'),

-- ═══════════════════════════════════════════════════════
-- FRIDAY AUG 28 — Finishing & Decoration
-- ═══════════════════════════════════════════════════════
('friday', 'Install camp signage & address markers', 'Put up camp name signs, BRC address markers, and wayfinding.', 'layout', 'morning', 10, false, NULL, NULL),
('friday', 'Decorate chill tents', 'Full decoration of camp and public chill tents — lights, art, furniture, rugs.', 'decoration', 'morning', 20, false, 'Decor team', NULL),
('friday', 'Set up sound / AV equipment', 'Install speakers, sound system, any AV gear for events.', 'decoration', 'morning', 30, false, NULL, NULL),
('friday', 'Install side shade panels', 'Add side shade panels to shade structure for wind/sun protection.', 'shade', 'morning', 40, false, 'Shade team', NULL),
('friday', 'Set up roof deck', 'Assemble and secure the roof deck area.', 'infrastructure', 'morning', 50, false, NULL, NULL),
('friday', 'Install safety equipment', 'Place fire extinguishers, first aid kits, and safety signage throughout camp.', 'safety', 'afternoon', 60, false, NULL, NULL),
('friday', 'Stock kitchen with initial supplies', 'Load kitchen with initial food supplies, spices, plates, utensils.', 'kitchen', 'afternoon', 70, false, 'Kitchen team', NULL),
('friday', 'Final plumbing check & grey water test', 'Full system test — run water through all points, verify grey water drains properly.', 'plumbing', 'afternoon', 80, false, 'Plumbing team', NULL),
('friday', 'Set up Polaroid welcome wall', 'Install polaroid camera station and display wall in chill tent for arrival photos.', 'decoration', 'afternoon', 90, false, NULL, 'Take a polaroid of each camper on arrival, put on wall.'),
('friday', 'Organize remaining container contents', 'Sort any remaining container items to correct locations. Close and secure containers.', 'logistics', 'afternoon', 100, false, NULL, NULL),

-- ═══════════════════════════════════════════════════════
-- SATURDAY AUG 29 — Minor Items / Build Complete
-- ═══════════════════════════════════════════════════════
('saturday', 'Final walkthrough & punch list', 'Walk camp end-to-end. Note and fix any remaining minor items.', 'safety', 'morning', 10, false, 'Build lead', 'This should be truly minor — tightening, adjustments, cosmetic fixes only.'),
('saturday', 'Touch-up shade and structures', 'Tighten any loose ratchet straps, re-secure shade cloth that shifted overnight, adjust guy lines.', 'shade', 'morning', 20, false, NULL, NULL),
('saturday', 'Final decoration touches', 'Hang any last art, adjust lighting, final beautification.', 'decoration', 'morning', 30, false, NULL, NULL),
('saturday', 'Camp safety briefing', 'Brief all current campers on safety protocols, fire extinguisher locations, grey water rules, generator schedule.', 'safety', 'morning', 40, false, 'Build lead', NULL),
('saturday', 'Help early arrivals with camp spot setup', 'Welcome arriving campers, help them find their tent spots and get set up.', 'logistics', 'afternoon', 50, false, 'All builders', NULL),
('saturday', 'BUILD COMPLETE 🎉', 'Camp is built. Builders rest. Transition to camp mode.', 'other', 'afternoon', 60, false, 'Everyone', 'Builders earned a break — go explore, take a nap, enjoy the playa.');
