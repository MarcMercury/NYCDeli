-- =====================================================
-- Migration 070: Consolidate Build Week Meetings 4 & 5
-- =====================================================
-- Merges the former Meeting 5 ("Boots on Playa: The Final
-- Build Week Walkthrough") into Meeting 4 ("Locking the
-- Build") so the build team works from a single, unified
-- final agenda instead of two separate meetings.
--
-- What this does:
--   1. Merges the meeting-level (general) notes.
--   2. Re-points all of Meeting 5's sections + section notes
--      onto Meeting 4.
--   3. Merges the two "Decisions Needed" blocks into one.
--   4. Renumbers the combined sections sequentially, keeping
--      the decisions block last.
--   5. Rewrites Meeting 4's header to reflect the merge.
--   6. Deletes the now-empty Meeting 5.
--
-- Idempotent: once Meeting 5 is deleted, re-running is a no-op.
-- =====================================================

DO $$
DECLARE
  m4 uuid;
  m5 uuid;
BEGIN
  SELECT id INTO m4 FROM build_meetings WHERE slug = 'meeting-4';
  SELECT id INTO m5 FROM build_meetings WHERE slug = 'meeting-5';

  IF m4 IS NULL OR m5 IS NULL THEN
    RAISE NOTICE 'Nothing to consolidate (meeting-4 or meeting-5 not found).';
    RETURN;
  END IF;

  -- ── 1. Merge meeting-level (general) notes ──
  -- If both meetings have a general note, concatenate them onto Meeting 4's.
  UPDATE build_meeting_notes n4
  SET content = CASE
        WHEN COALESCE(btrim(n5.content), '') = '' THEN n4.content
        WHEN COALESCE(btrim(n4.content), '') = '' THEN n5.content
        ELSE n4.content || E'\n\n--- (merged from former Meeting 5) ---\n\n' || n5.content
      END,
      updated_at = now()
  FROM build_meeting_notes n5
  WHERE n4.meeting_id = m4 AND n4.section_id IS NULL
    AND n5.meeting_id = m5 AND n5.section_id IS NULL;

  -- If only Meeting 5 has a general note, repoint it to Meeting 4.
  UPDATE build_meeting_notes
  SET meeting_id = m4
  WHERE meeting_id = m5 AND section_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM build_meeting_notes
      WHERE meeting_id = m4 AND section_id IS NULL
    );

  -- Drop any remaining (already-merged) Meeting 5 general note.
  DELETE FROM build_meeting_notes
  WHERE meeting_id = m5 AND section_id IS NULL;

  -- ── 2. Re-point Meeting 5's sections onto Meeting 4 ──
  -- Offset sort_order so they append cleanly after Meeting 4's rows;
  -- the final renumber pass below tidies everything up.
  UPDATE build_meeting_sections
  SET meeting_id = m4,
      sort_order = sort_order + 1000
  WHERE meeting_id = m5;

  -- Move the section-level notes that belong to those sections.
  UPDATE build_meeting_notes
  SET meeting_id = m4
  WHERE meeting_id = m5 AND section_id IS NOT NULL;

  -- ── 3. Merge the two "Decisions Needed" blocks ──
  -- Meeting 4's original decisions block keeps sort_order 70; the moved
  -- Meeting 5 decisions block is at 70 + 1000. Append the latter's items
  -- onto the former, then delete the moved block.
  UPDATE build_meeting_sections d4
  SET body_md = COALESCE(d4.body_md, '') || E'\n' || COALESCE(d5.body_md, ''),
      updated_at = now()
  FROM build_meeting_sections d5
  WHERE d4.meeting_id = m4 AND d4.kind = 'decisions'
    AND d5.meeting_id = m4 AND d5.kind = 'decisions'
    AND d4.id <> d5.id
    AND d4.sort_order < d5.sort_order;

  DELETE FROM build_meeting_sections
  WHERE meeting_id = m4 AND kind = 'decisions' AND sort_order > 1000;

  -- ── 4. Renumber the combined agenda ──
  -- Content sections get sequential numbers (1..N) in their existing order;
  -- the single decisions block is pushed to the very end with number = NULL.
  WITH ordered AS (
    SELECT id,
           ROW_NUMBER() OVER (
             ORDER BY (kind = 'decisions'), sort_order
           ) AS rn
    FROM build_meeting_sections
    WHERE meeting_id = m4
  )
  UPDATE build_meeting_sections s
  SET sort_order = o.rn * 10,
      number = CASE WHEN s.kind = 'decisions' THEN NULL ELSE o.rn END
  FROM ordered o
  WHERE s.id = o.id;

  -- ── 5. Rewrite Meeting 4's header for the consolidated agenda ──
  UPDATE build_meetings
  SET month_label  = 'August — Final All-Hands',
      title        = 'Locking the Build & Boots on Playa',
      subtitle     = 'Final prep, crews & supplies — plus the day-by-day build schedule, safety briefing, and arrival plan.',
      primary_goal = 'Lock the plan and assign responsibilities, and make sure everyone leaves knowing exactly when they arrive, where they go, what they own, and what the full build sequence is.',
      updated_at   = now()
  WHERE id = m4;

  -- ── 6. Delete the now-empty Meeting 5 ──
  DELETE FROM build_meetings WHERE id = m5;

  RAISE NOTICE 'Consolidated Meeting 5 into Meeting 4.';
END $$;
