-- =====================================================
-- Migration 056: Repoint Meeting Agenda links to deep-tabs
-- =====================================================
-- Many seeded links pointed to /build-week (the same page),
-- so clicking them appeared to do nothing. Update them to
-- /build-week?tab=<id> so they actually switch tabs.
-- =====================================================

UPDATE build_meeting_sections
SET resource_links = (
  SELECT jsonb_agg(
    CASE
      WHEN (l->>'label') ILIKE '%roster%'
        OR (l->>'label') ILIKE '%builder arrival%'
        OR (l->>'label') ILIKE '%vehicle%'
        THEN jsonb_set(l, '{href}', '"/build-week?tab=roster"')
      WHEN (l->>'label') ILIKE '%inventory%'
        OR (l->>'label') ILIKE '%first-access%'
        OR (l->>'label') ILIKE '%supply%'
        THEN jsonb_set(l, '{href}', '"/build-week?tab=inventory"')
      WHEN (l->>'label') ILIKE '%schedule%'
        THEN jsonb_set(l, '{href}', '"/build-week?tab=schedule"')
      WHEN (l->>'label') ILIKE '%shade%'
        THEN jsonb_set(l, '{href}', '"/build-week?tab=shade"')
      WHEN (l->>'label') ILIKE '%electrical%'
        OR (l->>'label') ILIKE '%power%'
        OR (l->>'label') ILIKE '%generator%'
        THEN jsonb_set(l, '{href}', '"/build-week?tab=electrical"')
      WHEN (l->>'label') ILIKE '%meeting agendas%'
        THEN jsonb_set(l, '{href}', '"/build-week?tab=agendas"')
      ELSE l
    END
  )
  FROM jsonb_array_elements(resource_links) AS l
)
WHERE jsonb_array_length(resource_links) > 0;
