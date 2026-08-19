-- Build Week 2026 — rebuild TUESDAY → FRIDAY from the
-- "NYC DELI RATS — SUNDAY + BUILD MONDAY / BUILD TUESDAY–FRIDAY" plan doc.
-- Sunday + Monday already match the doc (079). This migration replaces the
-- Tue/Wed/Thu/Fri build work with the phase + crew + contingency structure.
--
-- Preserved on purpose:
--   * sort_order 1–4 travel/meal items on Tuesday–Friday
--   * auto-synced "Install X" layout items (sort_order 260+)
--   * Friday 260 "BUILD COMPLETE"

-- ── Clear the old Tue–Fri build content ──────────────────────────────
DELETE FROM build_schedule_items
WHERE day IN ('tuesday', 'wednesday') AND sort_order BETWEEN 5 AND 250;

DELETE FROM build_schedule_items
WHERE day = 'thursday' AND sort_order BETWEEN 3 AND 250;

DELETE FROM build_schedule_items
WHERE day = 'friday' AND sort_order BETWEEN 2 AND 259;

-- ═══════════════════════════════════════════════════════════════════
-- TUESDAY — AUGUST 25
-- MAIN SHADE + BUILDER HOME BASE + CHILL TENTS · Expected crew ~12
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery, assigned_to, notes) VALUES

('tuesday', '🎯 Tuesday mission — WE HAVE SHELTER',
 'Minimum acceptable outcome: the complete builder-tent shade structure is standing, secured and shaded, and all builder tents are underneath it.',
 'logistics', 'all_day', 5, false, 'All builders (~12)',
 'Nothing lower on the priority list is allowed to jeopardize this objective.'),

-- ── PHASE 1 — STAGE EVERYTHING ──
('tuesday', '1️⃣ PHASE 1 — CREW 1: Main shade staging (5 people)',
 'Prepare the main shade structure for construction. Pull conduit, connectors, lag bolts, washers, ratchet straps, tools and ladders. Stage shade cloth. Lay materials out by section. Confirm the starting 30ft x 50ft square.',
 'shade', 'morning', 10, false, '5 people', NULL),

('tuesday', '1️⃣ PHASE 1 — CREW 2: Chill tent prep (4 people)',
 'Completely prepare BOTH chill tents so construction can begin immediately after the main shade. Order: (1) Stanton Island / NYC private chill, (2) Siberia / public chill. For each: pull all related materials from trailers/containers, move them to the structure final location, separate structural pieces from covers/shade, locate lag bolts, washers, ratchet straps and tools, verify nothing is missing, clear the construction footprint.',
 'infrastructure', 'morning', 12, false, '4 people',
 'Do NOT build yet. Stage everything.'),

('tuesday', '1️⃣ PHASE 1 — CREW 3: Flex / logistics (3 people)',
 'Keep the main crews moving: move materials, retrieve missing hardware, organize Tool Town, maintain clear work areas, handle the water delivery if it arrives, handle bin pickup if needed, make supply runs if necessary. Assist chill tent prep once logistics are quiet.',
 'logistics', 'morning', 14, false, '3 people', NULL),

-- ── PHASE 2 — FIRST 30x50 SQUARE ──
('tuesday', '2️⃣ PHASE 2 — First 30x50 shade square (ALL HANDS)',
 'The first square establishes the geometry for everything that follows — do not rush this. Assemble the first 30ft x 50ft square together, raise together, position precisely, check alignment against the camp map, check dimensions, squareness and orientation, adjust until correct. Once everyone agrees: lag-bolt the structure into the playa. Do NOT fully tension ratchet straps yet.',
 'shade', 'morning', 20, false, 'All hands',
 'This becomes the reference point for the entire structure.'),

-- ── PHASE 3 — ASSEMBLY LINE ──
('tuesday', '3️⃣ PHASE 3 — CREW A: Ground assembly (5 people)',
 'Assemble the next conduit section on the ground, install connectors, pre-connect top ratchet strap sections, confirm correct pieces, prepare the section for lifting. Once ready, immediately begin laying out the following section.',
 'shade', 'all_day', 30, false, '5 people', NULL),

('tuesday', '3️⃣ PHASE 3 — CREW B: Lift / connect / anchor (7 people)',
 'Lift the assembled section, connect it to the standing structure, position correctly, lag-bolt the section into the ground, confirm alignment. Then move to the next completed section from Crew A.',
 'shade', 'all_day', 32, false, '7 people', NULL),

('tuesday', '🔁 The rhythm — Assemble → Lift → Connect → Lag → Move → Repeat',
 'Continue wall by wall, section by section, until the entire eight-section shade structure is standing.',
 'shade', 'all_day', 34, false, 'All hands', NULL),

-- ── PHASE 4 — TENSION ──
('tuesday', '4️⃣ PHASE 4 — Ratchet straps + structural tension (ALL HANDS)',
 'Once the entire frame is standing, install and adjust the ratchet-strap system. The objective is balanced structural tension, not making every strap as tight as possible. Install all remaining straps, tension opposite sides progressively, watch frame alignment, check poles for leaning, check connectors, re-adjust where necessary, walk the complete perimeter, perform a final structural inspection.',
 'shade', 'afternoon', 40, false, 'All hands',
 'This will require some judgment.'),

-- ── PHASE 5 — SHADE CLOTH ──
('tuesday', '5️⃣ PHASE 5 — Shade cloth — all 8 sections (ALL HANDS)',
 'Once the structure itself is solid: stage all eight shade sections, raise the shade cloth, position each section, attach, tension, inspect, and correct gaps / overlaps / misalignment.',
 'shade', 'afternoon', 50, false, 'All hands',
 'Main shade is not complete until all eight sections are installed.'),

-- ── PHASE 6 — BUILDER TENTS ──
('tuesday', '6️⃣ PHASE 6 — Builder tents under the shade (ALL HANDS)',
 'Move builder tents underneath the shade, follow the assigned tent-placement map, orient doors correctly, set up tents, lag / secure tents, and move personal gear underneath the shade.',
 'infrastructure', 'afternoon', 60, false, 'All hands',
 'At this point, the builders officially have a home.'),

-- ── PHASE 7 — PRIVATE CHILL ──
('tuesday', '7️⃣ PHASE 7 — Stanton Island / NYC private chill (ALL HANDS)',
 'Move directly into the private chill tent. Because everything should already be staged: assemble structure, raise, square, lag, strap, install covering/shade, secure. Once structurally complete, unnecessary hands can begin preparing the public chill tent.',
 'infrastructure', 'afternoon', 70, false, 'All hands', NULL),

-- ── PHASE 8 — PUBLIC CHILL ──
('tuesday', '8️⃣ PHASE 8 — Siberia / public chill tent (if time remains)',
 'If time and energy remain, repeat the process with the public chill tent.',
 'infrastructure', 'evening', 80, false, 'All hands / available crew', NULL),

('tuesday', '📋 Tuesday contingencies — Plan A / B / C',
 'PLAN A — CRUSHED IT: full eight-section main shade complete, lagged and strapped, all shade cloth installed, builder tents underneath and secured, Stanton Island private chill built, public chill built, both chill areas structurally secured. Wednesday then begins ahead of schedule. || PLAN B — VERY GOOD DAY: full main shade complete, all builder tents underneath and secured, Stanton Island private chill complete, public chill staged but not built. Wednesday begins with the public chill. || PLAN C — MINIMUM TUESDAY WIN: full main shade frame complete, anchored and tensioned, all shade cloth installed, builder tents underneath and secured, both chill tents staged and ready for Wednesday.',
 'other', 'evening', 90, false, NULL,
 'If we accomplish Plan C, Tuesday was still an extremely successful build day.'),

-- ═══════════════════════════════════════════════════════════════════
-- WEDNESDAY — AUGUST 26
-- CHILL TENTS + KITCHEN SHADE + SHOWER + LIGHTING · Expected crew ~16
-- ═══════════════════════════════════════════════════════════════════

('wednesday', '🎯 Wednesday mission — WE HAVE SPACES',
 'First finish anything outstanding from Tuesday, then transition from large-scale structural construction into the major functional areas of camp: chill + kitchen shade + shower + kitchen staging + lights.',
 'logistics', 'all_day', 5, false, 'All builders (~16)', NULL),

('wednesday', '1️⃣ PHASE 1 — Tuesday carryover & staffing split',
 'Determine Wednesday morning staffing based on what remains. If BOTH chill tents remain: 8 people to Stanton Island, 8 people to the public chill — once one finishes, that team joins the other. If ONE chill tent remains: 8 people finish it, the remaining 8 immediately begin Wednesday projects. If Tuesday Plan A was completed: immediately split into the Wednesday crews.',
 'infrastructure', 'morning', 10, false, 'Build lead', NULL),

('wednesday', '2️⃣ PHASE 2 — CREW 1: Kitchen shade (5 people)',
 'Establish full shade over the kitchen area. Locate shade material, determine rigging points, stage cable / straps / hardware, lay out panels, build / rig the shade, tension, secure, inspect.',
 'shade', 'all_day', 20, false, '5 people',
 'Intentionally feel-it-out — final installation may depend on how the surrounding structures land.'),

('wednesday', '2️⃣ PHASE 2 — CREW 2: Kitchen unpack + staging (4 people)',
 'Make Thursday kitchen build fast. Locate all kitchen equipment, move it to the kitchen area, separate by function, identify large appliances, tables, shelving, cooking equipment, bins and service materials, and create logical installation piles.',
 'kitchen', 'all_day', 22, false, '4 people',
 'Do not create chaos by completely unpacking small items — make everything Thursday needs obvious and accessible.'),

('wednesday', '2️⃣ PHASE 2 — CREW 3: Shower (4 people)',
 'Establish the shower area. Clear the area, unpack shower equipment, position major components, build the structure, identify water connections, drainage / grey-water connections and power requirements, organize shower supplies.',
 'plumbing', 'all_day', 24, false, '4 people',
 'Does not need to be fully operational Wednesday — substantially constructed and ready for Thursday utility connections.'),

('wednesday', '2️⃣ PHASE 2 — CREW 4: Camp lighting (3 people)',
 'Get useful nighttime lighting around the main tent/shade area. Hang perimeter lighting and walkway lighting, establish primary lighting routes, connect to existing temporary power, keep cords safely routed, test at dusk/night.',
 'electrical', 'afternoon', 26, false, '3 people',
 'Functional lighting first, decorative lighting later.'),

('wednesday', '🔀 Wednesday team transition order',
 'When a team finishes, move down this list: 1. finish any remaining chill tent → 2. kitchen shade → 3. shower → 4. kitchen staging → 5. lighting.',
 'logistics', 'all_day', 30, false, 'Build lead',
 'This prevents four half-finished projects.'),

('wednesday', '📋 Wednesday contingencies — Plan A / B / C',
 'PLAN A — FULL WEDNESDAY: both chill tents complete, kitchen shade complete, kitchen materials completely staged, shower substantially built, majority of main-camp lighting installed, Thursday utility work staged. || PLAN B — CUT LIGHTING: finish chill tents, kitchen shade, kitchen staging and shower structure; install only basic safety/work lighting — decorative and secondary lighting moves to Friday. || PLAN C — CUT SHOWER FINISH + LIGHTING: finish outstanding chill structures, kitchen shade and kitchen staging; get the shower unpacked, positioned and ready for utilities, then stop. Lighting stays temporary/basic and Thursday begins by finishing shower infrastructure.',
 'other', 'evening', 40, false, NULL, NULL),

-- ═══════════════════════════════════════════════════════════════════
-- THURSDAY — AUGUST 27
-- UTILITY + SYSTEMS DAY · Expected crew ~16
-- ═══════════════════════════════════════════════════════════════════

('thursday', '🎯 Thursday mission — WE HAVE A FUNCTIONING CAMP',
 'By Thursday night, every major structure and utility should be installed, operating and tested. Power + water + kitchen + shower + cooling + utilities tested.',
 'logistics', 'all_day', 5, false, 'All builders (~16)',
 'This is the most important functional deadline of Build Week. Friday should NOT be a major infrastructure day.'),

('thursday', 'CREW 1 — Water + shower (4 people)',
 'Run water distribution, connect the shower, test water pressure, check fittings, check leaks, establish grey-water routing, finish the shower area, test the shower, organize shower supplies.',
 'plumbing', 'all_day', 10, false, '4 people', NULL),

('thursday', 'CREW 2 — Power + electrical (4 people)',
 'Run final camp power distribution, establish tent-area electrical routes, position distribution equipment, keep lines out of walkways, protect crossings, connect required camp systems, finish main lighting circuits, test power loads, confirm tent connection areas.',
 'electrical', 'all_day', 12, false, '4 people',
 'Campers should be able to begin arriving and understand where they plug in.'),

('thursday', 'CREW 3 — Kitchen build (5 people)',
 'Install tables, position appliances, establish prep areas, cooking line, service line and washing/sanitation area, organize major bins, connect required utilities, test equipment.',
 'kitchen', 'all_day', 14, false, '5 people',
 'The goal is a functional kitchen, not a beautifully organized kitchen. Pretty comes Friday.'),

('thursday', 'CREW 4 — Swamp coolers + secondary spaces (3 people)',
 'FIRST PRIORITY — swamp coolers: position, connect water, connect power, test, check airflow, correct issues. Then move to the dressing room, remaining containers, storage spaces, chill-tent support equipment and secondary infrastructure. For the dressing room: define the space, clear it, give it lighting and basic power if needed.',
 'electrical', 'all_day', 16, false, '3 people',
 'Do not overthink the dressing room Thursday — decoration can happen Friday.'),

('thursday', '🔀 Thursday team transition order',
 'As crews finish: 1. water / power problems → 2. kitchen → 3. shower → 4. swamp coolers → 5. lighting → 6. secondary spaces.',
 'logistics', 'all_day', 20, false, 'Build lead',
 'Any infrastructure problem takes priority over aesthetics.'),

('thursday', '✅ System test — WATER',
 'Water flowing, no major leaks, shower works, kitchen water works, grey water works.',
 'plumbing', 'evening', 30, false, 'Crew 1', NULL),

('thursday', '✅ System test — POWER',
 'Generator functioning, distribution functioning, camp circuits tested, camper connections established, no dangerous cord routes.',
 'electrical', 'evening', 32, false, 'Crew 2', NULL),

('thursday', '✅ System test — COOLING',
 'Swamp coolers operating, water supplied, airflow confirmed.',
 'electrical', 'evening', 34, false, 'Crew 4', NULL),

('thursday', '✅ System test — KITCHEN',
 'Major appliances placed, workstations established, power/water available, kitchen functional.',
 'kitchen', 'evening', 36, false, 'Crew 3', NULL),

('thursday', '✅ System test — LIGHTING',
 'Main pathways visible, main shade area lit, kitchen lit, shower lit, critical infrastructure visible.',
 'electrical', 'evening', 38, false, 'Crew 2', NULL),

('thursday', '📋 Thursday contingencies — Plan A / B / C',
 'PLAN A — CAMP IS OPERATIONAL: everything built, connected, powered, supplied with water, tested and functioning. Construction is effectively over. || PLAN B — CUT SECONDARY SPACES: do not spend meaningful labor on dressing-room finish, decorative lighting, detailed container organization, nonessential storage or aesthetics — finish every critical utility and operating system instead. || PLAN C — FUNCTION OVER EVERYTHING: the only objectives are reliable power, reliable water, a functional kitchen, a functional shower, functional cooling, safe lighting and a structurally secure camp. Everything else moves to Friday.',
 'other', 'evening', 40, false, NULL, NULL),

-- ═══════════════════════════════════════════════════════════════════
-- FRIDAY — AUGUST 28
-- FINISH, ORGANIZE + MAKE IT HOME · Expected crew ~16
-- ═══════════════════════════════════════════════════════════════════

('friday', '🎯 Friday mission — WE HAVE A HOME',
 'Friday is deliberately different — there should be very little heavy construction. We move from BUILDING A CAMP to MAKING IT OUR CAMP. Fix + clean + organize + furnish + decorate.',
 'logistics', 'all_day', 5, false, 'All builders (~16)', NULL),

('friday', '🚶 Morning deficiency walk — one final punch list',
 'Before splitting into teams, walk the entire camp together and create one final punch list. Look for loose ratchet straps, unsecured structures, power issues, water leaks, lighting gaps, missing equipment, unfinished structures, trip hazards, trash, unorganized materials and tools left around camp.',
 'safety', 'morning', 10, false, 'All builders',
 'Anything structural, electrical or water-related immediately becomes priority.'),

('friday', 'CREW 1 — Fix + finish (4 people)',
 'Work the punch list: structural adjustments, loose hardware, ratchet adjustments, electrical corrections, water corrections, shade adjustments, small repairs.',
 'safety', 'all_day', 20, false, '4 people', NULL),

('friday', 'CREW 2 — Organize (3 people)',
 'Tool Town, hardware, storage, containers, kitchen bins, camp supplies, spare parts, ratchet straps, ladders, cleanup.',
 'logistics', 'all_day', 22, false, '3 people',
 'Everything should have a recognizable home.'),

('friday', 'CREW 3 — Chill + comfort (5 people)',
 'Transform structures into usable spaces: rugs, pillows, seating, tables, chill furniture, dressing room, shade interiors, camper communal spaces.',
 'decoration', 'all_day', 24, false, '5 people', NULL),

('friday', 'CREW 4 — Decor + lighting (4 people)',
 'Signs, flags, camp identity, decorative lighting, final night lighting, public-facing areas, Stanton Island, public chill tent, entrance / frontage.',
 'decoration', 'all_day', 26, false, '4 people', NULL),

('friday', '📋 Friday contingencies — Plan A / B / C',
 'PLAN A — THE FUN DAY: infrastructure is already complete, so Friday is entirely clean → organize → decorate → test → chill. By evening, camp feels finished. || PLAN B — MORNING REPAIR / AFTERNOON FINISH: outstanding Thursday items are attacked all-hands first thing; once functional, organize, clean, furnish and decorate. Decoration gets compressed but camp still opens fully functional. || PLAN C — ZERO DECORATING UNTIL CAMP WORKS: all hands work the punch list in priority order — structures → power → water → kitchen → shower → cooling → lighting. Only after those systems function does anyone decorate.',
 'other', 'evening', 40, false, NULL,
 'A functioning camp beats a pretty camp.');

-- Keep the day-mission chain visible on the existing wrap-up item.
UPDATE build_schedule_items SET
  description = 'THE BUILD-WEEK FINISH LINE — Tuesday: we have shelter. Wednesday: we have spaces. Thursday: we have a functioning camp. Friday: we have a home.',
  updated_at = now()
WHERE day = 'friday' AND title = 'BUILD COMPLETE 🎉';
