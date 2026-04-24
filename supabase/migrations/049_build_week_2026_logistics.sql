-- Build Week 2026 — Housing, Food, and Arrival Logistics
-- ──────────────────────────────────────────────────────────────────
-- Burning Man 2026 build week: Build Sunday Aug 23 → Build Friday Aug 28
-- Builders arrive between Build Sunday and Build Monday.
--
-- Build Housing
--   • 3 Fernley AirBnBs available with 2-night stays
--     (Sun 8/23 4pm → Tue 8/25 10am)
--   • Fly to Reno on Build Sunday whenever possible — extra travel day
--     for shopping, vehicle prep, and easier RNO→Fernley shuttling
--   • Try to align flights so the 15-passenger van can shuttle in groups
--   • Small advance survey team goes on-playa Build Monday;
--     remaining builders go on-playa Build Tuesday AM
--   • All builders MUST be in Build Houses by Build Monday night
--
-- Build Food
--   • Camp feeds builders through Build Friday night
--   • Sun → Wed AM: Fernley takeout + home breakfasts
--   • Wed PM → Fri night: catered by Swing City (HUBS sister camp)
-- ──────────────────────────────────────────────────────────────────

-- =====================================================
-- Refresh stage date_labels for 2026
-- =====================================================
UPDATE build_stages SET date_label = 'Pre-Playa', updated_at = NOW() WHERE stage = 'planning';
UPDATE build_stages SET date_label = 'Sunday, Aug 23 — Monday, Aug 24', updated_at = NOW() WHERE stage = 'monday';
UPDATE build_stages SET date_label = 'Tuesday, Aug 25', updated_at = NOW() WHERE stage = 'tuesday';
UPDATE build_stages SET date_label = 'Wednesday, Aug 26', updated_at = NOW() WHERE stage = 'wednesday';
UPDATE build_stages SET date_label = 'Thursday, Aug 27', updated_at = NOW() WHERE stage = 'thursday';
UPDATE build_stages SET date_label = 'Friday, Aug 28', updated_at = NOW() WHERE stage = 'friday';

-- =====================================================
-- Update builder_notes to surface housing & food context
-- =====================================================
UPDATE build_stages SET
  builder_notes = 'Build week 2026 starts SUNDAY 8/23 (not Monday). Pre-playa: confirm flights, fill flight/availability poll, finalize site map and immovable item placement, organize gear in Reno. Container, water tower, and bike trailer arrive Monday — Sunday crew must have boundaries measured and placement flagged before delivery. Aim for shared flights into Reno so the 15-passenger van can shuttle groups RNO→Fernley.',
  updated_at = NOW()
WHERE stage = 'planning';

UPDATE build_stages SET
  title = 'Arrival & Delivery Days',
  description = 'Builders fly into Reno (mostly Build Sunday), drive to Fernley AirBnBs, then shuttle to playa. Sunday: advance crew sets boundaries and stages for delivery. Monday: deliveries land, small on-playa survey team works while remaining builders prep vehicles and shop in Fernley.',
  date_label = 'Sunday Aug 23 → Monday Aug 24',
  builder_notes = 'Housing: 3 Fernley AirBnBs are 2-night stays — Sun 4pm to Tue 10am. Fly to Reno EARLY on Sun if you can: extra time for shopping, vehicle prep, and easier RNO→Fernley shuttle in the 15-pax van. Small survey team heads on-playa Build Monday; everyone else goes on-playa Build Tuesday AM. All builders MUST be in the Build Houses by Build Monday night. Food Sun→Wed AM is Fernley takeout + home breakfasts.',
  updated_at = NOW()
WHERE stage = 'monday';

UPDATE build_stages SET
  builder_notes = 'Build Tuesday: AirBnB checkout by 10am, full caravan to playa with the 15-passenger van. Main builder crew on-site by midday. Food today is still home breakfast + brought-in / Fernley takeout — Swing City catering does not start until Wednesday PM. No food service from camp yet — bring water and snacks for the day. Shade over builder tents is the #1 priority.',
  updated_at = NOW()
WHERE stage = 'tuesday';

UPDATE build_stages SET
  builder_notes = 'Wednesday is the food handoff: morning is still home/Fernley-style breakfast. From Wednesday PM through Friday night, our HUBS sister camp Swing City caters all meals (great kitchen, all dietary preferences). Empty containers in stages — never all at once. Big kitchen push today.',
  updated_at = NOW()
WHERE stage = 'wednesday';

UPDATE build_stages SET
  builder_notes = 'Camp eats with Swing City for all meals through tonight. Focus shifts from structure to systems: showers, sinks, grey water, power to tent areas, swamp coolers, ice machines. Mark tent placements for arriving campers.',
  updated_at = NOW()
WHERE stage = 'thursday';

UPDATE build_stages SET
  builder_notes = 'Last day camp officially feeds builders (Swing City catering through Friday night). After Friday night, builders are on their own / camp meals begin per camp schedule. Final decoration, signage, AV, side shade, roof deck, polaroid welcome wall.',
  updated_at = NOW()
WHERE stage = 'friday';

-- =====================================================
-- Insert housing/food/transport schedule items
-- (sort_order < 10 so they pin to the top of each day)
-- =====================================================
INSERT INTO build_schedule_items (day, title, description, category, time_slot, sort_order, is_delivery, assigned_to, notes) VALUES

-- ─── PRE-BUILD ───────────────────────────────────────
('pre_build', '🏠 Confirm Fernley AirBnB bookings', 'Lock in 3 Fernley AirBnBs. Hosts require 2-night minimum: Sun 8/23 4pm → Tue 8/25 10am. Confirm bedroom/bed counts vs builder roster.',
  'logistics', NULL, 1, false, 'Marc', 'Wishlist: https://www.airbnb.com/wishlists/invite/f1daef94-aefc-471e-9ae1-bcdc10d58991'),
('pre_build', '✈️ Builder flight + availability poll', 'Send poll to all builders: who has tickets, who can fly in on Build Sunday vs Monday, who needs RNO pickup. Goal is to cluster on shared flights so the 15-pax van can shuttle groups RNO→Fernley.',
  'logistics', NULL, 2, false, 'Marc', 'Strongly encourage Build Sunday flights — extra day for shopping & vehicle prep.'),
('pre_build', '🚐 Confirm 15-passenger van rental', 'Reserve the 15-passenger van that will shuttle RNO → Fernley → playa. Confirm pickup time aligns with the largest Sunday/Monday flight cluster.',
  'logistics', NULL, 3, false, 'Marc', NULL),
('pre_build', '🛰️ Pick on-playa survey team for Build Monday', 'Choose ~2-4 builders to go on-playa Monday for boundary measuring + delivery staging while the rest stay in Fernley for vehicle prep and shopping.',
  'logistics', NULL, 4, false, 'Marc', NULL),
('pre_build', '🍽️ Confirm Swing City catering window', 'Confirm with Swing City (HUBS sister camp) that they will feed our builders Wed PM → Fri night, including all dietary preferences.',
  'kitchen', NULL, 5, false, 'Marc', NULL),

-- ─── BUILD SUNDAY (8/23) ────────────────────────────
('sunday', '✈️ RNO arrivals — Build Sunday', 'Most builders fly into Reno today. Earlier flights are strongly preferred. Cluster on shared flights so the 15-pax van can shuttle groups RNO → Fernley.',
  'logistics', 'morning', 1, false, 'All builders', 'Earlier flight = more time for shopping + vehicle prep + easier shuttle.'),
('sunday', '🛒 Reno / Fernley shopping run', 'Last-mile shopping for groceries, ice, missing build supplies, water, propane, etc. Use the extra Sunday hours that early flights buy you.',
  'logistics', 'afternoon', 2, false, 'Drivers', NULL),
('sunday', '🏠 Check into Fernley AirBnBs (4pm)', 'Earliest check-in is 4pm Sunday. 3 houses, 2-night stay through Tuesday 10am. Assign builders to houses; share Wi-Fi + lockbox codes in builder chat.',
  'logistics', 'afternoon', 3, false, 'Marc', 'Houses booked 2-nights only: Sun 8/23 4pm → Tue 8/25 10am.'),
('sunday', '🔧 Vehicle + trailer prep at the houses', 'Final prep of vehicles, trailers, and miscellaneous gear at the AirBnBs. Extra Sunday hands here meaningfully reduces Monday load.',
  'logistics', 'afternoon', 4, false, 'Build crew at houses', NULL),
('sunday', '🥡 Fernley takeout dinner', 'Dinner is Fernley takeout (camp covers builder meals). Pick up for the whole house — coordinate orders in builder chat.',
  'kitchen', 'evening', 5, false, 'House leads', 'Camp feeds builders Sun→Fri. Sun→Wed AM is takeout + home breakfasts.'),

-- ─── BUILD MONDAY (8/24) ────────────────────────────
('monday', '🍳 Home breakfast at the AirBnBs', 'Breakfast in the houses — eggs / coffee / quick stuff. Camp covers groceries; house leads coordinate.',
  'kitchen', 'morning', 1, false, 'House leads', NULL),
('monday', '🛰️ Survey team departs for playa', 'Small advance crew (~2-4 builders) drives on-playa Monday morning to measure camp boundaries, flag immovable item positions, and stage for Monday deliveries.',
  'logistics', 'morning', 2, false, 'Survey team', 'Per Sunday plan — boundaries + immovable flags MUST be set before Monday deliveries arrive.'),
('monday', '🛒 Final Fernley shopping + vehicle prep', 'Builders not on the survey team finish vehicle prep, last shopping runs, and any remaining miscellaneous prep at the houses.',
  'logistics', 'morning', 3, false, 'House crew', NULL),
('monday', '🥡 Fernley takeout lunch + dinner', 'Lunch and dinner at the houses are Fernley takeout. Survey team eats on-playa from packed food / coolers.',
  'kitchen', 'afternoon', 4, false, 'House leads', NULL),
('monday', '🛏️ All builders in Build Houses by tonight', 'Hard requirement: every builder officially on the Build Team must be in a Fernley Build House by Build Monday night. Late arrivers — coordinate pickup.',
  'logistics', 'evening', 5, false, 'All builders', 'Non-negotiable per build week plan.'),

-- ─── BUILD TUESDAY (8/25) ───────────────────────────
('tuesday', '🍳 Home breakfast — last AirBnB breakfast', 'Final breakfast at the houses. Pack out coolers/leftovers for the playa drive.',
  'kitchen', 'morning', 1, false, 'House leads', NULL),
('tuesday', '🏠 AirBnB checkout — 10am sharp', 'AirBnB checkout is 10am. Strip beds per house rules, take out trash, lock up, return keys/lockbox codes. Do not leave anything behind.',
  'logistics', 'morning', 2, false, 'All builders', 'Houses are 2-night only — no late checkout.'),
('tuesday', '🚐 Caravan Fernley → playa', 'Full caravan to playa with personal vehicles + the 15-passenger van. Main builder crew on-site by midday.',
  'logistics', 'morning', 3, false, 'All builders', NULL),
('tuesday', '🥪 Bring-your-own / Fernley grab-and-go for the day', 'No camp food service yet today. Eat from coolers, snacks, and Fernley grab-and-go. Swing City catering does NOT start until Wednesday PM.',
  'kitchen', 'afternoon', 4, false, 'All builders', NULL),

-- ─── BUILD WEDNESDAY (8/26) — food handoff day ──────
('wednesday', '🥐 Final builder-prepped breakfast', 'Last "self-organized" breakfast before Swing City catering kicks in this evening. Use up coolers / Fernley leftovers.',
  'kitchen', 'morning', 1, false, 'Kitchen team', NULL),
('wednesday', '🤝 Swing City catering handshake', 'Confirm headcount + dietary preferences with Swing City (HUBS sister camp) ahead of tonight''s first catered dinner.',
  'kitchen', 'afternoon', 2, false, 'Kitchen lead', NULL),
('wednesday', '🍽️ Swing City catered DINNER (first night)', 'First catered meal of build week. Swing City has a fantastic kitchen and caters to all dietary preferences.',
  'kitchen', 'evening', 3, false, 'Swing City', 'Catering runs Wed PM → Fri night.'),

-- ─── BUILD THURSDAY (8/27) ──────────────────────────
('thursday', '🍽️ Swing City catering — all meals', 'Breakfast, lunch, and dinner provided by Swing City today.',
  'kitchen', NULL, 1, false, 'Swing City', NULL),

-- ─── BUILD FRIDAY (8/28) ────────────────────────────
('friday', '🍽️ Swing City catering — last day', 'Final day of Swing City catering. Camp officially feeds builders through tonight; thank Swing City crew.',
  'kitchen', NULL, 1, false, 'Swing City', 'Camp feeds builders through Build Friday night per build week plan.');
