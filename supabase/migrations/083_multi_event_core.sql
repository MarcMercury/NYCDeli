-- 083: Multi-event core.
--
-- Re-centers the database away from "the current Burning Man event" and onto
-- the NYC Deli Rats organization itself:
--
--   NYC Deli Rats
--     -> people            (persistent CRM identity, survives every event)
--       -> event_applications  (a person asking to join an event)
--         -> event_participants (an approved person operating inside an event)
--     -> events            (lifecycle-staged, independently configurable)
--     -> camp_events       (org-level calendar, optionally tied to an event)
--
-- Nothing here changes existing behaviour: every event-scoped table gets a
-- nullable `event_id` which 084 backfills to the Burning Man 2026 event.

-- ---------------------------------------------------------------------------
-- 0. Shared helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Admin check that mirrors the existing is_approved() helper from 081.
CREATE OR REPLACE FUNCTION public.is_site_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(public.get_my_role() = 'admin'::user_role, false);
$$;

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE event_stage AS ENUM (
    'development',    -- 2. being built by admins, may be publicly listed
    'application',    -- 3. applications open
    'prep',           -- 4. approved participants join operational planning
    'finalization',   -- 5. applications closed, roster final
    'build',          -- 6. onsite build
    'live',           -- 7. event happening (stripped-down operational view)
    'post_event',     -- 8. ended but still active (feedback, notes, wrap-up)
    'closed'          -- 9. archived, read-only, history preserved on people
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_kind AS ENUM (
    'burning_man', 'regional_burn', 'camp_social', 'fundraiser',
    'build_day', 'meeting', 'retreat', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM (
    'draft', 'submitted', 'under_review', 'waitlisted',
    'approved', 'denied', 'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE participant_status AS ENUM (
    'invited', 'confirmed', 'tentative', 'withdrawn', 'no_show', 'attended'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE participant_role AS ENUM (
    'camper', 'lead', 'builder', 'guest', 'vendor'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE person_status AS ENUM (
    'prospect', 'applicant', 'member', 'alumni', 'inactive', 'blocked'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind event_kind NOT NULL DEFAULT 'other',
  year INTEGER,
  tagline TEXT,
  description TEXT,

  location_name TEXT,
  location_address TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',

  start_date DATE,
  end_date DATE,
  build_start_date DATE,
  strike_end_date DATE,
  applications_open_at TIMESTAMPTZ,
  applications_close_at TIMESTAMPTZ,

  stage event_stage NOT NULL DEFAULT 'development',
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_flagship BOOLEAN NOT NULL DEFAULT false,
  applications_open BOOLEAN NOT NULL DEFAULT false,
  capacity INTEGER,

  -- Per-event module toggles. Small events opt out of Burning Man complexity;
  -- see EVENT_FEATURES in src/lib/events.ts for the key list.
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Free-form per-event settings (camp geometry, dues, custom copy, ...).
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Ordered question definitions for this event's application form.
  application_schema JSONB NOT NULL DEFAULT '[]'::jsonb,

  cover_image_path TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_events_stage ON events (stage);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events (start_date);
-- At most one flagship (the event the app foregrounds) at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_single_flagship
  ON events (is_flagship) WHERE is_flagship;

DROP TRIGGER IF EXISTS events_updated_at ON events;
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS event_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_stage event_stage,
  to_stage event_stage NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_event_stage_history_event
  ON event_stage_history (event_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. people — the permanent CRM record
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Nullable: imported//offline applicants exist before they ever log in.
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,

  full_name TEXT NOT NULL,
  preferred_name TEXT,
  playa_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  pronouns TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  socials JSONB NOT NULL DEFAULT '{}'::jsonb,

  emergency_contact_name TEXT,
  emergency_contact_number TEXT,
  emergency_contact_relationship TEXT,
  dietary_restrictions TEXT,
  allergies TEXT,
  medical_notes TEXT,

  bio TEXT,
  photo_path TEXT,

  status person_status NOT NULL DEFAULT 'prospect',
  tags TEXT[] NOT NULL DEFAULT '{}',
  admin_notes TEXT,

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_people_email_lower ON people (lower(email));
CREATE INDEX IF NOT EXISTS idx_people_status ON people (status);
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people (user_id);

DROP TRIGGER IF EXISTS people_updated_at ON people;
CREATE TRIGGER people_updated_at BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS person_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_person_notes_person
  ON person_notes (person_id, created_at DESC);

DROP TRIGGER IF EXISTS person_notes_updated_at ON person_notes;
CREATE TRIGGER person_notes_updated_at BEFORE UPDATE ON person_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. event_applications — person asks to join an event
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS event_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,

  status application_status NOT NULL DEFAULT 'draft',
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'web',
  is_returning BOOLEAN NOT NULL DEFAULT false,

  submitted_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_note TEXT,
  admin_summary TEXT,

  -- Legacy bridge: the 2026 application data lives on campers.
  camper_id UUID REFERENCES campers(id) ON DELETE SET NULL,

  UNIQUE (event_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_event_applications_event_status
  ON event_applications (event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_applications_person
  ON event_applications (person_id);

DROP TRIGGER IF EXISTS event_applications_updated_at ON event_applications;
CREATE TRIGGER event_applications_updated_at BEFORE UPDATE ON event_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. event_participants — approved person operating inside an event
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  application_id UUID REFERENCES event_applications(id) ON DELETE SET NULL,

  -- Operational profile for this event. For Burning Man style events this is
  -- the existing `campers` row; simpler events may leave it null.
  camper_id UUID REFERENCES campers(id) ON DELETE SET NULL,

  role participant_role NOT NULL DEFAULT 'camper',
  status participant_status NOT NULL DEFAULT 'confirmed',
  teams TEXT[] NOT NULL DEFAULT '{}',
  arrival_date DATE,
  departure_date DATE,
  paid BOOLEAN NOT NULL DEFAULT false,
  dues_amount NUMERIC(10,2),
  notes TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (event_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_event
  ON event_participants (event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_participants_person
  ON event_participants (person_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_camper
  ON event_participants (camper_id);

DROP TRIGGER IF EXISTS event_participants_updated_at ON event_participants;
CREATE TRIGGER event_participants_updated_at BEFORE UPDATE ON event_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Scope existing tables to an event (nullable; 084 backfills BM 2026)
-- ---------------------------------------------------------------------------

ALTER TABLE campers              ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE campers              ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES people(id) ON DELETE SET NULL;
ALTER TABLE user_profiles        ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE floorplan_configs    ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE kitchen_roles        ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE kitchen_shifts       ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE build_stages         ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE build_schedule_items ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE build_inventory      ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE build_resources      ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE shift_drafts         ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE electrical_load_config ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campers_event ON campers (event_id);
CREATE INDEX IF NOT EXISTS idx_campers_person ON campers (person_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_person ON user_profiles (person_id);

-- build_meetings only exists from 055 onward; guard so the file stays replayable.
DO $$ BEGIN
  IF to_regclass('public.build_meetings') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE build_meetings ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. camp_events becomes the org-level NYC Deli calendar
-- ---------------------------------------------------------------------------

ALTER TABLE camp_events ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE camp_events ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE camp_events ADD COLUMN IF NOT EXISTS all_day BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE camp_events ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE camp_events ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE camp_events ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_camp_events_event ON camp_events (event_id);

-- ---------------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE people              ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants  ENABLE ROW LEVEL SECURITY;

-- events: public listings are intentionally readable by anon (marketing site).
DROP POLICY IF EXISTS events_select ON events;
CREATE POLICY events_select ON events
  FOR SELECT USING (is_public OR is_approved() OR is_site_admin());

DROP POLICY IF EXISTS events_insert ON events;
CREATE POLICY events_insert ON events FOR INSERT WITH CHECK (is_site_admin());
DROP POLICY IF EXISTS events_update ON events;
CREATE POLICY events_update ON events FOR UPDATE USING (is_site_admin()) WITH CHECK (is_site_admin());
DROP POLICY IF EXISTS events_delete ON events;
CREATE POLICY events_delete ON events FOR DELETE USING (is_site_admin());

DROP POLICY IF EXISTS event_stage_history_select ON event_stage_history;
CREATE POLICY event_stage_history_select ON event_stage_history
  FOR SELECT USING (is_approved());
DROP POLICY IF EXISTS event_stage_history_insert ON event_stage_history;
CREATE POLICY event_stage_history_insert ON event_stage_history
  FOR INSERT WITH CHECK (is_site_admin());

-- people: personal + medical data. Own row or admin only (builders excluded).
DROP POLICY IF EXISTS people_select ON people;
CREATE POLICY people_select ON people
  FOR SELECT USING (user_id = auth.uid() OR is_site_admin());

DROP POLICY IF EXISTS people_insert ON people;
CREATE POLICY people_insert ON people
  FOR INSERT WITH CHECK (user_id = auth.uid() OR is_site_admin());

DROP POLICY IF EXISTS people_update ON people;
CREATE POLICY people_update ON people
  FOR UPDATE USING (user_id = auth.uid() OR is_site_admin())
  WITH CHECK (user_id = auth.uid() OR is_site_admin());

DROP POLICY IF EXISTS people_delete ON people;
CREATE POLICY people_delete ON people FOR DELETE USING (is_site_admin());

-- person_notes: leadership-only, never visible to the person themselves.
DROP POLICY IF EXISTS person_notes_all ON person_notes;
CREATE POLICY person_notes_all ON person_notes
  FOR ALL USING (is_site_admin()) WITH CHECK (is_site_admin());

-- applications: applicants see their own (including while still pending).
DROP POLICY IF EXISTS event_applications_select ON event_applications;
CREATE POLICY event_applications_select ON event_applications
  FOR SELECT USING (
    is_site_admin()
    OR person_id IN (SELECT id FROM people WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS event_applications_insert ON event_applications;
CREATE POLICY event_applications_insert ON event_applications
  FOR INSERT WITH CHECK (
    is_site_admin()
    OR person_id IN (SELECT id FROM people WHERE user_id = auth.uid())
  );

-- Applicants may edit their own application only before a decision is made.
DROP POLICY IF EXISTS event_applications_update ON event_applications;
CREATE POLICY event_applications_update ON event_applications
  FOR UPDATE USING (
    is_site_admin()
    OR (
      person_id IN (SELECT id FROM people WHERE user_id = auth.uid())
      AND status IN ('draft', 'submitted', 'under_review')
    )
  ) WITH CHECK (
    is_site_admin()
    OR person_id IN (SELECT id FROM people WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS event_applications_delete ON event_applications;
CREATE POLICY event_applications_delete ON event_applications
  FOR DELETE USING (is_site_admin());

-- participants: the roster. Readable by approved members, written by admins.
DROP POLICY IF EXISTS event_participants_select ON event_participants;
CREATE POLICY event_participants_select ON event_participants
  FOR SELECT USING (is_approved());

DROP POLICY IF EXISTS event_participants_write ON event_participants;
CREATE POLICY event_participants_write ON event_participants
  FOR ALL USING (is_site_admin()) WITH CHECK (is_site_admin());

-- camp_events: now the org-level calendar, so items flagged is_public are part
-- of the public NYC Deli site. Replaces the approved-only read from 065/081.
DROP POLICY IF EXISTS "Allow all access to camp_events" ON camp_events;
DROP POLICY IF EXISTS camp_events_select_approved ON camp_events;
DROP POLICY IF EXISTS camp_events_select ON camp_events;
CREATE POLICY camp_events_select ON camp_events
  FOR SELECT USING (is_public OR is_approved() OR is_site_admin());

-- Writes stay admin-only (065 already had this; kept under one FOR ALL policy).
DROP POLICY IF EXISTS camp_events_insert_admin ON camp_events;
DROP POLICY IF EXISTS camp_events_update_admin ON camp_events;
DROP POLICY IF EXISTS camp_events_delete_admin ON camp_events;
DROP POLICY IF EXISTS camp_events_write ON camp_events;
CREATE POLICY camp_events_write ON camp_events
  FOR ALL USING (is_site_admin()) WITH CHECK (is_site_admin());
