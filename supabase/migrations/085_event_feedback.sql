-- 085: Post-event stage (lifecycle stage 8).
--
-- After an event ends it stays active for a while so participants can give
-- feedback and admins can capture what they learned before the event is closed
-- and frozen. Both live here rather than in ad-hoc notes so the record survives
-- archival alongside the roster.

CREATE TABLE IF NOT EXISTS event_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,

  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  what_worked TEXT,
  what_didnt TEXT,
  suggestions TEXT,
  would_return BOOLEAN,
  -- Lets people be candid; admins see the text either way.
  is_anonymous BOOLEAN NOT NULL DEFAULT false,

  UNIQUE (event_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_event_feedback_event ON event_feedback (event_id);

DROP TRIGGER IF EXISTS event_feedback_updated_at ON event_feedback;
CREATE TRIGGER event_feedback_updated_at BEFORE UPDATE ON event_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE event_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_feedback_select ON event_feedback;
CREATE POLICY event_feedback_select ON event_feedback
  FOR SELECT USING (
    is_site_admin()
    OR person_id IN (SELECT id FROM people WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS event_feedback_insert ON event_feedback;
CREATE POLICY event_feedback_insert ON event_feedback
  FOR INSERT WITH CHECK (
    person_id IN (SELECT id FROM people WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS event_feedback_update ON event_feedback;
CREATE POLICY event_feedback_update ON event_feedback
  FOR UPDATE USING (
    person_id IN (SELECT id FROM people WHERE user_id = auth.uid())
  ) WITH CHECK (
    person_id IN (SELECT id FROM people WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS event_feedback_delete ON event_feedback;
CREATE POLICY event_feedback_delete ON event_feedback
  FOR DELETE USING (is_site_admin());

-- Admin-side wrap-up: what we learned, kept with the event forever.
ALTER TABLE events ADD COLUMN IF NOT EXISTS retro_notes TEXT;
