-- =====================================================
-- Migration 078: Meeting Agendas → free-form canvas
-- =====================================================
-- Replaces the section-by-section agenda UI with a single
-- free-writable canvas per meeting. Existing sections,
-- resource links and section notes are flattened into
-- markdown so nothing is lost. The section/note tables are
-- left intact (read-only history / rollback safety).
-- =====================================================

ALTER TABLE build_meetings ADD COLUMN IF NOT EXISTS canvas_md text;

WITH section_md AS (
  SELECT
    s.meeting_id,
    s.sort_order,
    '## ' || COALESCE(s.number::text || '. ', '') || s.title
      || COALESCE(E'\n\n' || NULLIF(btrim(s.body_md), ''), '')
      || COALESCE(E'\n\n' || l.links, '')
      || COALESCE(E'\n\n**Notes:** ' || NULLIF(btrim(n.content), ''), '')
      AS md
  FROM build_meeting_sections s
  LEFT JOIN LATERAL (
    SELECT string_agg('- [' || (e->>'label') || '](' || (e->>'href') || ')', E'\n') AS links
    FROM jsonb_array_elements(COALESCE(s.resource_links, '[]'::jsonb)) e
  ) l ON true
  LEFT JOIN build_meeting_notes n ON n.section_id = s.id
),
meeting_md AS (
  SELECT meeting_id, string_agg(md, E'\n\n' ORDER BY sort_order) AS body
  FROM section_md
  GROUP BY meeting_id
),
general_md AS (
  SELECT meeting_id, NULLIF(btrim(content), '') AS content
  FROM build_meeting_notes
  WHERE section_id IS NULL
)
UPDATE build_meetings m
SET canvas_md = NULLIF(btrim(
      COALESCE((SELECT body FROM meeting_md WHERE meeting_id = m.id), '')
      || COALESCE(
           E'\n\n## General Meeting Notes\n\n' || (SELECT content FROM general_md WHERE meeting_id = m.id),
           ''
         )
    ), ''),
    updated_at = now()
WHERE m.canvas_md IS NULL;

COMMENT ON COLUMN build_meetings.canvas_md IS
  'Free-form markdown canvas for the meeting. Source of truth for the agenda/notes UI as of migration 078.';
