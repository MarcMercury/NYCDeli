-- 089: Create Burning Man 2027 ("Spellbound") as the next event.
--
-- Sourced from https://burningman.org/black-rock-city/black-rock-city-2027/
-- (read 2026-09-22). Black Rock City 2027 runs August 29 – September 6, 2027;
-- the Man burns Saturday September 4 (confirmed by the official countdown).
--
-- Deliberately NOT opened for applications: the event lands in the
-- `development` stage with applications_open = false and an explicit
-- event_settings override of intake_open = false, so neither the public intake
-- form nor the event page will accept anyone yet. Flipping it on is a UI
-- decision, not a migration.

DO $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO events (
    slug, name, kind, year, tagline, description,
    location_name, location_address, timezone,
    start_date, end_date, build_start_date,
    stage, is_public, is_flagship, applications_open,
    features, config
  ) VALUES (
    'burning-man-2027',
    'Burning Man 2027',
    'burning_man',
    2027,
    'Spellbound — Black Rock City, August 29 to September 6, 2027',
    E'Black Rock City 2027 rises in the Nevada desert from August 29 to September 6, 2027. The Man burns Saturday September 4; the Temple burns Sunday September 5.\n\n'
    'The 2027 theme is Spellbound: a celebration of playa magic, from the serendipity of resonant coincidence to the awe of seeing things that cannot possibly be. Burning Man Project describes the city as a bazaar of enchantments — bring your curiosities, your art, your questions and your capacity for awe.\n\n'
    'NYC Deli Rats camp planning for 2027 has not started. Applications are not open and nothing here is final.\n\n'
    'Official links\n'
    '  Event page: https://burningman.org/black-rock-city/black-rock-city-2027/\n'
    '  Theme announcement: https://journal.burningman.org/2026/09/news/official-announcements/burning-man-2027-spellbound/\n'
    '  Tickets and ticket updates: https://burningman.org/tickets\n'
    '  Survival Guide: https://survival.burningman.org/\n'
    '  Playa Primer: https://linktr.ee/playaprimer\n'
    '  Preparation resources: https://burningman.org/black-rock-city/preparation/\n'
    '  Public infrastructure: https://burningman.org/black-rock-city/preparation/infrastructure/\n'
    '  Theme camps and Placement: https://burningman.org/black-rock-city/camps/\n'
    '  Bring your art: https://burningman.org/black-rock-city/bring-your-art/\n'
    '  Mutant vehicles / DMV: https://burningman.org/black-rock-city/bring-your-mutant-vehicle/\n'
    '  Volunteer matching quiz: https://burningmaned.typeform.com/to/Cc7OrIEs\n'
    '  Help and FAQs: https://help.burningman.org/hc/en-us',
    'Black Rock City, NV',
    'Black Rock Desert, Gerlach, NV 89412',
    'America/Los_Angeles',
    DATE '2027-08-29',
    DATE '2027-09-06',
    DATE '2027-08-22',   -- build week convention: one week before gates
    'development',
    true,
    false,              -- leave the flagship slot alone; ops still reads 2026 history
    false,              -- applications stay closed
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
    jsonb_build_object(
      'source_url', 'https://burningman.org/black-rock-city/black-rock-city-2027/',
      'source_read_on', '2026-09-22',
      'theme', jsonb_build_object(
        'name', 'Spellbound',
        'announcement_url', 'https://journal.burningman.org/2026/09/news/official-announcements/burning-man-2027-spellbound/'
      ),
      'key_dates', jsonb_build_object(
        'gates_open', '2027-08-29',
        'man_burn', '2027-09-04',
        'temple_burn', '2027-09-05',
        'event_ends', '2027-09-06'
      ),
      'official_links', jsonb_build_object(
        'event_page', 'https://burningman.org/black-rock-city/black-rock-city-2027/',
        'theme_announcement', 'https://journal.burningman.org/2026/09/news/official-announcements/burning-man-2027-spellbound/',
        'tickets', 'https://burningman.org/tickets',
        'survival_guide', 'https://survival.burningman.org/',
        'survival_guide_page', 'https://burningman.org/black-rock-city/preparation/survival-guide/',
        'playa_primer', 'https://linktr.ee/playaprimer',
        'preparation', 'https://burningman.org/black-rock-city/preparation/',
        'infrastructure', 'https://burningman.org/black-rock-city/preparation/infrastructure/',
        'theme_camps_placement', 'https://burningman.org/black-rock-city/camps/',
        'bring_your_art', 'https://burningman.org/black-rock-city/bring-your-art/',
        'mutant_vehicles', 'https://burningman.org/black-rock-city/bring-your-mutant-vehicle/',
        'volunteer_quiz', 'https://burningmaned.typeform.com/to/Cc7OrIEs',
        'rising_sparks', 'https://burningman.org/about-us/who-we-are/rising-sparks/',
        'regional_network', 'https://burningman.org/global-events-groups/',
        'placement_office_hours_rsvp', 'https://docs.google.com/forms/d/e/1FAIpQLSd4etQzC1PpRqjSRlKYpb_0jkDYgkC-X1VmTDkDUdNgjzwlww/viewform?usp=dialog',
        'renewables_for_artists_team', 'https://www.renewablesforartiststeam.org/join-the-rat',
        'help_faqs', 'https://help.burningman.org/hc/en-us',
        'marketplace', 'https://marketplace.burningman.org/',
        'jackrabbit_speaks', 'https://burningman.org/news/jrs/'
      ),
      'cover_image_url', 'https://burningman.org/wp-content/uploads/2026/09/1200x660.png'
    )
  )
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_event_id FROM events WHERE slug = 'burning-man-2027';

  -- Applications and intake explicitly off for this event, regardless of what
  -- the legacy global system_settings rows say.
  INSERT INTO event_settings (event_id, key, value) VALUES
    (v_event_id, 'intake_open', 'false'),
    (v_event_id, 'camp_selection_enabled', 'false')
  ON CONFLICT (event_id, key) DO UPDATE SET value = EXCLUDED.value;

  -- Calendar. The event window and build start are derived from the event row
  -- itself (see eventsAsCalendarItems), so only the dates that are not already
  -- implied get stored here.
  INSERT INTO camp_events (title, description, event_date, end_date, start_time, location, category, is_public, link_url, event_id, created_by)
  SELECT v.title, v.description, v.event_date, v.end_date, v.start_time, v.location, v.category, v.is_public, v.link_url, v_event_id, v.created_by
  FROM (VALUES
    (
      'Burn Night — the Man burns',
      'Saturday of Black Rock City 2027 (Spellbound).',
      DATE '2027-09-04', NULL::date, NULL::time,
      'Black Rock City, NV', 'event', true,
      'https://burningman.org/black-rock-city/black-rock-city-2027/', 'burningman.org'
    ),
    (
      'Temple Burn',
      'Closing Sunday of Black Rock City 2027.',
      DATE '2027-09-05', NULL::date, NULL::time,
      'Black Rock City, NV', 'event', true,
      'https://burningman.org/black-rock-city/black-rock-city-2027/', 'burningman.org'
    ),
    (
      'Renewables for Artists Team (RAT) weekly meet',
      E'Open to anyone interested in renewable energy. RAT technical advisors mentor camps moving from generators to renewables.\nTime as published by Burning Man Project (Pacific).',
      DATE '2026-09-23', NULL::date, TIME '18:30',
      'Online', 'planning', false,
      'https://www.renewablesforartiststeam.org/join-the-rat', 'burningman.org'
    ),
    (
      'Renewables for Artists Team (RAT) weekly meet',
      E'Open to anyone interested in renewable energy. RAT technical advisors mentor camps moving from generators to renewables.\nTime as published by Burning Man Project (Pacific).',
      DATE '2026-10-07', NULL::date, TIME '18:30',
      'Online', 'planning', false,
      'https://www.renewablesforartiststeam.org/join-the-rat', 'burningman.org'
    ),
    (
      'BRC Placement office hours',
      E'Monthly online session for theme camp questions — joining or creating a camp in Black Rock City. RSVP for the Zoom link.\nTime as published by Burning Man Project (Pacific).',
      DATE '2026-10-08', NULL::date, TIME '18:00',
      'Online', 'planning', false,
      'https://docs.google.com/forms/d/e/1FAIpQLSd4etQzC1PpRqjSRlKYpb_0jkDYgkC-X1VmTDkDUdNgjzwlww/viewform?usp=dialog', 'burningman.org'
    ),
    (
      'BRC Placement office hours',
      E'Monthly online session for theme camp questions — joining or creating a camp in Black Rock City. RSVP for the Zoom link.\nTime as published by Burning Man Project (Pacific).',
      DATE '2026-10-09', NULL::date, TIME '10:00',
      'Online', 'planning', false,
      'https://docs.google.com/forms/d/e/1FAIpQLSd4etQzC1PpRqjSRlKYpb_0jkDYgkC-X1VmTDkDUdNgjzwlww/viewform?usp=dialog', 'burningman.org'
    ),
    (
      'BRC Placement office hours',
      E'Monthly online session for theme camp questions — joining or creating a camp in Black Rock City. RSVP for the Zoom link.\nTime as published by Burning Man Project (Pacific).',
      DATE '2026-11-12', NULL::date, TIME '18:00',
      'Online', 'planning', false,
      'https://docs.google.com/forms/d/e/1FAIpQLSd4etQzC1PpRqjSRlKYpb_0jkDYgkC-X1VmTDkDUdNgjzwlww/viewform?usp=dialog', 'burningman.org'
    ),
    (
      'BRC Placement office hours',
      E'Monthly online session for theme camp questions — joining or creating a camp in Black Rock City. RSVP for the Zoom link.\nTime as published by Burning Man Project (Pacific).',
      DATE '2026-11-13', NULL::date, TIME '10:00',
      'Online', 'planning', false,
      'https://docs.google.com/forms/d/e/1FAIpQLSd4etQzC1PpRqjSRlKYpb_0jkDYgkC-X1VmTDkDUdNgjzwlww/viewform?usp=dialog', 'burningman.org'
    )
  ) AS v(title, description, event_date, end_date, start_time, location, category, is_public, link_url, created_by)
  WHERE NOT EXISTS (
    SELECT 1 FROM camp_events c
    WHERE c.title = v.title AND c.event_date = v.event_date
  );
END $$;
