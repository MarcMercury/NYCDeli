-- =====================================================
-- Migration 073: Build Week schedule — goal-based refinement
-- =====================================================
-- Refines the on-playa build plan per the updated priorities:
--
--   SUNDAY   = NO ONE is on playa yet. Collect and pack all
--              resources, food, and people into the trucks/reefer/
--              van in Reno so the caravan can roll first thing
--              Monday. (Reno arrivals + hotel + packing only.)
--   MONDAY   = First playa day. Measure the camp plot, flag the
--              key large-item delivery spots, unpack the delivered
--              containers and organize. THEN raise the first
--              30×50 shade structure (builder tents), then the NYC
--              camp chill tent, then builder personal tents if time.
--   TUESDAY  = All hands on the REMAINDER of the shade structure.
--              A small team brings up JUST enough power to run the
--              chill-tent swamp coolers + ice machine — nothing
--              else — then rejoins the shade push. Public chill
--              tent only if time. Shade fully up = golden.
--   WEDNESDAY= Shower, power, kitchen, and public chill-tent
--              swamp coolers + ice machine. If all of these are
--              complete today, we have WON build — everything
--              after is dressing.
--   THU/FRI  = Dressing: blankets, pillows, roof deck, comfort
--              detail on every space, and organizing gear for
--              arriving campers.
--
-- Also moves the layout-synced "Install …" items onto the day
-- that matches the new sequence, and re-syncs the Meeting 4
-- day-by-day agenda.
-- =====================================================

-- ── SUNDAY: no on-playa install items (nobody is on playa yet) ──
UPDATE build_schedule_items SET day = 'monday',   updated_at = now()
  WHERE day = 'sunday' AND title LIKE 'Install%Generator%';
UPDATE build_schedule_items SET day = 'wednesday', updated_at = now()
  WHERE day = 'sunday' AND title LIKE 'Install%Swamp Cooler%';
UPDATE build_schedule_items SET day = 'thursday', updated_at = now()
  WHERE day = 'sunday' AND title LIKE 'Install%Table%';
UPDATE build_schedule_items SET day = 'thursday', updated_at = now()
  WHERE day = 'sunday' AND title LIKE 'Install%Common Area%';

-- Sunday framing: pack the trucks
INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery) VALUES
  ('sunday', '📦 Pack & load the trucks',
   'Collect and pack all resources, food, and gear into the trucks, reefer, and van. Nobody arrives on playa until Monday — Sunday is entirely about loading up so the caravan can roll first thing Monday morning.',
   'logistics', 'afternoon', 6, false);

-- ── MONDAY: shade item = first 30×50 builder-tent structure only ──
UPDATE build_schedule_items SET
  title = 'Raise the first 30×50 shade structure (builder tents)',
  description = 'Once measuring, flagging, and unpacking are done, erect and strap the first 30×50 shade structure — this is where the builder tents live. First structure up before anything else.',
  updated_at = now()
WHERE day = 'monday' AND title = 'Raise builder-tent shade section';

UPDATE build_schedule_items SET
  description = 'Builders pitch personal tents under the completed builder-tent shade section — if there is time and daylight left. Getting all of the above done Monday is the goal.',
  updated_at = now()
WHERE day = 'monday' AND title = 'Set up builder personal tents';

-- Monday: only the builder-tent shade goes up today; remaining shade + kitchen/water move out
UPDATE build_schedule_items SET day = 'tuesday',   updated_at = now()
  WHERE day = 'monday' AND title LIKE 'Install%Shade Structure%';
UPDATE build_schedule_items SET day = 'wednesday', updated_at = now()
  WHERE day = 'monday' AND title LIKE 'Install%Water Station%';
UPDATE build_schedule_items SET day = 'wednesday', updated_at = now()
  WHERE day = 'monday' AND title LIKE 'Install%Water Pump%';
UPDATE build_schedule_items SET day = 'wednesday', updated_at = now()
  WHERE day = 'monday' AND title LIKE 'Install%Greywater Tank%';
UPDATE build_schedule_items SET day = 'wednesday', updated_at = now()
  WHERE day = 'monday' AND title LIKE 'Install%Shower Container%';

INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery) VALUES
  ('monday', '🎯 Stretch goal — all of the above done Monday',
   'If we measure, flag, unpack/organize, and get the builder-tent 30×50 shade, the NYC camp chill tent, and our personal tents up all in one day — that is an amazing Monday.',
   'logistics', 'evening', 99, false);

-- ── TUESDAY: remainder of shade (all hands) + minimal power for cooling ──
UPDATE build_schedule_items SET
  title = 'Raise the REMAINDER of the shade structures — ALL DAY',
  description = 'All-hands push to erect every remaining major shade structure across camp. This is the priority — everyone on shade.',
  updated_at = now()
WHERE day = 'tuesday' AND title = 'Raise all major shade structures — ALL DAY';

UPDATE build_schedule_items SET
  description = 'Stretch goal — only if there is time after the shade structures are up and strapped, start on the public chill tent.',
  updated_at = now()
WHERE day = 'tuesday' AND title = 'Build public chill tent';

-- Tuesday: kitchen installs belong to Wednesday's kitchen build
UPDATE build_schedule_items SET day = 'wednesday', updated_at = now()
  WHERE day = 'tuesday' AND title LIKE 'Install%Prep Area%';
UPDATE build_schedule_items SET day = 'wednesday', updated_at = now()
  WHERE day = 'tuesday' AND title LIKE 'Install%Service Area%';
UPDATE build_schedule_items SET day = 'wednesday', updated_at = now()
  WHERE day = 'tuesday' AND title LIKE 'Install%Refrigerated Truck%';
UPDATE build_schedule_items SET day = 'wednesday', updated_at = now()
  WHERE day = 'tuesday' AND title LIKE 'Install%Grill%';

INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery) VALUES
  ('tuesday', 'Power (minimal) — chill-tent swamp coolers + ice machine ONLY',
   'A small team brings up JUST enough power to run the chill-tent swamp coolers and the ice machine — nothing else. As soon as that is hooked up, they move back to shade so it is all-hands on the shade structures.',
   'electrical', 'morning', 15, false),
  ('tuesday', '🎯 Shade fully up & strapped by Tuesday = golden',
   'If every shade structure is raised, strapped, and wind-secured by end of Tuesday, we are golden.',
   'shade', 'evening', 70, false);

-- ── WEDNESDAY: shower + power + kitchen + public chill-tent cooling = won ──
INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery) VALUES
  ('wednesday', 'Public chill tent — swamp coolers + ice machine',
   'Bring cooling to the public chill tent: swamp coolers and ice machine online.',
   'electrical', 'afternoon', 45, false),
  ('wednesday', '🏆 Shower + Power + Kitchen + public chill-tent cooling done = we WON build',
   'If the shower, power, kitchen, and public chill-tent swamp coolers + ice machine are all complete by tonight, we have won build. Everything after this is dressing.',
   'safety', 'afternoon', 80, false);

-- ── THURSDAY / FRIDAY: dressing ──
INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery) VALUES
  ('thursday', '✨ Everything from here is dressing',
   'Core build is done. From here it is comfort, décor, and getting the camp camper-ready.',
   'decoration', 'morning', 5, false),
  ('thursday', '🛋️ Lay out blankets, pillows & soft goods',
   'Dress the chill tents and communal spaces with blankets, pillows, rugs, and soft goods.',
   'decoration', 'afternoon', 100, false),
  ('thursday', '✨ Comfort & detail pass on every space',
   'Detail work across all spaces — make each one comfortable and inviting.',
   'decoration', 'afternoon', 110, false),
  ('thursday', '📦 Organize & stage gear for arriving campers',
   'Sort and stage everything campers will need when they arrive.',
   'logistics', 'afternoon', 120, false);

-- =====================================================
-- Re-sync the Meeting 4 day-by-day agenda to the new plan
-- =====================================================
UPDATE build_meeting_sections s
SET body_md = E'**Sunday 8/23 — Pack & Roll (Reno, no playa yet)**\n'
  || E'- Reno arrivals (cluster on shared flights)\n'
  || E'- Costco / supply shopping\n'
  || E'- **Pack & load the trucks** — all resources, food & gear into the trucks/reefer/van\n'
  || E'- J Resort hotel check-in\n'
  || E'- Takeout dinner — nobody is on playa until Monday\n\n'
  || E'**Monday 8/24 — First Playa Day**\n'
  || E'- Get placed by the BRC placement team\n'
  || E'- Measure the camp plot; flag the key large-item delivery spots\n'
  || E'- Unpack the delivered containers & organize\n'
  || E'- Raise the first **30×50 shade structure** (builder tents)\n'
  || E'- Build the NYC camp chill tent\n'
  || E'- Get builder personal tents up if there is time — all of this done = amazing\n\n'
  || E'**Tuesday 8/25 — Shade (all hands)**\n'
  || E'- Full builder crew on-site\n'
  || E'- Raise the REMAINDER of the shade structures — all day, all hands\n'
  || E'- Small team: JUST enough power for chill-tent swamp coolers + ice machine, then back to shade\n'
  || E'- Strap, anchor & wind-secure every structure\n'
  || E'- Public chill tent only if there is time — shade fully up = golden\n\n'
  || E'**Wednesday 8/26 — Systems (win day)**\n'
  || E'- Shower build\n'
  || E'- Power finished & hooked up\n'
  || E'- Kitchen build: deli & camp kitchen\n'
  || E'- Public chill-tent swamp coolers + ice machine\n'
  || E'- Water + greywater finished & tested\n'
  || E'- If shower + power + kitchen + public chill-tent cooling are done today, we have **WON build** — the rest is dressing\n\n'
  || E'**Thursday 8/27 — Dressing**\n'
  || E'- Everything from here is dressing\n'
  || E'- Blankets, pillows & soft goods; comfort & detail pass on every space\n'
  || E'- Roof deck, décor, signage\n'
  || E'- Organize & stage gear for arriving campers\n'
  || E'- Systems walkthrough / backup finish\n\n'
  || E'**Friday 8/28 — Camper-ready**\n'
  || E'- Final décor, side shade, roof deck, safety equipment\n'
  || E'- Stock kitchen; final plumbing / grey water test\n'
  || E'- Polaroid welcome wall; final walkthrough\n'
  || E'- Help early arrivals get set up',
    updated_at = now()
FROM build_meetings m
WHERE s.meeting_id = m.id
  AND m.slug = 'meeting-4'
  AND s.title ILIKE '%Day-by-Day%';
