-- =====================================================
-- 069: Simplified shift template
--   Re-creates seed_default_shift_offerings() with the canonical
--   sign-up / draft template:
--     • DELI SHIFTS            (Mon–Sat, 18 roles)
--     • SPECIAL EVENT SHIFTS   (Deep Playa, Fri 9/4)
--     • STRIKE SHIFTS          (Sunday 9/6)
--   Multi-seat stations collapsed into a single role with capacity:
--     Food Assembly (5), Entertainer/Crowd Control (2).
-- =====================================================

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

  -- DELI SHIFTS: cross join template × Mon..Sat
  INSERT INTO shift_offerings (draft_id, pool, category, role, time_label, day_label, day_date,
    start_time, end_time, capacity, requires_exp, counts_double, description, sort_order)
  SELECT p_draft_id, 'deli'::draft_pool, t.cat, t.role, t.time_label,
         v_days[i], v_dates[i], t.st::TIME, t.et::TIME,
         t.capacity, t.exp, t.dbl, t.descr,
         (t.sort * 10 + i)
  FROM (VALUES
    (1,  'DELI SHIFTS','Kitchen Lead',                'As needed',      '08:00','22:00', 1, FALSE, FALSE, 'Oversees all kitchen operations; makes real-time calls on prep, service flow, and staffing'),
    (2,  'DELI SHIFTS','Kitchen Supervisor',          '8:30AM–12:30PM', '08:30','12:30', 1, TRUE,  TRUE,  'Opens the kitchen, manages morning prep and service; ensures food safety and quality standards'),
    (3,  'DELI SHIFTS','Camp Manager Day',            '10AM–4PM',       '10:00','16:00', 1, FALSE, TRUE,  'Runs daytime camp operations including supply runs, camper issues, and infrastructure'),
    (4,  'DELI SHIFTS','Camp Manager Day Deputy',     '10AM–1PM',       '10:00','13:00', 1, FALSE, FALSE, 'Supports the Day Camp Manager with errands, logistics, and camper coordination'),
    (5,  'DELI SHIFTS','Camp Manager Day Deputy',     '1PM–4PM',        '13:00','16:00', 1, FALSE, FALSE, 'Supports the Day Camp Manager with errands, logistics, and camper coordination'),
    (6,  'DELI SHIFTS','Camp Manager Night',          '4PM–10PM',       '16:00','22:00', 1, FALSE, TRUE,  'Manages evening camp operations, noise levels, safety, and overnight readiness'),
    (7,  'DELI SHIFTS','Camp Manager Night Deputy',   '4PM–7PM',        '16:00','19:00', 1, FALSE, FALSE, 'Assists Night Camp Manager with evening duties and closing procedures'),
    (8,  'DELI SHIFTS','Camp Manager Night Deputy',   '7PM–10PM',       '19:00','22:00', 1, FALSE, FALSE, 'Assists Night Camp Manager with evening duties and closing procedures'),
    (9,  'DELI SHIFTS','Prep Crew',                   '8:30–11:00 AM',  '08:30','11:00', 5, FALSE, FALSE, 'Chops, slices, portions, and organizes ingredients for the day''s deli service'),
    (10, 'DELI SHIFTS','Order Taker & Counter',       '9:30–12:00',     '09:30','12:00', 1, FALSE, FALSE, 'Takes customer orders at the counter with energy and flair — part cashier, part entertainer'),
    (11, 'DELI SHIFTS','Grill Lead',                  '9:30–12:00',     '09:30','12:00', 1, TRUE,  FALSE, 'Runs the grill station; calls temps, manages ticket flow, and ensures food is cooked safely'),
    (12, 'DELI SHIFTS','Grill',                       '9:30–12:00',     '09:30','12:00', 3, FALSE, FALSE, 'Works the flat-top and grill cooking eggs, bacon, and proteins to order'),
    (13, 'DELI SHIFTS','Food Assembly',               '9:30–12:00',     '09:30','12:00', 5, FALSE, FALSE, 'Supports the full deli assembly line, including egg and egg-and-cheese sandwich assembly, schmearing bagels and rolls, bacon prep and portioning, coffee/milk service, beverage station upkeep, final sandwich wrapping, bagging, and handing completed orders to runners.'),
    (14, 'DELI SHIFTS','Runner (Assist)',             '9:30–12:00',     '09:30','12:00', 2, FALSE, FALSE, 'Delivers finished orders from the counter to customers and assists where needed'),
    (15, 'DELI SHIFTS','Security',                    '10:00–12:30',    '10:00','12:30', 1, FALSE, FALSE, 'Manages crowd flow, enforces line order, and keeps the deli perimeter safe and fun'),
    (16, 'DELI SHIFTS','Clean-up & Kitchen Reset',    '12:00–2:30',     '12:00','14:30', 5, FALSE, FALSE, 'Deep cleans all stations, washes dishes, sanitizes surfaces, and resets the kitchen for the next day'),
    (17, 'DELI SHIFTS','Entertainer/Crowd Control',   '10:00–12:30',    '10:00','12:30', 2, FALSE, FALSE, 'Manages the bike valet area and entertains the crowd while they wait, Keeps the line moving and entertained with games, banter, or conversation'),
    (18, 'DELI SHIFTS','DJ',                          '9:30–12:30',     '09:30','12:30', 1, FALSE, FALSE, 'Provides the soundtrack for deli service — sets the vibe and keeps energy high')
  ) AS t(sort, cat, role, time_label, st, et, capacity, exp, dbl, descr)
  CROSS JOIN generate_series(1,6) AS i
  ON CONFLICT DO NOTHING;

  -- SPECIAL EVENT SHIFTS: Deep Playa Fri 9/4
  INSERT INTO shift_offerings (draft_id, pool, category, role, time_label, day_label, day_date,
    start_time, end_time, capacity, requires_exp, counts_double, description, sort_order)
  VALUES
    (p_draft_id,'special','SPECIAL EVENT SHIFTS','Kitchen Lead (Deep Playa)','3PM–6:30PM','Fri', v_dpfri, '15:00','18:30', 1, FALSE, FALSE,
      'Leads kitchen operations for the deep playa soup service', 1000),
    (p_draft_id,'special','SPECIAL EVENT SHIFTS','Grill Lead (Deep Playa)',  '3PM–6:30PM','Fri', v_dpfri, '15:00','18:30', 1, TRUE, FALSE,
      'Runs the cooking station for the deep playa event', 1001),
    (p_draft_id,'special','SPECIAL EVENT SHIFTS','Volunteer Supervisor',     '3PM–6:30PM','Fri', v_dpfri, '15:00','18:30', 3, FALSE, FALSE,
      'Supervises 15–20 external volunteers from Camp Milk & Honey', 1002),
    (p_draft_id,'special','SPECIAL EVENT SHIFTS','Transport & Serving',      '6:30PM–9PM','Fri', v_dpfri, '18:30','21:00', 4, FALSE, FALSE,
      'Transports prepared food to deep playa and serves 1,000+ attendees', 1003)
  ON CONFLICT DO NOTHING;

  -- STRIKE SHIFTS (Sunday 9/6)
  INSERT INTO shift_offerings (draft_id, pool, category, role, time_label, day_label, day_date,
    start_time, end_time, capacity, requires_exp, counts_double, description, note, sort_order)
  VALUES
    (p_draft_id,'strike','STRIKE SHIFTS (Sunday 9/6)','Striker – Deco + Chill Tent',     '8:30AM–11AM','Sun', v_strike, '08:30','11:00', 4, FALSE, FALSE,
      'Tears down decorations and disassembles the public chill tent', NULL, 2000),
    (p_draft_id,'strike','STRIKE SHIFTS (Sunday 9/6)','Striker – Service Kitchen',       '8:30AM–11AM','Sun', v_strike, '08:30','11:00', 4, FALSE, FALSE,
      'Breaks down the service kitchen — packs equipment, cleans, and loads out', NULL, 2001),
    (p_draft_id,'strike','STRIKE SHIFTS (Sunday 9/6)','Striker – Plumbing/Shower',       '8:30AM–11AM','Sun', v_strike, '08:30','11:00', 4, FALSE, FALSE,
      'Disconnects plumbing, drains lines, and disassembles the shower container', NULL, 2002),
    (p_draft_id,'strike','STRIKE SHIFTS (Sunday 9/6)','Striker – Power',                 '8:30AM–11AM','Sun', v_strike, '08:30','11:00', 4, FALSE, FALSE,
      'Disconnects electrical systems, coils cabling, and packs generators', NULL, 2003),
    (p_draft_id,'strike','STRIKE SHIFTS (Sunday 9/6)','Striker – Lighting/Shade/Bikes',  '8:30AM–11AM','Sun', v_strike, '08:30','11:00', 8, FALSE, FALSE,
      'Removes lighting rigs, shade squares, evap coolers, and bike racks',
      'Sunday departure only — does not count as a regular shift', 2004)
  ON CONFLICT DO NOTHING;

  SELECT COUNT(*) INTO v_after FROM shift_offerings WHERE draft_id = p_draft_id;
  RETURN v_after - v_before;
END $$;

GRANT EXECUTE ON FUNCTION seed_default_shift_offerings(UUID) TO authenticated;

-- =====================================================
-- Re-seed any non-archived draft with the new template.
-- Runs as table owner (no _is_admin guard) so it works from the
-- migration runner. Safe: the open draft has no rankings/assignments.
-- =====================================================
DELETE FROM shift_offerings o
 USING shift_drafts d
 WHERE o.draft_id = d.id AND d.status <> 'archived';

-- DELI SHIFTS × Mon..Sat for every non-archived draft
INSERT INTO shift_offerings (draft_id, pool, category, role, time_label, day_label, day_date,
  start_time, end_time, capacity, requires_exp, counts_double, description, sort_order)
SELECT d.id, 'deli'::draft_pool, t.cat, t.role, t.time_label,
       (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat'])[i],
       (ARRAY[DATE '2026-08-31', DATE '2026-09-01', DATE '2026-09-02',
              DATE '2026-09-03', DATE '2026-09-04', DATE '2026-09-05'])[i],
       t.st::TIME, t.et::TIME, t.capacity, t.exp, t.dbl, t.descr, (t.sort * 10 + i)
FROM shift_drafts d
CROSS JOIN (VALUES
  (1,  'DELI SHIFTS','Kitchen Lead',                'As needed',      '08:00','22:00', 1, FALSE, FALSE, 'Oversees all kitchen operations; makes real-time calls on prep, service flow, and staffing'),
  (2,  'DELI SHIFTS','Kitchen Supervisor',          '8:30AM–12:30PM', '08:30','12:30', 1, TRUE,  TRUE,  'Opens the kitchen, manages morning prep and service; ensures food safety and quality standards'),
  (3,  'DELI SHIFTS','Camp Manager Day',            '10AM–4PM',       '10:00','16:00', 1, FALSE, TRUE,  'Runs daytime camp operations including supply runs, camper issues, and infrastructure'),
  (4,  'DELI SHIFTS','Camp Manager Day Deputy',     '10AM–1PM',       '10:00','13:00', 1, FALSE, FALSE, 'Supports the Day Camp Manager with errands, logistics, and camper coordination'),
  (5,  'DELI SHIFTS','Camp Manager Day Deputy',     '1PM–4PM',        '13:00','16:00', 1, FALSE, FALSE, 'Supports the Day Camp Manager with errands, logistics, and camper coordination'),
  (6,  'DELI SHIFTS','Camp Manager Night',          '4PM–10PM',       '16:00','22:00', 1, FALSE, TRUE,  'Manages evening camp operations, noise levels, safety, and overnight readiness'),
  (7,  'DELI SHIFTS','Camp Manager Night Deputy',   '4PM–7PM',        '16:00','19:00', 1, FALSE, FALSE, 'Assists Night Camp Manager with evening duties and closing procedures'),
  (8,  'DELI SHIFTS','Camp Manager Night Deputy',   '7PM–10PM',       '19:00','22:00', 1, FALSE, FALSE, 'Assists Night Camp Manager with evening duties and closing procedures'),
  (9,  'DELI SHIFTS','Prep Crew',                   '8:30–11:00 AM',  '08:30','11:00', 5, FALSE, FALSE, 'Chops, slices, portions, and organizes ingredients for the day''s deli service'),
  (10, 'DELI SHIFTS','Order Taker & Counter',       '9:30–12:00',     '09:30','12:00', 1, FALSE, FALSE, 'Takes customer orders at the counter with energy and flair — part cashier, part entertainer'),
  (11, 'DELI SHIFTS','Grill Lead',                  '9:30–12:00',     '09:30','12:00', 1, TRUE,  FALSE, 'Runs the grill station; calls temps, manages ticket flow, and ensures food is cooked safely'),
  (12, 'DELI SHIFTS','Grill',                       '9:30–12:00',     '09:30','12:00', 3, FALSE, FALSE, 'Works the flat-top and grill cooking eggs, bacon, and proteins to order'),
  (13, 'DELI SHIFTS','Food Assembly',               '9:30–12:00',     '09:30','12:00', 5, FALSE, FALSE, 'Supports the full deli assembly line, including egg and egg-and-cheese sandwich assembly, schmearing bagels and rolls, bacon prep and portioning, coffee/milk service, beverage station upkeep, final sandwich wrapping, bagging, and handing completed orders to runners.'),
  (14, 'DELI SHIFTS','Runner (Assist)',             '9:30–12:00',     '09:30','12:00', 2, FALSE, FALSE, 'Delivers finished orders from the counter to customers and assists where needed'),
  (15, 'DELI SHIFTS','Security',                    '10:00–12:30',    '10:00','12:30', 1, FALSE, FALSE, 'Manages crowd flow, enforces line order, and keeps the deli perimeter safe and fun'),
  (16, 'DELI SHIFTS','Clean-up & Kitchen Reset',    '12:00–2:30',     '12:00','14:30', 5, FALSE, FALSE, 'Deep cleans all stations, washes dishes, sanitizes surfaces, and resets the kitchen for the next day'),
  (17, 'DELI SHIFTS','Entertainer/Crowd Control',   '10:00–12:30',    '10:00','12:30', 2, FALSE, FALSE, 'Manages the bike valet area and entertains the crowd while they wait, Keeps the line moving and entertained with games, banter, or conversation'),
  (18, 'DELI SHIFTS','DJ',                          '9:30–12:30',     '09:30','12:30', 1, FALSE, FALSE, 'Provides the soundtrack for deli service — sets the vibe and keeps energy high')
) AS t(sort, cat, role, time_label, st, et, capacity, exp, dbl, descr)
CROSS JOIN generate_series(1,6) AS i
WHERE d.status <> 'archived'
ON CONFLICT DO NOTHING;

-- SPECIAL EVENT SHIFTS
INSERT INTO shift_offerings (draft_id, pool, category, role, time_label, day_label, day_date,
  start_time, end_time, capacity, requires_exp, counts_double, description, sort_order)
SELECT d.id, 'special'::draft_pool, 'SPECIAL EVENT SHIFTS', v.role, v.time_label, 'Fri', DATE '2026-09-04',
       v.st::TIME, v.et::TIME, v.capacity, v.exp, FALSE, v.descr, v.sort
FROM shift_drafts d
CROSS JOIN (VALUES
  ('Kitchen Lead (Deep Playa)','3PM–6:30PM','15:00','18:30', 1, FALSE, 'Leads kitchen operations for the deep playa soup service', 1000),
  ('Grill Lead (Deep Playa)',  '3PM–6:30PM','15:00','18:30', 1, TRUE,  'Runs the cooking station for the deep playa event', 1001),
  ('Volunteer Supervisor',     '3PM–6:30PM','15:00','18:30', 3, FALSE, 'Supervises 15–20 external volunteers from Camp Milk & Honey', 1002),
  ('Transport & Serving',      '6:30PM–9PM','18:30','21:00', 4, FALSE, 'Transports prepared food to deep playa and serves 1,000+ attendees', 1003)
) AS v(role, time_label, st, et, capacity, exp, descr, sort)
WHERE d.status <> 'archived'
ON CONFLICT DO NOTHING;

-- STRIKE SHIFTS (Sunday 9/6)
INSERT INTO shift_offerings (draft_id, pool, category, role, time_label, day_label, day_date,
  start_time, end_time, capacity, requires_exp, counts_double, description, note, sort_order)
SELECT d.id, 'strike'::draft_pool, 'STRIKE SHIFTS (Sunday 9/6)', v.role, '8:30AM–11AM', 'Sun', DATE '2026-09-06',
       '08:30'::TIME, '11:00'::TIME, v.capacity, FALSE, FALSE, v.descr, v.note, v.sort
FROM shift_drafts d
CROSS JOIN (VALUES
  ('Striker – Deco + Chill Tent',    4, 'Tears down decorations and disassembles the public chill tent', NULL, 2000),
  ('Striker – Service Kitchen',      4, 'Breaks down the service kitchen — packs equipment, cleans, and loads out', NULL, 2001),
  ('Striker – Plumbing/Shower',      4, 'Disconnects plumbing, drains lines, and disassembles the shower container', NULL, 2002),
  ('Striker – Power',                4, 'Disconnects electrical systems, coils cabling, and packs generators', NULL, 2003),
  ('Striker – Lighting/Shade/Bikes', 8, 'Removes lighting rigs, shade squares, evap coolers, and bike racks', 'Sunday departure only — does not count as a regular shift', 2004)
) AS v(role, capacity, descr, note, sort)
WHERE d.status <> 'archived'
ON CONFLICT DO NOTHING;
