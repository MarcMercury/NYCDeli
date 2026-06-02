-- =====================================================
-- Migration 063: Assimilate Meeting 1 (May 2026) Summary
-- =====================================================
-- Updates the Build Week meeting agendas AND the day-by-day
-- schedule to reflect decisions made + new info surfaced
-- during the May kickoff meetings (Mon + Tues combined
-- summary). Key changes:
--
--   • Reno housing pivots from 3 Fernley AirBnBs → J Resort
--     hotel (~8-11 dual-occupancy rooms, Sun→Tue checkout)
--   • Vehicle fleet named: "Treats" reefer truck, "Dua Lipa"
--     dually pickup (towing the generator), 15-pax van
--     SHARED with DAS Camp, bike trailer
--   • Monday on-playa crew capped at ~8-10 (BLM limit)
--   • Container deliveries Monday afternoon ~2-3 PM
--   • NYC container arrives Build Monday; Boston trailer Thurs
--   • Backup shelter = 60-ft military tent (60-100 capacity)
--   • Ice machine = first system activated (gen/water/power
--     stress test)
--   • Shade structure engineered for ~90 MPH wind
--   • Heat safety: no daytime build if >101-102°F →
--     shift to night work, stadium lighting
--   • Training videos distributed via WhatsApp
--   • Marc building interactive 3D camp model (Build Team only
--     for now)
--   • Build leads named: Marc (architecture), Aaron (logistics)
--
-- Also marks Meeting 1 as completed in spirit by surfacing
-- the decisions taken, and propagates the J Resort + vehicle
-- naming forward into Meetings 2-5 + every schedule item that
-- mentions Fernley AirBnBs by name.
-- =====================================================

BEGIN;

-- ─────────────────────────────────────────────────────
-- 1) MEETING 1 — replace section bodies with what was
--    actually discussed / decided in the May kickoff.
--    We keep sort_order stable so notes stay attached.
-- ─────────────────────────────────────────────────────

-- 1.4 Travel & Arrival — housing decision moved to J Resort
UPDATE build_meeting_sections SET
  title = 'Travel & Arrival — DECIDED at kickoff',
  body_md = E'**Decided in May kickoff:**\n- Housing pivots from dispersed Fernley AirBnBs → **J Resort hotel** in Reno (centralized)\n- Plan is ~8-11 **dual-occupancy** rooms, Sunday → Tuesday checkout\n- Brian is finalizing J Resort booking + final pricing\n- Strong preference for **Build Sunday** Reno arrivals — extra day for shopping + vehicle prep\n- Cluster flights so the **15-passenger van (shared with DAS Camp)** can shuttle groups RNO → hotel\n- All builders MUST be in Reno by Build Monday and on-playa by Build Tuesday morning\n- **No planned vehicle exits after Build Tuesday**\n\n**Still open:**\n- Final J Resort pricing + room count\n- Van shuttle schedule\n- Individual arrival logistics per builder',
  resource_links = '[{"label":"Builder Arrival Info","href":"/build-week"},{"label":"Build Roster","href":"/build-week"}]'::jsonb,
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-1')
  AND sort_order = 40;

-- 1.6 Food Reality Check — confirm Wed handoff + vegan + reefer
UPDATE build_meeting_sections SET
  body_md = E'**Confirmed at kickoff:**\n- Camp feeds builders, but early build is basic\n- Mon → Tues: **takeout + independent food**\n- Wed PM → Fri night: **Swing City catering** (HUBS sister camp, vegan options available)\n- All builders still bring personal food backups, water, emergency snacks\n- The **"Treats" reefer truck** can store personal refrigerated items\n- Tuesday builders should NOT expect a functioning camp kitchen yet',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-1')
  AND sort_order = 60;

-- 1.7 Work pace — add heat-safety policy from kickoff
UPDATE build_meeting_sections SET
  title = 'Work Pace + Heat Safety',
  body_md = E'**Tone set at kickoff:**\n- We work hard, but the goal is NOT to grind people from waking to sleeping\n- Shelter + safety come first\n- This is not a hazing ritual or "suffer culture" environment — injured / exhausted builders help no one\n\n**Heat safety policy (decided May):**\n- **No daytime construction if temps exceed ~101-102°F**\n- Build shifts to **nighttime operations** when necessary\n- Stadium lighting enables safe overnight construction\n- Required attire: closed-toe shoes, protective gear, safe working clothes (no sandals / no barefoot work)',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-1')
  AND sort_order = 70;

-- 1.8 Pre-next-meeting assignments — replace with the live action items
UPDATE build_meeting_sections SET
  title = 'Active Action Items (out of Meeting 1)',
  body_md = E'**All builders:**\n- Send finalized arrival logistics immediately\n- Watch all training videos when distributed via **WhatsApp** (ratchet straps, core build procedures, general safety)\n- Purchase Burner Express tickets when available\n- Prepare personal food/water backup systems\n\n**Marc:**\n- Finalize + distribute the interactive **3D camp planning model** to the Build Team\n- Schedule follow-up meetings (June / July / August)\n\n**Brian:**\n- Finalize J Resort hotel bookings\n- Finalize who is traveling when, with whom, in what vehicle\n\n**Aaron / Brian:**\n- Confirm generator-towing driver (behind "Dua Lipa")\n- Finalize shuttle coordination\n\n**Reno planning team:**\n- Organize trailers\n- Sequence priority unloading\n- Prepare Monday-first infrastructure staging',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-1')
  AND sort_order = 80;

-- 1.9 Decisions block — fill in what got decided
UPDATE build_meeting_sections SET
  title = 'Decisions MADE in Meeting 1 (May)',
  body_md = E'- ✅ Housing: **J Resort hotel** (centralized) replaces dispersed AirBnBs\n- ✅ Vehicle fleet named: **"Treats" reefer**, **"Dua Lipa" dually pickup**, 15-pax van shared with DAS Camp, bike trailer\n- ✅ Monday on-playa crew **capped at ~8-10 builders** (BLM access limit)\n- ✅ All builders in Reno by Build Monday; on-playa by Build Tuesday AM\n- ✅ Heat-safety policy: no daytime work >~102°F, shift to night with stadium lighting\n- ✅ Build leads: **Marc** (architecture / construction) + **Aaron** (logistics)\n- ✅ Training videos distributed via WhatsApp pre-playa\n- ✅ Marc owns the interactive 3D camp model (Build Team exclusive)\n\n**Still pending after Meeting 1:**\n- Final Monday on-playa crew roster\n- J Resort pricing + final room count\n- Van shuttle schedule\n- Generator-towing driver assignment (behind "Dua Lipa")\n- Final camper count for 3D modeling\n- Individual arrival logistics\n- Dietary restriction collection',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-1')
  AND sort_order = 90;

-- 1.3 High-Level Overview — swap "Fernley houses" for J Resort
UPDATE build_meeting_sections SET
  body_md = E'Explain the rough arc (updated post-kickoff):\n- Pre-playa: planning, maps, inventory, Reno organization, training videos via WhatsApp\n- **Sunday / Monday:** arrivals, J Resort hotel check-in, vehicle prep, survey team (~8-10), placement, camp layout\n- **Tuesday:** full builder arrival on-playa, shade, personal tents, basic systems, **ice machine fired up** as first-system stress test\n- **Wednesday:** kitchen, chill tents, staged container unloading, Swing City food begins\n- **Thursday:** showers, sinks, grey water, power, swamp coolers, tent placement\n- **Friday morning:** major infrastructure COMPLETE — builders get rest / explore time before camp opens',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-1')
  AND sort_order = 30;

-- ─────────────────────────────────────────────────────
-- 2) MEETING 2 (June) — fold in survey-team cap +
--    J Resort references
-- ─────────────────────────────────────────────────────
UPDATE build_meeting_sections SET
  body_md = E'**Updated post-May kickoff:**\n- Survey team is the on-playa Monday crew, **capped at ~8-10 builders** (BLM access limit)\n- Builders not on the survey team stay in Reno at **J Resort** for vehicle prep + Costco/shopping runs\n- Survey team must complete: boundary measurement, immovable item flagging, delivery staging — all BEFORE Monday afternoon deliveries (~2-3 PM)\n- Tools needed: measuring wheel, flags, ropes, stakes, laminated site map',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-2')
  AND sort_order = 40;

-- ─────────────────────────────────────────────────────
-- 3) MEETING 3 (July) — add 90 MPH shade rating, ice
--    machine first-system note, container delivery time
-- ─────────────────────────────────────────────────────
UPDATE build_meeting_sections SET
  body_md = E'Cover:\n- 30x50 shade sections, engineered for **~90 MPH wind rating**\n- Builder tent shade is first priority\n- Shade over community areas comes next\n- Shade structure sequence: layout poles, connectors, vertical poles, horizontal poles, ratchet straps, shade cloth\n- Pre-drilling / pre-marking poles during Reno prep to reduce on-playa custom work\n- Training video on ratchet straps + core build procedures distributed via WhatsApp before playa\n\nThe notes specifically call out shade structure questions around pre-drilling, compatible poles, ratchet strapping, and reducing on-playa custom work.',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-3')
  AND sort_order = 10;

UPDATE build_meeting_sections SET
  body_md = E'Cover:\n- Generator transported behind **"Dua Lipa" (dually pickup)** — need confident tow-capable driver (Aaron / Brian to confirm)\n- Generator testing on Monday\n- Extra generator fluids (known issue: may leak coolant in transit)\n- Basic power hookup\n- Breakout boxes\n- Charging drill batteries\n- Power distribution to hub camps\n- Flying power to individual tent areas\n- **Ice machine is the first system activated** — early stress test for generator loads, water systems, and power distribution\n- Stadium lighting infrastructure for night builds + dust storm navigation',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-3')
  AND sort_order = 30;

UPDATE build_meeting_sections SET
  body_md = E'Cover:\n- Basic kitchen Tuesday\n- Full deli kitchen Wednesday\n- **Swing City catering Wednesday PM → Friday night** (HUBS sister camp, vegan options available)\n- **"Treats" reefer truck** stores personal refrigerated items + camp perishables\n- Propane backup\n- Electric kettle\n- Early food limitations Mon → Tues = takeout + independent food',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-3')
  AND sort_order = 50;

UPDATE build_meeting_sections SET
  body_md = E'Cover:\n- **NYC container arrives Build Monday; Boston trailer arrives Thursday**\n- Monday deliveries land ~2-3 PM — survey team must have placement flagged by then\n- Do not unload everything at once\n- Pull items by stage and need\n- Keep things that are not needed in the back / container\n- Builder-first gear needs to be accessible (front of container per Reno prep)\n- Wind risk: pillows, light objects, loose items\n\nThe notes specifically identify staged unloading as a major improvement because emptying everything wastes time and creates wind risk.',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-3')
  AND sort_order = 60;

-- ─────────────────────────────────────────────────────
-- 4) MEETING 4 (August) — vehicle fleet by name
-- ─────────────────────────────────────────────────────
UPDATE build_meeting_sections SET
  body_md = E'Cover the named fleet:\n- **"Treats"** refrigerated truck (reefer)\n- **"Dua Lipa"** dually pickup — tows the generator (need confirmed tow-capable driver)\n- **15-passenger van** SHARED with DAS Camp\n- **Bike trailer**\n- Costco / shopping run\n- Propane refill\n- Fuel\n- Luggage transport\n- Who drives what\n- Who arrives when\n\n**Still open from Meeting 1:** generator-towing driver assignment (Aaron / Brian own this).',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-4')
  AND sort_order = 40;

-- ─────────────────────────────────────────────────────
-- 5) MEETING 5 — replace day-by-day with the
--    refined post-kickoff sequence + add J Resort
-- ─────────────────────────────────────────────────────
UPDATE build_meeting_sections SET
  body_md = E'Confirm:\n- Who arrives Sunday\n- Who arrives Monday\n- Who needs airport pickup at RNO\n- Who is going directly to **J Resort**\n- Who is in the ~8-10 person Monday on-playa survey crew\n- Who is going to playa Tuesday with the full caravan\n- Emergency contacts\n\n**Reminder:** no planned vehicle exits after Build Tuesday.',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-5')
  AND sort_order = 10;

UPDATE build_meeting_sections SET
  body_md = E'**Sunday 8/23**\n- Reno arrivals (cluster on shared flights)\n- Costco / supply shopping\n- Vehicle + trailer prep\n- **J Resort hotel check-in**\n- Takeout dinner\n- Possible early playa survey-crew prep\n\n**Monday 8/24**\n- ~8-10 person survey team to playa (BLM access cap)\n- Camp placement\n- Boundaries measured, immovable item flags placed\n- Container deliveries arrive ~2-3 PM (NYC container + water tank + dumpster + portos + bike trailer)\n- Generator tested (behind "Dua Lipa")\n- Basic power / water / lighting online\n- 60-ft military tent or initial shelter raised\n- Remaining builders finish vehicle prep at J Resort\n\n**Tuesday 8/25**\n- J Resort checkout (10am)\n- Full caravan to playa in "Treats", "Dua Lipa", 15-pax van (shared with DAS Camp)\n- Builder orientation\n- Shade over builder tents (priority #1)\n- Personal tents\n- Drill batteries charging\n- Power and water distribution\n- Basic kitchen\n- **Ice machine fired up** as first-system stress test\n\n**Wednesday 8/26**\n- Swing City dinner begins\n- Continue shade\n- Staged container unloading\n- Deli kitchen online\n- Camp chill tent\n- Public chill tent\n- Grey water\n- Additional electrical\n\n**Thursday 8/27**\n- Boston trailer arrives\n- Finish kitchen\n- Showers + sinks\n- Fly power to tents\n- Ice machines + swamp coolers\n- Water to chill tents\n- Mark arriving camper tent spots\n- Systems walkthrough\n\n**Friday 8/28**\n- Major infrastructure COMPLETE by Friday morning (per kickoff goal)\n- Signage, decor, side shade, roof deck\n- Safety equipment, kitchen stocking\n- Final plumbing / grey water test\n- Polaroid welcome wall\n- Final walkthrough\n- Deco / detail teams arrive (Fri/Sat) to handle finishing while core builders rest + explore',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-5')
  AND sort_order = 20;

UPDATE build_meeting_sections SET
  body_md = E'Cover (confirmed in May kickoff):\n- Hydration\n- Heat — **no daytime build if >~101-102°F**, shift to night with stadium lighting\n- Required attire: closed-toe shoes, protective gear, safe working clothes (NO sandals, NO barefoot work)\n- Gloves / eye protection\n- Headlamps\n- Working around vehicles ("Treats" reefer, "Dua Lipa" dually + gen tow)\n- Working around containers (NYC arrives Mon, Boston arrives Thurs)\n- Power safety\n- Generator safety\n- Ratchet strap / lag bolt safety (training video distributed via WhatsApp pre-playa)\n- Dust / wind shutdown expectations\n- No one works beyond their ability — injured / exhausted builders help no one',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-5')
  AND sort_order = 30;

UPDATE build_meeting_sections SET
  body_md = E'Take final questions on:\n- Flights\n- Airport pickup\n- **J Resort** room assignments\n- Playa arrival\n- Food (takeout Mon→Tues, Swing City Wed PM → Fri night)\n- Personal gear\n- Safety\n- Assignments\n- 3D camp model (Marc to distribute pre-playa)\n- Anything confusing',
  updated_at = NOW()
WHERE meeting_id = (SELECT id FROM build_meetings WHERE slug = 'meeting-5')
  AND sort_order = 60;

-- ─────────────────────────────────────────────────────
-- 6) BUILD STAGES — refresh builder_notes to drop
--    "Fernley AirBnB" wording and surface J Resort.
-- ─────────────────────────────────────────────────────
UPDATE build_stages SET
  description = 'Builders fly into Reno (mostly Build Sunday), check into J Resort hotel, then shuttle to playa. Sunday: advance crew sets boundaries and stages for delivery. Monday: ~8-10 person on-playa survey team works while remaining builders prep vehicles and shop in Reno.',
  builder_notes = 'Housing: **J Resort hotel** in Reno, ~8-11 dual-occupancy rooms, Sun check-in → Tue checkout (Brian owns booking). Fly to Reno EARLY on Sun if you can: extra time for shopping, vehicle prep, and easier RNO→hotel shuttle in the 15-pax van (shared with DAS Camp). Monday on-playa survey team capped at ~8-10 (BLM access limit); everyone else goes on-playa Build Tuesday AM. All builders MUST be in Reno by Build Monday night. NO planned vehicle exits after Build Tuesday. Food Sun→Tue is takeout + grab-and-go.',
  updated_at = NOW()
WHERE stage = 'monday';

UPDATE build_stages SET
  builder_notes = 'Build Tuesday: J Resort checkout by 10am, full caravan to playa in "Treats" (reefer), "Dua Lipa" (dually + gen tow), and the 15-pax van (shared with DAS Camp). Main builder crew on-site by midday. Food today is still grab-and-go — Swing City catering does not start until Wed PM. No food service from camp yet — bring water and snacks. Shade over builder tents = #1 priority. **Ice machine fires up today** as first-system stress test (gen / water / power).',
  updated_at = NOW()
WHERE stage = 'tuesday';

UPDATE build_stages SET
  builder_notes = 'Build week 2026 starts SUNDAY 8/23. Pre-playa: confirm flights, fill availability poll, watch WhatsApp training videos (ratchet straps + core build procedures), finalize site map and immovable item placement, organize gear in Reno. NYC container, water tower, and bike trailer arrive Build Monday ~2-3 PM; Boston trailer arrives Thursday. The ~8-10 person Sunday/Monday survey crew must have boundaries measured and placement flagged before Monday deliveries. Marc is distributing an interactive 3D camp model to the Build Team pre-playa.',
  updated_at = NOW()
WHERE stage = 'planning';

UPDATE build_stages SET
  builder_notes = 'Wednesday is the food handoff: morning is still grab-and-go. From Wed PM through Friday night, our HUBS sister camp Swing City caters all meals (great kitchen, vegan options available). "Treats" reefer stores perishables. Empty containers in stages — never all at once. Big kitchen push today.',
  updated_at = NOW()
WHERE stage = 'wednesday';

UPDATE build_stages SET
  builder_notes = 'Boston trailer arrives today. Camp eats with Swing City for all meals through tonight. Focus shifts from structure to systems: showers, sinks, grey water, power to tent areas, swamp coolers, ice machines. Mark tent placements for arriving campers.',
  updated_at = NOW()
WHERE stage = 'thursday';

UPDATE build_stages SET
  builder_notes = 'Major infrastructure should be COMPLETE by Friday morning (per kickoff goal) — builders earn rest / explore time. Swing City catering through tonight. Deco / detail teams arrive Fri/Sat to finish signage, decor, side shade, roof deck, polaroid welcome wall while core builders transition into camp mode.',
  updated_at = NOW()
WHERE stage = 'friday';

-- ─────────────────────────────────────────────────────
-- 7) BUILD SCHEDULE ITEMS — rename Fernley AirBnB items
--    to J Resort and name the vehicle fleet.
-- ─────────────────────────────────────────────────────

-- Pre-build: AirBnB → J Resort
UPDATE build_schedule_items SET
  title = '🏨 Confirm J Resort hotel bookings',
  description = 'Lock in ~8-11 dual-occupancy rooms at J Resort (Reno) for Sun 8/23 → Tue 8/25. Centralized housing replaces dispersed Fernley AirBnBs. Confirm room count vs builder roster + final pricing.',
  assigned_to = 'Brian',
  notes = 'Decided at May kickoff: pivot from 3 Fernley AirBnBs to J Resort. Brian owns the booking.',
  updated_at = NOW()
WHERE day = 'pre_build' AND title = '🏠 Confirm Fernley AirBnB bookings';

UPDATE build_schedule_items SET
  description = 'Send poll to all builders: who has tickets, who can fly in on Build Sunday vs Monday, who needs RNO pickup. Goal is to cluster on shared flights so the 15-pax van (shared with DAS Camp) can shuttle groups RNO → J Resort.',
  updated_at = NOW()
WHERE day = 'pre_build' AND title = '✈️ Builder flight + availability poll';

UPDATE build_schedule_items SET
  description = 'Coordinate the 15-passenger van shared with DAS Camp that will shuttle RNO → J Resort → playa. Confirm pickup time aligns with the largest Sunday/Monday flight cluster.',
  notes = 'Van is SHARED with DAS Camp — coordinate scheduling with their build lead.',
  updated_at = NOW()
WHERE day = 'pre_build' AND title = '🚐 Confirm 15-passenger van rental';

UPDATE build_schedule_items SET
  description = 'Choose the ~8-10 person on-playa survey crew for Build Monday (BLM access cap). They handle boundary measuring + delivery staging while the rest stay at J Resort for vehicle prep and shopping.',
  updated_at = NOW()
WHERE day = 'pre_build' AND title = '🛰️ Pick on-playa survey team for Build Monday';

-- Sunday
UPDATE build_schedule_items SET
  description = 'Most builders fly into Reno today. Earlier flights are strongly preferred. Cluster on shared flights so the 15-pax van (shared with DAS Camp) can shuttle groups RNO → J Resort.',
  updated_at = NOW()
WHERE day = 'sunday' AND title = '✈️ RNO arrivals — Build Sunday';

UPDATE build_schedule_items SET
  title = '🛒 Reno shopping run',
  description = 'Last-mile shopping for groceries, ice, missing build supplies, water, propane, etc. Use the extra Sunday hours that early flights buy you.',
  updated_at = NOW()
WHERE day = 'sunday' AND title = '🛒 Reno / Fernley shopping run';

UPDATE build_schedule_items SET
  title = '🏨 Check into J Resort hotel',
  description = 'Centralized check-in at J Resort hotel in Reno (~8-11 dual-occupancy rooms). Assign builders to rooms; share room numbers + key info in builder WhatsApp.',
  notes = 'J Resort booking owned by Brian. Sun check-in → Tue checkout.',
  updated_at = NOW()
WHERE day = 'sunday' AND title = '🏠 Check into Fernley AirBnBs (4pm)';

UPDATE build_schedule_items SET
  title = '🔧 Vehicle + trailer prep at J Resort',
  description = 'Final prep of vehicles ("Treats" reefer, "Dua Lipa" dually + generator, 15-pax van), trailers, and miscellaneous gear at the hotel. Extra Sunday hands here meaningfully reduces Monday load.',
  updated_at = NOW()
WHERE day = 'sunday' AND title = '🔧 Vehicle + trailer prep at the houses';

UPDATE build_schedule_items SET
  title = '🥡 Reno takeout dinner',
  description = 'Dinner is local Reno takeout (camp covers builder meals). Coordinate orders in builder WhatsApp.',
  notes = 'Camp feeds builders Sun→Fri. Sun→Tue is takeout + grab-and-go; Swing City catering starts Wed PM.',
  updated_at = NOW()
WHERE day = 'sunday' AND title = '🥡 Fernley takeout dinner';

-- Monday
UPDATE build_schedule_items SET
  title = '🍳 Breakfast at J Resort',
  description = 'Breakfast at the hotel — quick stuff before splitting into survey crew + Reno crew.',
  assigned_to = 'House leads',
  updated_at = NOW()
WHERE day = 'monday' AND title = '🍳 Home breakfast at the AirBnBs';

UPDATE build_schedule_items SET
  description = 'On-playa survey crew (~8-10 builders, BLM cap) drives to playa Monday morning to measure camp boundaries, flag immovable item positions, and stage for Monday afternoon deliveries (~2-3 PM).',
  notes = 'Per Sunday plan — boundaries + immovable flags MUST be set before Monday deliveries arrive ~2-3 PM.',
  updated_at = NOW()
WHERE day = 'monday' AND title = '🛰️ Survey team departs for playa';

UPDATE build_schedule_items SET
  title = '🛒 Reno crew: shopping + vehicle prep',
  description = 'Builders not on the survey team finish vehicle prep, Costco / last shopping runs, propane refill, fuel, and any remaining prep — all based out of J Resort.',
  updated_at = NOW()
WHERE day = 'monday' AND title = '🛒 Final Fernley shopping + vehicle prep';

UPDATE build_schedule_items SET
  title = '🥡 Reno takeout lunch + dinner',
  description = 'Lunch and dinner at J Resort are local Reno takeout. Survey team eats on-playa from packed food / coolers.',
  updated_at = NOW()
WHERE day = 'monday' AND title = '🥡 Fernley takeout lunch + dinner';

UPDATE build_schedule_items SET
  title = '🛏️ All builders in Reno by tonight',
  description = 'Hard requirement: every builder officially on the Build Team must be in Reno (J Resort) by Build Monday night. Late arrivers — coordinate pickup.',
  notes = 'Non-negotiable per May kickoff. No planned vehicle exits after Build Tuesday.',
  updated_at = NOW()
WHERE day = 'monday' AND title = '🛏️ All builders in Build Houses by tonight';

-- Tuesday
UPDATE build_schedule_items SET
  title = '🍳 Last J Resort breakfast',
  description = 'Final breakfast at the hotel. Pack out coolers / leftovers for the playa drive.',
  updated_at = NOW()
WHERE day = 'tuesday' AND title = '🍳 Home breakfast — last AirBnB breakfast';

UPDATE build_schedule_items SET
  title = '🏨 J Resort checkout — 10am',
  description = 'J Resort checkout is 10am. Pack everything out, double-check rooms, return keys.',
  notes = 'No planned vehicle exits after today.',
  updated_at = NOW()
WHERE day = 'tuesday' AND title = '🏠 AirBnB checkout — 10am sharp';

UPDATE build_schedule_items SET
  title = '🚐 Caravan Reno → playa',
  description = 'Full caravan to playa: "Treats" (reefer), "Dua Lipa" (dually towing generator), 15-pax van (shared with DAS Camp), plus personal vehicles. Main builder crew on-site by midday.',
  updated_at = NOW()
WHERE day = 'tuesday' AND title = '🚐 Caravan Fernley → playa';

UPDATE build_schedule_items SET
  title = '🥪 Grab-and-go food for the day',
  description = 'No camp food service yet today. Eat from coolers, snacks, and Reno grab-and-go. Swing City catering does NOT start until Wednesday PM.',
  updated_at = NOW()
WHERE day = 'tuesday' AND title = '🥪 Bring-your-own / Fernley grab-and-go for the day';

-- ─────────────────────────────────────────────────────
-- 8) NEW build schedule items — add the items raised
--    in the May kickoff that weren't on the schedule.
-- ─────────────────────────────────────────────────────
INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery, assigned_to, notes) VALUES

-- Pre-build additions
('pre_build', '📹 Distribute training videos via WhatsApp',
  'Marc / Aaron record + distribute short instructional videos in the builder WhatsApp: ratchet straps, core build procedures, general safety practices. All builders watch before playa.',
  'logistics', NULL, 6, false, 'Marc / Aaron', 'Decided at May kickoff. All builders responsible for watching pre-playa.'),
('pre_build', '🗺️ Finalize + distribute 3D camp model',
  'Marc finalizes the interactive 3D build model (full camp layout, labels, build schedules, inventory references, shade structure guidance, construction sequencing) and distributes to the Build Team.',
  'logistics', NULL, 7, false, 'Marc', 'Build Team exclusive for now. Helps visual learners + reduces on-playa confusion.'),
('pre_build', '🚛 Confirm generator-towing driver',
  'Aaron / Brian confirm a confident tow-capable driver for the generator behind "Dua Lipa" (dually pickup). Open item from May kickoff.',
  'logistics', NULL, 8, false, 'Aaron / Brian', 'Open action item from Meeting 1.'),

-- Monday additions: container delivery window + ice machine + military tent
('monday', '🚚 NYC container delivery (~2-3 PM)',
  'NYC container arrives on Build Monday afternoon (~2-3 PM). Survey crew must have boundaries + immovable flags set before delivery hits.',
  'delivery', 'afternoon', 45, true, 'Survey team', 'Boston trailer arrives separately on Build Thursday.'),
('monday', '⛺ Raise 60-ft military tent (backup shelter)',
  'Set up the 60-ft military / communal tent as backup shelter (capacity ~60-100 depending on layout). Critical for builder safety + heat refuge.',
  'infrastructure', 'afternoon', 95, false, 'Monday crew', 'Backup if individual tent placement slips. Decided at May kickoff.'),

-- Tuesday addition: ice machine as first-system stress test
('tuesday', '🧊 Fire up ice machine (first-system stress test)',
  'Bring the ice machine online as the very first deli system — doubles as a stress test for generator loads, water systems, and power distribution. If this runs clean, the rest of the systems sequence is safe to start.',
  'electrical', 'afternoon', 50, false, 'Power + plumbing crew', 'Per May kickoff: ice machine is intentionally first.'),

-- Thursday addition: Boston trailer arrival
('thursday', '🚚 Boston trailer arrives',
  'The Boston trailer (separate from the NYC container that landed Monday) arrives today. Coordinate unloading with the active build crews so it does not interrupt systems work.',
  'delivery', NULL, 2, true, 'Delivery crew', 'Per May kickoff: NYC container Build Monday, Boston trailer Build Thursday.')

ON CONFLICT DO NOTHING;

COMMIT;
