-- =====================================================
-- Migration 064: Seed Pre-Burn Calendar from Build Schedule
-- =====================================================
-- Populates camp_events (the Pre-Burn Events calendar) with:
--   • A one-line summary per Build Week day (Sun 8/23 → Fri 8/28)
--     mirroring the build-week schedule + meeting agenda arc.
--   • The official Burning Man 2026 milestones:
--       - Gates Open ....... Sunday,   Aug 30, 2026
--       - The Man Burns .... Saturday, Sep  5, 2026
--       - The Temple Burns . Sunday,   Sep  6, 2026
--       - Exodus / End ..... Monday,   Sep  7, 2026 (Labor Day)
--
-- Burning Man 2026 runs Aug 30 – Sep 7, 2026.
-- Each event is intentionally just a title + a single sentence.
-- Idempotent: guarded by NOT EXISTS on (title, event_date).
-- =====================================================

BEGIN;

-- Replace the two generic placeholder build events with the
-- detailed day-by-day summaries below.
DELETE FROM camp_events WHERE event_date = '2026-08-23' AND title = 'BUILDERS ARRIVE!';
DELETE FROM camp_events WHERE event_date = '2026-08-24' AND title = 'Build Begins';

INSERT INTO camp_events (title, description, event_date, category)
SELECT v.title, v.description, v.event_date::date, v.category
FROM (VALUES
  -- ─── Build Week (Sun 8/23 → Fri 8/28) ───────────────
  ('Build Day 1 — Arrivals & Reno Prep',
   'Builders fly into Reno, shop, prep vehicles, and check into Reno housing before heading to playa.',
   '2026-08-23', 'build'),
  ('Build Day 2 — Survey & Deliveries',
   'The advance crew measures camp boundaries and flags placements as the containers, water tank, and bike trailer are delivered.',
   '2026-08-24', 'build'),
  ('Build Day 3 — Full Crew & Shade',
   'All builders caravan to playa for orientation, shade over builder tents, and basic power and water.',
   '2026-08-25', 'build'),
  ('Build Day 4 — Kitchen & Catering Begins',
   'A big kitchen push with staged container unloading as Swing City catering kicks off for dinner.',
   '2026-08-26', 'build'),
  ('Build Day 5 — Systems Online',
   'Showers, sinks, grey water, power to tents, and swamp coolers come online while camper tent spots are marked.',
   '2026-08-27', 'build'),
  ('Build Day 6 — Final Touches & Walkthrough',
   'Signage, decor, side shade, safety gear, and a final walkthrough wrap the build before campers arrive.',
   '2026-08-28', 'build'),

  -- ─── Burning Man 2026 milestones ────────────────────
  ('Gates Open — Burning Man 2026',
   'Black Rock City gates and Greeters open as Burning Man 2026 officially begins.',
   '2026-08-30', 'general'),
  ('The Man Burns',
   'The Man burns Saturday night — the climactic celebration of Burning Man 2026.',
   '2026-09-05', 'social'),
  ('The Temple Burns',
   'The Temple burns Sunday night in a quiet, reflective close to the week.',
   '2026-09-06', 'social'),
  ('Exodus / Event Ends (Labor Day)',
   'Burning Man 2026 officially ends on Labor Day as the city packs out and Exodus runs.',
   '2026-09-07', 'general')
) AS v(title, description, event_date, category)
WHERE NOT EXISTS (
  SELECT 1 FROM camp_events e
  WHERE e.title = v.title AND e.event_date = v.event_date::date
);

COMMIT;
