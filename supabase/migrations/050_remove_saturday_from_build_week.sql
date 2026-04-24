-- Build Week 2026 — Remove Saturday from the schedule UI
-- ──────────────────────────────────────────────────────────────────
-- Build week officially runs Build Sunday (8/23) → Build Friday (8/28).
-- Saturday is no longer a separate scheduled day; any Saturday work
-- gets folded into Friday's wrap-up (or completed earlier in the week).
--
-- Notes:
--   • The `build_schedule_day` enum still contains 'saturday' for
--     historical compatibility — we don't drop the value (Postgres
--     enum value removal is destructive). The UI just hides it.
--   • All existing 'saturday' rows are migrated to 'friday' with
--     bumped sort_order so they appear after current Friday items.
-- ──────────────────────────────────────────────────────────────────

-- Move every saturday schedule item to friday, after existing friday rows.
-- Compute the current max friday sort_order, then offset saturday items.
DO $$
DECLARE
  friday_max INT;
BEGIN
  SELECT COALESCE(MAX(sort_order), 0) INTO friday_max
  FROM build_schedule_items
  WHERE day = 'friday';

  UPDATE build_schedule_items
     SET day = 'friday',
         sort_order = friday_max + sort_order + 100,
         updated_at = NOW()
   WHERE day = 'saturday';
END $$;

-- Tighten up: tag the migrated wrap-up items so it's clear in notes
-- they used to be Saturday work now done Friday.
UPDATE build_schedule_items
   SET notes = COALESCE(notes || ' ', '') || '(Moved from former Saturday slot — build week now ends Friday.)',
       updated_at = NOW()
 WHERE day = 'friday'
   AND title IN (
     'Final walkthrough & punch list',
     'Touch-up shade and structures',
     'Final decoration touches',
     'Camp safety briefing',
     'Help early arrivals with camp spot setup',
     'BUILD COMPLETE 🎉'
   );
