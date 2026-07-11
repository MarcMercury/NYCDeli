-- =====================================================
-- Migration 071: Restructure Build Week Mon–Wed sequence
-- =====================================================
-- Reworks the on-playa build sequence per the updated plan:
--
--   MONDAY   = Survey Day. Mapping, plotting, and coordinating
--              ALL major drop-offs (water tower, containers,
--              portos, power/generator, dumpster). Unpack,
--              organize, assign duties/roles. Get the NYC camp
--              chill tent + builder-tent shade section up, and
--              builder personal tents built.
--   TUESDAY  = All major structures up & strapped — ALL DAY.
--              Public chill tent + every shade structure.
--   WEDNESDAY= Unpack; start kitchen build + shower build;
--              ALL utilities finished and hooked up (incl. power).
--
-- Also removes the now-redundant on-playa survey items from
-- SUNDAY (survey work moved to Monday; Sunday stays the Reno
-- arrival/logistics day) and syncs the consolidated Meeting 4
-- "Build Week Day-by-Day Walkthrough" agenda to match.
--
-- Preserved on every day:
--   • Pinned housing/food/arrival logistics (sort_order < 10)
--   • Layout-synced "Install …" items (sort_order >= 200)
-- =====================================================

-- ── SUNDAY: drop the on-playa survey/build items (now Monday's job) ──
DELETE FROM build_schedule_items
WHERE day = 'sunday' AND sort_order BETWEEN 10 AND 199;

-- ── MONDAY: keep deliveries (10–45); rebuild the survey-day work ──
DELETE FROM build_schedule_items
WHERE day = 'monday' AND sort_order BETWEEN 46 AND 199;

INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery) VALUES
  ('monday', '🚚 Generator & power drop-off + placement',
   'Coordinate the generator/power drop and set it on its flagged spot with the other major deliveries.',
   'delivery', 'morning', 46, true),
  ('monday', 'Survey & placement — get placed by BRC placement team',
   'Meet the Black Rock City placement team; confirm the camp corner and orientation.',
   'layout', 'morning', 50, false),
  ('monday', 'Map & measure camp boundaries',
   'Rope, tape, and measuring wheel — mark all four corners of the camp rectangle.',
   'layout', 'morning', 55, false),
  ('monday', 'Plot & flag immovable item positions',
   'Flag exact positions for the water tower, containers, portos, dumpster, and generator/power BEFORE the delivery trucks arrive.',
   'layout', 'morning', 60, false),
  ('monday', 'Flag shade + tent layout grid',
   'Mark the builder-tent shade footprint, the NYC camp chill tent, and personal tent zones from the site map.',
   'layout', 'morning', 65, false),
  ('monday', 'Coordinate crews — assign duties & roles',
   'Kickoff huddle: assign survey, drop-off, unloading, shade, tent, chill-tent, and power crews.',
   'logistics', 'morning', 70, false),
  ('monday', 'Unpack, organize & stage gear',
   'Open containers, pull builder-priority gear, and stage tools/hardware by work zone.',
   'logistics', 'afternoon', 75, false),
  ('monday', 'Generator test & basic power / lighting',
   'Test the generator and run basic power and lighting to the work area.',
   'electrical', 'afternoon', 80, false),
  ('monday', 'Raise builder-tent shade section',
   'Erect and strap the shade-structure section that covers the builder tents.',
   'shade', 'afternoon', 85, false),
  ('monday', 'Build NYC camp chill tent',
   'Raise and secure the NYC Deli camp (private) chill tent.',
   'infrastructure', 'afternoon', 90, false),
  ('monday', 'Set up builder personal tents',
   'Builders pitch personal tents under the completed builder-tent shade section.',
   'infrastructure', 'afternoon', 95, false);

-- ── TUESDAY: all major structures up & strapped, all day + public chill ──
DELETE FROM build_schedule_items
WHERE day = 'tuesday' AND sort_order BETWEEN 10 AND 199;

INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery) VALUES
  ('tuesday', 'Full builder crew on-site',
   'Main crew arrives from Reno — all-hands structure day.',
   'logistics', 'morning', 10, false),
  ('tuesday', 'Raise all major shade structures — ALL DAY',
   'All-hands push to erect every remaining major shade structure across camp.',
   'shade', 'all_day', 20, false),
  ('tuesday', 'Strap, anchor & wind-secure every structure',
   'Ratchet-strap, anchor, and wind-check all shade structures and frames.',
   'shade', 'all_day', 30, false),
  ('tuesday', 'Install shade cloth across all frames',
   'Fly and tie shade cloth over every completed structure.',
   'shade', 'afternoon', 40, false),
  ('tuesday', 'Build public chill tent',
   'Raise the public-facing chill tent structure.',
   'decoration', 'afternoon', 50, false),
  ('tuesday', 'Strap & secure public chill tent',
   'Anchor and wind-check the public chill tent.',
   'shade', 'afternoon', 60, false);

-- ── WEDNESDAY: unpack + kitchen + shower + all utilities online ──
DELETE FROM build_schedule_items
WHERE day = 'wednesday' AND sort_order BETWEEN 10 AND 199;

INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery) VALUES
  ('wednesday', 'Full container unpack & staged unloading',
   'Empty the remaining containers in stages by zone; organize as you go.',
   'logistics', 'morning', 10, false),
  ('wednesday', 'Kitchen build — deli & camp kitchen',
   'Build out the full deli and camp kitchen: counters, prep, service areas, and grills.',
   'kitchen', 'morning', 20, false),
  ('wednesday', 'Shower build',
   'Build the shower structure and connect it to water and greywater.',
   'plumbing', 'morning', 30, false),
  ('wednesday', 'Finish & hook up water system',
   'Water tower, pump, and distribution to kitchen, showers, sinks, and chill tents.',
   'plumbing', 'afternoon', 40, false),
  ('wednesday', 'Finish & hook up all power distribution',
   'Complete power to tents, kitchen, chill tents, swamp coolers, and ice machines.',
   'electrical', 'afternoon', 50, false),
  ('wednesday', 'Greywater system finished & tested',
   'Complete greywater capture and run a full test.',
   'plumbing', 'afternoon', 60, false),
  ('wednesday', 'All utilities online — systems check',
   'Verify power, water, and greywater are fully operational before Thursday.',
   'safety', 'afternoon', 70, false);

-- =====================================================
-- Sync the consolidated Meeting 4 day-by-day agenda
-- (Mon/Tue/Wed rewritten; Sun/Thu/Fri preserved)
-- =====================================================
UPDATE build_meeting_sections s
SET body_md = E'**Sunday 8/23**\n'
  || E'- Reno arrivals (cluster on shared flights)\n'
  || E'- Costco / supply shopping\n'
  || E'- Vehicle + trailer prep\n'
  || E'- **J Resort hotel check-in**\n'
  || E'- Takeout dinner\n'
  || E'- Possible early playa survey-crew prep\n\n'
  || E'**Monday 8/24 — Survey Day**\n'
  || E'- Get placed by the BRC placement team\n'
  || E'- Map & measure camp boundaries (mapping + plotting)\n'
  || E'- Plot & flag immovable positions: water tower, containers, portos, dumpster, power\n'
  || E'- Coordinate ALL major drop-offs: water tower, containers, portos, power/generator, dumpster\n'
  || E'- Unpack, organize & stage gear; assign duties, roles & crews\n'
  || E'- Raise the builder-tent shade section\n'
  || E'- Build builder personal tents\n'
  || E'- Build the NYC camp chill tent\n'
  || E'- Generator placement, test & basic power / lighting\n\n'
  || E'**Tuesday 8/25 — Major Structures Up & Strapped (all day)**\n'
  || E'- Full builder crew on-site\n'
  || E'- Raise ALL major shade structures — all day\n'
  || E'- Strap, anchor & wind-secure every structure\n'
  || E'- Install shade cloth across all frames\n'
  || E'- Build & strap the public chill tent\n\n'
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
