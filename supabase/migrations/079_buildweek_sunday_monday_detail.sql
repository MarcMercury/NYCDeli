-- =====================================================
-- Migration 079: Build Week — detailed Sunday + Monday
-- =====================================================
-- Rewrites BUILD SUNDAY (Aug 23) and BUILD MONDAY (Aug 24)
-- from the "NYC DELI RATS — SUNDAY + BUILD MONDAY" plan:
--
--   SUNDAY  = Reno day. Arrivals, hotel check-ins, last-mile
--             shopping, vehicle/trailer/generator prep, load
--             the caravan, Sunday-night ready check.
--   MONDAY  = Playa day. Breakfast + crew split, survey &
--             placement, ALL major deliveries, NYC container
--             builder-bin run, generator + Tool Town power,
--             NYC chill tent, first two 30x50 shade frames,
--             builder personal tents.
--
-- Monday runs as three teams in two phases:
--   Phase 1: Placement / NYC Container / Survey
--   Phase 2: Generator / Container unload OR Survey Phase 2
--
-- Tuesday-Friday are left in place; a few connective items are
-- added so the week flows out of the new Monday (carry-over
-- contingency, water hookup Tuesday per Brian K.).
--
-- Preserved: layout-synced "Install ..." items (sort_order >= 200)
-- =====================================================

-- ─────────────────────────────────────────────────────
-- SUNDAY — AUG 23: Reno arrival, shopping, loading & prep
-- ─────────────────────────────────────────────────────
DELETE FROM build_schedule_items
WHERE day = 'sunday' AND sort_order BETWEEN 1 AND 199;

INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery, assigned_to, notes) VALUES
('sunday', '🎯 Sunday mission — get the caravan ready to roll',
 'Use Sunday to get every person, vehicle, supply, and piece of equipment ready so Monday can be spent establishing camp.',
 'logistics', 'all_day', 5, false, 'All builders',
 'Sunday is not a build day. Nothing rolls to playa Monday that was not prepped today.'),

('sunday', '✈️ Builder arrivals at RNO',
 'Builders land at Reno-Tahoe (RNO). Confirm every arrival date and time in advance.',
 'logistics', 'morning', 10, false, 'Travel leads',
 'Cross-check: Burning Man Camp Attendance Confirmation (Responses), Deli Camper Info & Travel, NYC Deli + BM 26.'),

('sunday', '🚐 Airport pickups & ground coordination',
 'Run the 15-passenger van, "Dua Lipa" and the reefer to move every builder from RNO to the correct location.',
 'logistics', 'morning', 15, false, 'Drivers',
 'Coordinate arrivals so nobody is stranded at the airport or at the wrong hotel.'),

('sunday', '🏨 Builder hotel check-ins',
 'Every builder checks into their respective hotel. Confirm room assignments and share the packing meet-up point.',
 'logistics', 'afternoon', 20, false, 'Travel leads', NULL),

('sunday', '📍 Confirm meet-up / vehicle packing location',
 'Lock in where the crew meets to pack and re-pack vehicles, and post it to the builder WhatsApp.',
 'logistics', 'morning', 25, false, 'Marc M.',
 'Goal for the day at this location: shopping, loading, vehicle prep.'),

('sunday', '🛒 Last-mile shopping — groceries, water, propane',
 'Grocery run, drinking water, and propane for the caravan.',
 'logistics', 'afternoon', 30, false, 'Shopping crew', NULL),

('sunday', '🛒 Last-mile shopping — build supplies, hardware & tools',
 'Pick up missing build supplies, hardware, and any tools identified during Reno inventory.',
 'logistics', 'afternoon', 35, false, 'Shopping crew',
 'Anything personal or camp-related that cannot wait until after Tuesday must be bought today.'),

('sunday', '🔧 Vehicle prep — "Treats" reefer',
 'Inspect, clean, fuel and load the refrigerated truck. Confirm reefer unit runs.',
 'logistics', 'afternoon', 40, false, NULL, NULL),

('sunday', '🔧 Vehicle prep — "Dua Lipa" dually',
 'Inspect, fuel and prep the dually for Monday container and bin runs.',
 'logistics', 'afternoon', 45, false, NULL,
 'Dua Lipa is the Monday NYC container vehicle — it must be clear and ready to haul bins.'),

('sunday', '🔧 Vehicle prep — 15-passenger van',
 'Inspect, fuel and prep the van for the Monday playa run.',
 'logistics', 'afternoon', 50, false, NULL, NULL),

('sunday', '⚡ Generator prep',
 'Check all fluids, coolant, and towing setup before the generator leaves Reno.',
 'electrical', 'afternoon', 55, false, 'Brian K.',
 'Known issue: generator can leak coolant in transit. Bring extra of all fluids.'),

('sunday', '🚛 Trailer check + tie-downs, straps & locks',
 'Check every trailer. Confirm tie-downs, ratchet straps, locks, and overall load security.',
 'logistics', 'afternoon', 60, false, NULL, NULL),

('sunday', '⛽ Fuel all vehicles + refill propane',
 'Top off every vehicle and refill all propane tanks before the caravan stages for Monday.',
 'logistics', 'afternoon', 65, false, 'Drivers', NULL),

('sunday', '🧑‍✈️ Confirm drivers & vehicle assignments',
 'Lock in who drives what, who rides where, and Monday departure times.',
 'logistics', 'afternoon', 70, false, 'Marc M.', NULL),

('sunday', '📦 Pack + load — final vehicle load check',
 'Final walk of every vehicle and trailer. Survey equipment stays accessible, not buried.',
 'logistics', 'evening', 75, false, 'All builders',
 'Sunday is about getting the caravan completely ready to roll.'),

('sunday', '🥡 Sunday builder dinner (possibly)',
 'Optional group dinner in Reno if the day''s work is finished.',
 'kitchen', 'evening', 80, false, 'House leads', NULL),

('sunday', '✅ Sunday night ready check',
 'Final go/no-go before Monday: vehicles loaded, vehicles fueled, survey equipment accessible, survey team confirmed, drivers confirmed, Monday departure times confirmed, delivery contacts confirmed, site map distributed, builder WhatsApp updated, everyone knows their Monday role.',
 'safety', 'evening', 90, false, 'Marc M.',
 'Do not go to bed until every line on this check is a yes.');

-- ─────────────────────────────────────────────────────
-- MONDAY — AUG 24: Survey, placement, deliveries, first builds
-- ─────────────────────────────────────────────────────
DELETE FROM build_schedule_items
WHERE day = 'monday' AND sort_order BETWEEN 1 AND 199;

INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery, assigned_to, notes) VALUES

-- Mission
('monday', '🎯 Monday mission — camp placed, measured & first structures up',
 'By end of day: camp officially placed, fully measured and flagged, major infrastructure correctly positioned, containers opened with builder gear staged, generator running, basic power + lighting, basic water (if delivered), NYC Deli chill tent up, builder personal tents up, and the first two 30x50 builder-tent shade frames built.',
 'logistics', 'all_day', 5, false, 'All builders',
 'If we achieve even half of this, Monday is an enormous win.'),

-- Reno morning
('monday', '🍳 Builder breakfast — Reno',
 'Last off-playa meal for many. Eat well before the drive.',
 'kitchen', 'morning', 10, false, 'House leads', NULL),

('monday', '🗣️ Final morning crew huddle — split the teams',
 'Split into the Playa team (placement / container / survey) and the Reno crew. Confirm every person knows their team and their lead.',
 'logistics', 'morning', 12, false, 'Marc M.', NULL),

('monday', '🚐 Playa team departs Reno',
 'Survey, placement and container crews caravan to Black Rock City.',
 'logistics', 'morning', 14, false, 'Playa team', NULL),

('monday', '🛒 Reno crew — shopping, vehicle prep & food',
 'Builders not on the playa team stay in Reno: remaining shopping runs, vehicle preparation and loading, prepare any needed food.',
 'logistics', 'all_day', 16, false, 'Reno crew', NULL),

-- Deliveries
('monday', '🚚 4 containers delivered',
 'All four containers arrive. Direct each one onto its flagged position and confirm orientation BEFORE the driver drops it.',
 'delivery', 'all_day', 20, true, 'Survey team',
 'Placement accuracy is critical — container placement is the foundation for everything else.'),

('monday', '🚚 Water system delivery',
 'Water tank / tower arrives and is set on its flagged position.',
 'delivery', 'all_day', 22, true, 'Survey team', NULL),

('monday', '🚚 Dumpster / greywater delivery',
 'Dumpster and greywater containment delivered to the flagged spot.',
 'delivery', 'all_day', 24, true, 'Survey team', NULL),

('monday', '🚚 Porta-potty delivery',
 'Porta-potties dropped on the flagged position, clear of delivery routes.',
 'delivery', 'all_day', 26, true, 'Survey team', NULL),

('monday', '🚚 Bike trailer delivery',
 'Community bike trailer positioned per the site map.',
 'delivery', 'all_day', 28, true, 'Survey team', NULL),

('monday', '🚚 Generator + power drop-off',
 'Generator delivered and set on its flagged location. Confirm safe clearance.',
 'delivery', 'all_day', 30, true, 'Brian K.',
 'Boston trailer arrives separately on Build Thursday — do not expect it Monday.'),

('monday', '🤝 Hub camps on site (~1:00–1:30 PM)',
 'Hub camps send their own people and run their own lines. We confirm they stay on flagged routes and clear of delivery paths.',
 'logistics', 'afternoon', 32, false, 'Brian K.',
 'Per Brian: power + water + 1 person Monday; water Tuesday.'),

-- PHASE 1
('monday', '1️⃣ PHASE 1 — TEAM 1: Placement Team',
 'Get placed by the Black Rock City Placement Team — CRITICAL. Confirm camp corner and orientation before anything is dropped.',
 'layout', 'morning', 40, false, 'Brian K.', NULL),

('monday', '1️⃣ PHASE 1 — TEAM 2: NYC Container Team (~2–3 PM)',
 'Use Dua Lipa to pick up all BUILDER bins from the NYC container. Organize and deliver bins to the correct location on the camp site.',
 'logistics', 'afternoon', 42, false, '4 builders',
 'Move with purpose. Place bins out of the way of major delivery routes — use the MAP to find spots.'),

('monday', '1️⃣ PHASE 1 — TEAM 3: Survey Team',
 'Mapping and flagging of the camp for the major delivery items.',
 'layout', 'morning', 44, false, 'Marc M. + 3', NULL),

('monday', '📐 Survey — measure camp boundaries & set the grid',
 'Establish the camp perimeter and grid: flags every 10 ft around the border, all four corners set — CRITICAL.',
 'layout', 'morning', 46, false, 'Survey team', NULL),

('monday', '📐 Survey — plot all immovable infrastructure',
 'Flag exact positions for: 4 containers, water tank / tower, generator / power system, dumpster / greywater, porta-potties, bike trailer, reefer — CRITICAL.',
 'layout', 'morning', 48, false, 'Survey team',
 'Preserve delivery-truck access routes. Every immovable position must be flagged BEFORE the trucks arrive.'),

-- PHASE 2
('monday', '2️⃣ PHASE 2 — TEAM 1 → Generator Team',
 'Once placement is handled, Team 1 moves to getting the generator up and running, and ONLY runs power for Tool Town and lights.',
 'electrical', 'afternoon', 60, false, 'Brian K. + 1',
 'One person moves over from the NYC Container Team. When power is up, move to assist with unpacking containers.'),

('monday', '2️⃣ PHASE 2 — TEAM 2 → Container unload or Survey Phase 2',
 'Continue until all builder bins are accounted for. PLAN A (containers arrived): begin unpacking key items for the NYC chill tent and shade frames. PLAN B (containers not arrived): assist with Survey Phase 2.',
 'logistics', 'afternoon', 62, false, 'NYC Container team', NULL),

('monday', '2️⃣ PHASE 2 — TEAM 3 → Container unload or Survey Phase 2',
 'PLAN A (containers arrived): begin unpacking key items for the NYC chill tent and shade frames. PLAN B (containers not arrived): assist with Survey Phase 2.',
 'layout', 'afternoon', 64, false, 'Survey team', NULL),

('monday', '📐 Survey Phase 2 — secondary layout flagging',
 'Once critical infrastructure is marked: flag the builder-tent shade footprint, the NYC Deli Rats chill tent, the public chill tent, and the personal tent areas.',
 'layout', 'afternoon', 66, false, 'Survey team', NULL),

('monday', '📦 Container unload — first-out items & Tool Town',
 'Open containers and pull builder-priority gear FIRST: tools, shade hardware, poles, connectors, ratchet straps, stakes / anchors, ladders, power tools, electrical supplies, lighting, chill-tent components. Create an organized tool area (Tool Town), a hardware area, and a shade-build staging area.',
 'logistics', 'afternoon', 68, false, 'Container crew',
 'Do NOT completely unload the containers — pull only what Monday''s crews need. Keep all delivery paths clear.'),

-- First builds
('monday', '⚡ Generator positioned, tested & basic power / lighting',
 'Confirm generator placement and safe clearance, inspect equipment, test, then establish initial distribution: work-area power for Tool Town and basic lighting.',
 'electrical', 'afternoon', 80, false, 'Brian K.',
 'Bring extra coolant — the generator has leaked in transit before. Stage remaining electrical gear for Tuesday.'),

('monday', '💧 Basic water available',
 'If the water delivery lands Monday, connect the pump and get drinking water accessible.',
 'plumbing', 'afternoon', 82, false, 'Brian K. + 1',
 'Full water hookup is Tuesday per Brian — Monday is basic access only.'),

('monday', '🏗️ NYC Deli Rats chill tent',
 'Stage chill-tent components, assemble the structure, raise it, install covering / shade, secure it, and run a final structural check.',
 'infrastructure', 'afternoon', 84, false, NULL, NULL),

('monday', '⛱️ First 30x50 builder-tent shade frame',
 'Stage shade poles, connectors, tarps / shade cloth and ratchet straps. Assemble, raise, square, install shade, strap and secure, then final structural check.',
 'shade', 'afternoon', 86, false, 'Shade team',
 'This structure goes up first because it becomes the home base for builder tents.'),

('monday', '⛱️ Second 30x50 builder-tent shade frame',
 'Repeat the build for the second 30x50 frame once the first is squared and strapped.',
 'shade', 'evening', 88, false, 'Shade team', NULL),

('monday', '⛺ Builder personal tents',
 'If the primary Monday objectives are complete and daylight remains: move personal gear into the builder area, set up builder tents under the completed shade, establish the sleeping area and basic lighting, and secure tents for wind.',
 'infrastructure', 'evening', 90, false, 'All builders', NULL),

('monday', '🎯 Stretch goal — all of the above done Monday',
 'Camp placed, measured, flagged, infrastructure positioned, generator running, chill tent up, two shade frames built, builders sleeping under shade.',
 'logistics', 'evening', 99, false, NULL,
 'Half of this list is still an enormous win.');

-- ─────────────────────────────────────────────────────
-- TUESDAY: connect the day to the new Monday
-- ─────────────────────────────────────────────────────
DELETE FROM build_schedule_items
WHERE day = 'tuesday' AND sort_order IN (12, 45);

INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery, assigned_to, notes) VALUES
('tuesday', '↩️ Carry over any unfinished Monday work',
 'First order of business: finish anything Monday did not complete — flagging, container staging, chill tent, the first two 30x50 frames, or builder tents.',
 'logistics', 'morning', 12, false, 'Build lead',
 'Monday is intentionally ambitious. Reset the plan against what actually got done before assigning Tuesday crews.'),
('tuesday', '💧 Water system hookup',
 'Connect and pressurize the water system: tank / tower, pump, and the first distribution runs.',
 'plumbing', 'afternoon', 45, false, 'Brian K.',
 'Per Brian: power + water + 1 person Monday, full water Tuesday. Hub camps run their own lines.');

UPDATE build_schedule_items
SET description = 'All-hands push to erect every remaining major shade structure across camp. The first two 30x50 builder-tent frames went up Monday — everything else goes up today.',
    updated_at = NOW()
WHERE day = 'tuesday' AND sort_order = 20;

-- ─────────────────────────────────────────────────────
-- PRE-BUILD: Monday instruction sheets that must exist first
-- ─────────────────────────────────────────────────────
DELETE FROM build_schedule_items
WHERE day = 'pre_build' AND sort_order BETWEEN 140 AND 195;

INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery, assigned_to, notes) VALUES
('pre_build', '📄 Write NYC container unload instructions',
 'Who, where and when — the bin pickup and delivery plan for Monday''s NYC Container Team.',
 'logistics', NULL, 140, false, NULL, 'Monday instruction sheet.'),
('pre_build', '📄 Write Monday generator instructions',
 'What to power, and where to stop: Tool Town and lights ONLY on Monday.',
 'electrical', NULL, 150, false, 'Brian K.', 'Monday instruction sheet.'),
('pre_build', '📄 Write flagging instructions + maps',
 'How to flag, with the maps: perimeter grid every 10 ft, immovable infrastructure, secondary layout.',
 'layout', NULL, 160, false, NULL, 'Monday instruction sheet.'),
('pre_build', '📄 Write NYC chill tent build instructions',
 'Step-by-step assembly instructions with images.',
 'infrastructure', NULL, 170, false, NULL, 'Monday instruction sheet.'),
('pre_build', '📄 Write shade structure instructions',
 'Maps, schema and placement for the 30x50 builder-tent frames.',
 'shade', NULL, 180, false, NULL, 'Monday instruction sheet.'),
('pre_build', '📄 Write container organizing plan',
 'Goals, lists and piles — how containers get staged and organized on unload.',
 'logistics', NULL, 190, false, NULL, 'Monday instruction sheet.');

-- ─────────────────────────────────────────────────────
-- Stage copy for the arrival + delivery days
-- ─────────────────────────────────────────────────────
UPDATE build_stages SET
  title = 'Arrival & Delivery Days',
  description = 'Sunday is the Reno day: arrivals, hotels, last-mile shopping, vehicle/trailer/generator prep, and loading the caravan. Monday is the playa day: survey and placement, all major deliveries, NYC container bin run, generator + Tool Town power, NYC chill tent, and the first two 30x50 builder-tent shade frames.',
  date_label = 'Sunday Aug 23 → Monday Aug 24',
  builder_notes = 'Sunday: nothing rolls to playa Monday that was not prepped Sunday — finish the Sunday night ready check before bed. Monday: placement accuracy is critical. Every immovable position must be flagged BEFORE the trucks arrive. Monday runs as three teams in two phases — Placement, NYC Container, and Survey in Phase 1; Generator and container unload (or Survey Phase 2) in Phase 2.',
  updated_at = NOW()
WHERE stage = 'monday';

-- ─────────────────────────────────────────────────────
-- Sync the Meeting 4 day-by-day agenda (Sun + Mon rewritten)
-- ─────────────────────────────────────────────────────
UPDATE build_meeting_sections s
SET body_md = E'**Sunday 8/23 — Reno: Arrival, Shopping, Loading & Prep**\n'
  || E'- Builder arrivals at RNO — confirm every arrival date/time\n'
  || E'- Airport pickups: 15-passenger van + Dua Lipa + reefer\n'
  || E'- Builder hotel check-ins; confirm the vehicle packing meet-up point\n'
  || E'- Last-mile shopping: groceries, water, propane, build supplies, hardware/tools\n'
  || E'- Vehicle + trailer prep: reefer, Dua Lipa, 15-pax van, generator, trailers\n'
  || E'- Fuel vehicles, refill propane, confirm tie-downs/straps/locks\n'
  || E'- Confirm drivers, vehicle assignments and Monday departure times\n'
  || E'- Pack + load — final vehicle load check\n'
  || E'- Sunday builder dinner (possibly)\n'
  || E'- **Sunday night ready check** — vehicles loaded + fueled, survey gear accessible, teams/drivers confirmed, delivery contacts confirmed, site map distributed, everyone knows their Monday role\n\n'
  || E'**Monday 8/24 — Survey, Placement, Major Deliveries & First Structures**\n'
  || E'- Breakfast in Reno (last off-playa meal for many) + final crew huddle\n'
  || E'- Split: Playa team vs. Reno crew (remaining shopping, vehicle prep, food)\n'
  || E'- *Phase 1* — TEAM 1 Placement (BRC placement team, confirm orientation)\n'
  || E'- *Phase 1* — TEAM 2 NYC Container (Dua Lipa, builder bins to camp ~2–3 PM)\n'
  || E'- *Phase 1* — TEAM 3 Survey (perimeter + 10 ft grid, flag all immovables)\n'
  || E'- Major deliveries all day: 4 containers, water system, dumpster, portos, bike trailer, generator\n'
  || E'- *Phase 2* — TEAM 1 → Generator: power for Tool Town + lights ONLY\n'
  || E'- *Phase 2* — TEAMS 2 & 3 → Plan A container unload / Plan B Survey Phase 2\n'
  || E'- Container unload: first-out tools + shade hardware, build Tool Town\n'
  || E'- Survey Phase 2: flag shade footprints, NYC chill tent, public chill tent, personal tents\n'
  || E'- Builds: NYC Deli Rats chill tent, first TWO 30x50 builder-tent shade frames\n'
  || E'- Builder personal tents under completed shade if daylight remains\n'
  || E'- Boston trailer arrives separately on Build Thursday\n\n'
  || E'**Tuesday 8/25 — Major Structures Up & Strapped (all day)**\n'
  || E'- Carry over anything Monday did not finish\n'
  || E'- Full builder crew on-site\n'
  || E'- Raise ALL remaining major shade structures — all day\n'
  || E'- Strap, anchor & wind-secure every structure\n'
  || E'- Install shade cloth across all frames\n'
  || E'- Build & strap the public chill tent\n'
  || E'- Water system hookup (Brian K.)\n\n'
  || E'**Wednesday 8/26 — Kitchen, Shower & Utilities**\n'
  || E'- Full container unpack & staged unloading\n'
  || E'- Kitchen build: deli & camp kitchen\n'
  || E'- Shower build\n'
  || E'- Finish & hook up the water system (tower, pump, distribution)\n'
  || E'- Finish & hook up ALL power distribution\n'
  || E'- Greywater system finished & tested\n'
  || E'- All utilities online — systems check\n'
  || E'- Swing City catering begins (first dinner)\n\n'
  || E'**Thursday 8/27**\n'
  || E'- Boston trailer arrives\n'
  || E'- Finish kitchen\n'
  || E'- Showers + sinks\n'
  || E'- Fly power to tents\n'
  || E'- Ice machines + swamp coolers\n'
  || E'- Water to chill tents\n'
  || E'- Mark arriving camper tent spots\n'
  || E'- Systems walkthrough\n\n'
  || E'**Friday 8/28**\n'
  || E'- Major infrastructure COMPLETE by Friday morning (per kickoff goal)\n'
  || E'- Signage, decor, side shade, roof deck\n'
  || E'- Safety equipment, kitchen stocking\n'
  || E'- Final plumbing / grey water test\n'
  || E'- Polaroid welcome wall\n'
  || E'- Final walkthrough\n'
  || E'- Deco / detail teams arrive (Fri/Sat) to handle finishing while core builders rest + explore',
    updated_at = now()
FROM build_meetings m
WHERE s.meeting_id = m.id
  AND m.slug = 'meeting-4'
  AND s.title ILIKE '%Day-by-Day%';
