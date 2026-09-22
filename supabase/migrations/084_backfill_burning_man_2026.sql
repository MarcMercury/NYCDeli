-- 084: Backfill Burning Man 2026 as the first event and lift every existing
-- camper/applicant into the permanent people CRM.
--
-- After this migration:
--   * one `events` row (burning-man-2026) owns all current operational data
--   * every camper, approved user and archived applicant has a `people` row
--   * participation is expressed as event_applications + event_participants
--   * nothing is deleted and no existing query changes behaviour

DO $$
DECLARE
  v_event_id UUID;
  v_start DATE;
  v_end DATE;
  v_build DATE;
BEGIN
  -- Reuse the dates the single-event app was already configured with.
  SELECT value::date INTO v_start FROM system_settings WHERE key = 'burn_start_date';
  SELECT value::date INTO v_end   FROM system_settings WHERE key = 'burn_end_date';
  SELECT value::date INTO v_build FROM system_settings WHERE key = 'build_week_start';

  v_start := coalesce(v_start, DATE '2026-08-30');
  v_end   := coalesce(v_end,   DATE '2026-09-07');
  v_build := coalesce(v_build, v_start - 7);

  INSERT INTO events (
    slug, name, kind, year, tagline, description,
    location_name, timezone,
    start_date, end_date, build_start_date,
    stage, is_public, is_flagship, applications_open,
    features, config
  ) VALUES (
    'burning-man-2026',
    'Burning Man 2026',
    'burning_man',
    2026,
    'NYC Deli Rats on the playa',
    'NYC Deli Rats'' 2026 Black Rock City camp — the reference implementation for a full-complexity event: build week, camp layout, kitchen shifts, electrical load, tents and logistics.',
    'Black Rock City, NV',
    'America/Los_Angeles',
    v_start, v_end, v_build,
    'post_event',   -- the burn has happened; admins close it from the UI
    true,
    true,
    false,
    jsonb_build_object(
      'applications', true,
      'roster', true,
      'directory', true,
      'layout', true,
      'build_week', true,
      'inventory', true,
      'electrical', true,
      'kitchen', true,
      'shift_draft', true,
      'packing', true,
      'tents', true,
      'transport', true,
      'meals', true,
      'meetings', true,
      'photos', true
    ),
    '{}'::jsonb
  )
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_event_id FROM events WHERE slug = 'burning-man-2026';

  -- 1. Scope existing operational data to the 2026 event ---------------------
  UPDATE campers              SET event_id = v_event_id WHERE event_id IS NULL;
  UPDATE floorplan_configs    SET event_id = v_event_id WHERE event_id IS NULL;
  UPDATE kitchen_roles        SET event_id = v_event_id WHERE event_id IS NULL;
  UPDATE kitchen_shifts       SET event_id = v_event_id WHERE event_id IS NULL;
  UPDATE build_stages         SET event_id = v_event_id WHERE event_id IS NULL;
  UPDATE build_schedule_items SET event_id = v_event_id WHERE event_id IS NULL;
  UPDATE build_inventory      SET event_id = v_event_id WHERE event_id IS NULL;
  UPDATE build_resources      SET event_id = v_event_id WHERE event_id IS NULL;
  UPDATE shift_drafts         SET event_id = v_event_id WHERE event_id IS NULL;
  UPDATE electrical_load_config SET event_id = v_event_id WHERE event_id IS NULL;

  IF to_regclass('public.build_meetings') IS NOT NULL THEN
    EXECUTE format('UPDATE build_meetings SET event_id = %L WHERE event_id IS NULL', v_event_id);
  END IF;

  -- Calendar items inside the 2026 build/burn window belong to that event;
  -- everything else stays an org-level NYC Deli calendar item.
  UPDATE camp_events
     SET event_id = v_event_id
   WHERE event_id IS NULL
     AND event_date BETWEEN v_build - 14 AND v_end + 7;

  -- 2. People from campers ---------------------------------------------------
  INSERT INTO people (
    full_name, playa_name, email, phone,
    emergency_contact_name, emergency_contact_number, emergency_contact_relationship,
    dietary_restrictions, allergies, medical_notes,
    status, first_seen_at
  )
  SELECT DISTINCT ON (lower(c.email))
    c.full_name, c.playa_name, c.email, c.phone,
    c.emergency_contact_name, c.emergency_contact_number, c.emergency_contact_relationship,
    c.dietary_restrictions, c.allergies,
    nullif(concat_ws(E'\n', nullif(c.medical_conditions, ''), nullif(c.medications, '')), ''),
    'member'::person_status, c.created_at
  FROM campers c
  WHERE c.email IS NOT NULL AND c.email <> ''
  ORDER BY lower(c.email), c.created_at
  ON CONFLICT (lower(email)) DO NOTHING;

  -- 3. People from auth accounts that never got a camper row (e.g. admins) ---
  INSERT INTO people (full_name, email, bio, status, first_seen_at)
  SELECT DISTINCT ON (lower(up.email))
    split_part(up.email, '@', 1), up.email, up.bio,
    CASE WHEN up.role = 'pending' THEN 'applicant' ELSE 'member' END::person_status,
    up.created_at
  FROM user_profiles up
  WHERE up.email IS NOT NULL AND up.email <> ''
  ORDER BY lower(up.email), up.created_at
  ON CONFLICT (lower(email)) DO NOTHING;

  -- 4. Link identities -------------------------------------------------------
  UPDATE people p
     SET user_id = up.id,
         bio = coalesce(p.bio, up.bio)
    FROM user_profiles up
   WHERE lower(up.email) = lower(p.email)
     AND p.user_id IS NULL;

  UPDATE user_profiles up
     SET person_id = p.id
    FROM people p
   WHERE lower(p.email) = lower(up.email)
     AND up.person_id IS NULL;

  UPDATE campers c
     SET person_id = p.id
    FROM people p
   WHERE lower(p.email) = lower(c.email)
     AND c.person_id IS NULL;

  -- 5. Applications (imported, already decided) ------------------------------
  INSERT INTO event_applications (
    event_id, person_id, camper_id, status, source, submitted_at, decided_at, responses
  )
  SELECT
    v_event_id, c.person_id, c.id, 'approved'::application_status, 'import', c.created_at, c.created_at,
    jsonb_strip_nulls(jsonb_build_object(
      'burn_count', c.burn_count,
      'what_attracted_you', c.what_attracted_you,
      'referral_source', c.referral_source,
      'character_references', c.character_references,
      'first_burn_hopes', c.first_burn_hopes,
      'skills', to_jsonb(c.skills),
      'volunteer_commitment', c.volunteer_commitment
    ))
  FROM campers c
  WHERE c.person_id IS NOT NULL
  ON CONFLICT (event_id, person_id) DO NOTHING;

  -- 6. Participants (the 2026 roster) ---------------------------------------
  INSERT INTO event_participants (
    event_id, person_id, application_id, camper_id,
    role, status, arrival_date, departure_date, paid, joined_at
  )
  SELECT
    v_event_id, c.person_id, ea.id, c.id,
    CASE WHEN c.build_week_attending THEN 'builder' ELSE 'camper' END::participant_role,
    'attended'::participant_status,
    c.arrival_date, c.departure_date, c.paid, c.created_at
  FROM campers c
  LEFT JOIN event_applications ea
    ON ea.event_id = v_event_id AND ea.person_id = c.person_id
  WHERE c.person_id IS NOT NULL
  ON CONFLICT (event_id, person_id) DO NOTHING;

  -- 7. Archived (denied) applicants stay in the CRM as history --------------
  IF to_regclass('public.archived_applicants') IS NOT NULL THEN
    INSERT INTO people (full_name, playa_name, email, status, first_seen_at)
    SELECT DISTINCT ON (lower(a.email))
      coalesce(a.full_name, split_part(a.email, '@', 1)), a.playa_name, a.email,
      'applicant'::person_status, a.created_at
    FROM archived_applicants a
    WHERE a.email IS NOT NULL AND a.email <> ''
    ORDER BY lower(a.email), a.created_at
    ON CONFLICT (lower(email)) DO NOTHING;

    INSERT INTO event_applications (
      event_id, person_id, status, source, submitted_at, decided_at, decision_note, responses
    )
    SELECT DISTINCT ON (p.id)
      v_event_id, p.id, 'denied'::application_status, 'import',
      a.created_at, a.denied_at, a.denied_reason, coalesce(a.profile_data, '{}'::jsonb)
    FROM archived_applicants a
    JOIN people p ON lower(p.email) = lower(a.email)
    ORDER BY p.id, a.archived_at DESC
    ON CONFLICT (event_id, person_id) DO NOTHING;
  END IF;

  -- 8. Record where the event currently sits in its lifecycle ---------------
  INSERT INTO event_stage_history (event_id, from_stage, to_stage, note)
  SELECT v_event_id, NULL, 'post_event'::event_stage,
         'Imported from the single-event application as the first historical event.'
  WHERE NOT EXISTS (SELECT 1 FROM event_stage_history WHERE event_id = v_event_id);
END $$;
