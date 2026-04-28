-- =====================================================
-- Migration 054: Bridge auto-draft → schedule_assignments
-- =====================================================
-- The auto-draft writes to shift_draft_assignments / shift_offerings,
-- but the camper-facing profile + schedule pages read from
-- schedule_assignments / kitchen_shifts / kitchen_roles. Without this
-- bridge, campers see ZERO shifts after a draft is published.
--
-- This migration:
--   1. Adds start_time / end_time TIME columns to shift_offerings.
--   2. Updates seed_default_shift_offerings to populate them.
--   3. Rewrites publish_draft to materialize:
--        kitchen_roles  (one per unique offering.role, idempotent)
--        kitchen_shifts (one per offering with day_date + times)
--        schedule_assignments (one per draft assignment)
--      All copies are idempotent & scoped — re-running publish for the
--      same draft is a no-op for already-published rows.
-- =====================================================

-- 1. Schema additions
ALTER TABLE shift_offerings
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- Link to materialized kitchen_shift so we don't double-create on republish
ALTER TABLE shift_offerings
  ADD COLUMN IF NOT EXISTS published_shift_id UUID REFERENCES kitchen_shifts(id) ON DELETE SET NULL;

-- 2. Replace seed function to include parsed times
CREATE OR REPLACE FUNCTION seed_default_shift_offerings(p_draft_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_before INTEGER;
  v_after  INTEGER;
  v_days   TEXT[]  := ARRAY['Mon','Tue','Wed','Thu','Fri','Sat'];
  v_dates  DATE[]  := ARRAY[
    DATE '2026-08-31', DATE '2026-09-01', DATE '2026-09-02',
    DATE '2026-09-03', DATE '2026-09-04', DATE '2026-09-05'
  ];
  v_strike DATE := DATE '2026-09-06';
  v_dpfri  DATE := DATE '2026-09-04';
BEGIN
  IF NOT _is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF NOT EXISTS (SELECT 1 FROM shift_drafts WHERE id = p_draft_id) THEN
    RAISE EXCEPTION 'Draft not found';
  END IF;

  SELECT COUNT(*) INTO v_before FROM shift_offerings WHERE draft_id = p_draft_id;

  -- Daily deli offerings: cross join template × Mon..Sat
  INSERT INTO shift_offerings (draft_id, pool, category, role, time_label, day_label, day_date,
    start_time, end_time, capacity, requires_exp, counts_double, description, sort_order)
  SELECT p_draft_id, 'deli'::draft_pool, t.cat, t.role, t.time_label,
         v_days[i], v_dates[i], t.st::TIME, t.et::TIME,
         t.capacity, t.exp, t.dbl, t.descr,
         (t.sort * 10 + i)
  FROM (VALUES
    -- Deli Shifts (management)
    (1,  'Deli Shifts','Kitchen Lead',                NULL,             '08:00','22:00', 1, FALSE, FALSE, 'Oversees all kitchen operations; makes real-time calls on prep, service flow, and staffing'),
    (2,  'Deli Shifts','Kitchen Supervisor',          '8:30AM–12:30PM', '08:30','12:30', 1, TRUE,  TRUE,  'Opens the kitchen, manages morning prep and service; ensures food safety and quality standards'),
    (3,  'Deli Shifts','Camp Manager Day',            '10AM–4PM',       '10:00','16:00', 1, FALSE, TRUE,  'Runs daytime camp operations including supply runs, camper issues, and infrastructure'),
    (4,  'Deli Shifts','Camp Manager Day Deputy',     '10AM–1PM',       '10:00','13:00', 1, FALSE, FALSE, 'Supports the Day Camp Manager with errands, logistics, and camper coordination'),
    (5,  'Deli Shifts','Camp Manager Day Deputy',     '1PM–4PM',        '13:00','16:00', 1, FALSE, FALSE, 'Supports the Day Camp Manager with errands, logistics, and camper coordination'),
    (6,  'Deli Shifts','Camp Manager Night',          '4PM–10PM',       '16:00','22:00', 1, FALSE, TRUE,  'Manages evening camp operations, noise levels, safety, and overnight readiness'),
    (7,  'Deli Shifts','Camp Manager Night Deputy',   '4PM–7PM',        '16:00','19:00', 1, FALSE, FALSE, 'Assists Night Camp Manager with evening duties and closing procedures'),
    (8,  'Deli Shifts','Camp Manager Night Deputy',   '7PM–10PM',       '19:00','22:00', 1, FALSE, FALSE, 'Assists Night Camp Manager with evening duties and closing procedures'),
    -- Prep Crew
    (10, 'Prep Crew','Prep Crew',                     '8:30–11:00 AM',  '08:30','11:00', 5, FALSE, FALSE, 'Chops, slices, portions, and organizes ingredients for the day''s deli service'),
    -- Order Taker
    (11, 'Order Taker','Order Taker & Counter',       '9:30–12:00',     '09:30','12:00', 1, FALSE, FALSE, 'Takes customer orders at the counter with energy and flair'),
    -- Grill
    (12, 'Grill','Grill Lead',                        '9:30–12:00',     '09:30','12:00', 1, TRUE,  FALSE, 'Runs the grill station; calls temps, manages ticket flow, and ensures food is cooked safely'),
    (13, 'Grill','Grill',                             '9:30–12:00',     '09:30','12:00', 3, FALSE, FALSE, 'Works the flat-top and grill cooking eggs, bacon, and proteins to order'),
    -- Assembly
    (14, 'Assembly','Assembly (Egg + Egg+Cheese)',    '9:30–12:00',     '09:30','12:00', 1, FALSE, FALSE, 'Assembles egg and egg-and-cheese sandwiches fresh off the grill'),
    (15, 'Assembly','Assembly (Schmearer)',           '9:30–12:00',     '09:30','12:00', 1, FALSE, FALSE, 'Spreads cream cheese, butter, and condiments on bagels and rolls'),
    (16, 'Assembly','Assembly (Bacon)',               '9:30–12:00',     '09:30','12:00', 1, FALSE, FALSE, 'Handles bacon prep, portioning, and adding bacon to sandwich orders'),
    (17, 'Assembly','Assembly (Coffee + Milk)',       '9:30–12:00',     '09:30','12:00', 1, FALSE, FALSE, 'Brews and serves coffee and milk; keeps the beverage station stocked and clean'),
    (18, 'Assembly','Assembly (Sandwich Counter)',    '9:30–12:00',     '09:30','12:00', 1, FALSE, FALSE, 'Final sandwich assembly — wraps, bags, and hands completed orders to runners'),
    -- Runner
    (19, 'Runner','Runner (Assist)',                  '9:30–12:00',     '09:30','12:00', 2, FALSE, FALSE, 'Delivers finished orders from the counter to customers and assists where needed'),
    -- Security
    (20, 'Security','Security',                       '10:00–12:30',    '10:00','12:30', 1, FALSE, FALSE, 'Manages crowd flow, enforces line order, and keeps the deli perimeter safe and fun'),
    -- Clean-up
    (21, 'Clean-up Crew','Clean-up & Kitchen Reset',  '12:00–2:30',     '12:00','14:30', 5, FALSE, FALSE, 'Deep cleans all stations, washes dishes, sanitizes surfaces, and resets the kitchen for the next day'),
    -- Entertainers
    (22, 'Entertainers','Entertainer / Bike Manager', '10:00–12:30',    '10:00','12:30', 2, FALSE, FALSE, 'Manages the bike valet area and entertains the crowd while they wait'),
    (23, 'Entertainers','Entertainer / Line Manager', '10:00–12:30',    '10:00','12:30', 2, FALSE, FALSE, 'Keeps the line moving and entertained with games, banter, or conversation'),
    -- DJ
    (24, 'Music & DJs','DJ',                          '9:30–12:30',     '09:30','12:30', 1, FALSE, FALSE, 'Provides the soundtrack for deli service — sets the vibe and keeps energy high')
  ) AS t(sort, cat, role, time_label, st, et, capacity, exp, dbl, descr)
  CROSS JOIN generate_series(1,6) AS i
  ON CONFLICT DO NOTHING;

  -- Special pool: Deep Playa Fri 9/4
  INSERT INTO shift_offerings (draft_id, pool, category, role, time_label, day_label, day_date,
    start_time, end_time, capacity, requires_exp, counts_double, description, sort_order)
  VALUES
    (p_draft_id,'special','Deep Playa','Kitchen Lead',         '3PM–6:30PM','Fri', v_dpfri, '15:00','18:30', 1, FALSE, FALSE,
      'Leads kitchen operations for the deep playa soup service', 1000),
    (p_draft_id,'special','Deep Playa','Grill Lead',           '3PM–6:30PM','Fri', v_dpfri, '15:00','18:30', 1, TRUE, FALSE,
      'Runs the cooking station for the deep playa event', 1001),
    (p_draft_id,'special','Deep Playa','Volunteer Supervisor', '3PM–6:30PM','Fri', v_dpfri, '15:00','18:30', 3, FALSE, FALSE,
      'Supervises 15–20 external volunteers from Camp Milk & Honey', 1002),
    (p_draft_id,'special','Deep Playa','Transport & Serving',  '6:30PM–9PM','Fri', v_dpfri, '18:30','21:00', 4, FALSE, FALSE,
      'Transports prepared food to deep playa and serves 1,000+ attendees', 1003)
  ON CONFLICT DO NOTHING;

  -- Strike pool: Sun 9/6
  INSERT INTO shift_offerings (draft_id, pool, category, role, time_label, day_label, day_date,
    start_time, end_time, capacity, requires_exp, counts_double, description, note, sort_order)
  VALUES
    (p_draft_id,'strike','Strike','Striker – Deco + Chill Tent',     '8:30AM–11AM','Sun', v_strike, '08:30','11:00', 4, FALSE, FALSE,
      'Tears down decorations and disassembles the public chill tent', NULL, 2000),
    (p_draft_id,'strike','Strike','Striker – Service Kitchen',       '8:30AM–11AM','Sun', v_strike, '08:30','11:00', 3, FALSE, FALSE,
      'Breaks down the service kitchen — packs equipment, cleans, and loads out', NULL, 2001),
    (p_draft_id,'strike','Strike','Striker – Plumbing/Shower',       '8:30AM–11AM','Sun', v_strike, '08:30','11:00', 4, FALSE, FALSE,
      'Disconnects plumbing, drains lines, and disassembles the shower container', NULL, 2002),
    (p_draft_id,'strike','Strike','Striker – Power',                 '8:30AM–11AM','Sun', v_strike, '08:30','11:00', 4, FALSE, FALSE,
      'Disconnects electrical systems, coils cabling, and packs generators', NULL, 2003),
    (p_draft_id,'strike','Strike','Striker – Lighting/Shade/Bikes',  '8:30AM–11AM','Sun', v_strike, '08:30','11:00', 10, FALSE, FALSE,
      'Removes lighting rigs, shade squares, evap coolers, and bike racks',
      'Sunday departure only — does not count as a regular shift', 2004)
  ON CONFLICT DO NOTHING;

  SELECT COUNT(*) INTO v_after FROM shift_offerings WHERE draft_id = p_draft_id;
  RETURN v_after - v_before;
END $$;

-- 3. Replace publish_draft: materialize roles, shifts, schedule_assignments.
CREATE OR REPLACE FUNCTION publish_draft(p_draft_id UUID)
RETURNS shift_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row    shift_drafts;
  v_admin  UUID;
  v_admin_camper UUID;
  v_off    RECORD;
  v_role_id UUID;
  v_shift_id UUID;
  v_roles_created INTEGER := 0;
  v_shifts_created INTEGER := 0;
  v_assignments_created INTEGER := 0;
BEGIN
  IF NOT _is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;

  -- Resolve a camper_id for the publishing admin (used as assigned_by; nullable)
  v_admin := auth.uid();
  SELECT camper_id INTO v_admin_camper FROM user_profiles WHERE id = v_admin;

  -- Walk every offering that has at least one assignment in this draft
  FOR v_off IN
    SELECT o.id, o.role, o.day_date, o.start_time, o.end_time, o.capacity,
           o.published_shift_id, o.description, o.note
      FROM shift_offerings o
     WHERE o.draft_id = p_draft_id
       AND o.day_date IS NOT NULL
       AND o.start_time IS NOT NULL
       AND o.end_time IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM shift_draft_assignments a
          WHERE a.draft_id = p_draft_id AND a.offering_id = o.id
       )
  LOOP
    -- 3a. Find or create kitchen_role by name
    SELECT id INTO v_role_id FROM kitchen_roles WHERE name = v_off.role;
    IF v_role_id IS NULL THEN
      INSERT INTO kitchen_roles (name, description, responsibilities, shift_expectations,
                                 failure_consequences, min_per_shift, max_per_shift)
      VALUES (
        v_off.role,
        COALESCE(v_off.description, v_off.role),
        ARRAY[]::TEXT[],
        'See description.',
        'The deli won''t open. Don''t be the reason.',
        1,
        GREATEST(v_off.capacity, 3)
      )
      RETURNING id INTO v_role_id;
      v_roles_created := v_roles_created + 1;
    END IF;

    -- 3b. Find or create kitchen_shift. If offering already linked, reuse.
    v_shift_id := v_off.published_shift_id;
    IF v_shift_id IS NULL THEN
      -- Try to match an existing kitchen_shift with same role/date/start/end
      SELECT id INTO v_shift_id
        FROM kitchen_shifts
       WHERE role_id = v_role_id
         AND date = v_off.day_date
         AND start_time = v_off.start_time
         AND end_time = v_off.end_time
       LIMIT 1;
      IF v_shift_id IS NULL THEN
        INSERT INTO kitchen_shifts (role_id, date, start_time, end_time,
                                    min_coverage, max_coverage, notes)
        VALUES (v_role_id, v_off.day_date, v_off.start_time, v_off.end_time,
                1, v_off.capacity, v_off.note)
        RETURNING id INTO v_shift_id;
        v_shifts_created := v_shifts_created + 1;
      END IF;
      UPDATE shift_offerings SET published_shift_id = v_shift_id WHERE id = v_off.id;
    END IF;

    -- 3c. Materialize schedule_assignments for every camper drafted into this offering
    INSERT INTO schedule_assignments (camper_id, shift_id, status, assigned_by, locked, notes)
    SELECT a.camper_id, v_shift_id, 'scheduled'::schedule_status,
           v_admin_camper, FALSE,
           CASE WHEN a.source = 'manual' THEN 'Manually swapped post-draft'
                WHEN a.source = 'random_fill' THEN 'Auto-draft random fill'
                ELSE NULL END
      FROM shift_draft_assignments a
     WHERE a.draft_id = p_draft_id AND a.offering_id = v_off.id
    ON CONFLICT (camper_id, shift_id) DO NOTHING;
    GET DIAGNOSTICS v_assignments_created = ROW_COUNT;
  END LOOP;

  -- 4. Mark draft archived
  UPDATE shift_drafts
     SET status = 'archived',
         drafted_at = COALESCE(drafted_at, NOW())
   WHERE id = p_draft_id
   RETURNING * INTO v_row;

  -- Stash a hint in system_settings so admins can see the bridge ran
  INSERT INTO system_settings (key, value)
  VALUES ('last_published_draft_id', p_draft_id::text)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  RETURN v_row;
END $$;

GRANT EXECUTE ON FUNCTION publish_draft(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_default_shift_offerings(UUID) TO authenticated;
