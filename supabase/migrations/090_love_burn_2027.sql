-- 090: Create Love Burn 2027 ("Showtime!") as an event.
--
-- Sourced from https://theloveburn.com/ (read 2026-09-22). Love Burn 2027 runs
-- February 11–14, 2027 on Virginia Key in Miami, Florida.
--
-- Like 089, this is created closed: stage `development`, applications_open
-- false and an explicit intake_open = false override. Opening it is a UI
-- decision, not a migration.
--
-- Note for anyone reading the kind: Love Burn states it is no longer affiliated
-- with Burning Man Project as of 2024. `regional_burn` is still the closest
-- event_kind we have and it carries the right module preset.

DO $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO events (
    slug, name, kind, year, tagline, description,
    location_name, location_address, timezone,
    start_date, end_date,
    stage, is_public, is_flagship, applications_open,
    features, config
  ) VALUES (
    'love-burn-2027',
    'Love Burn 2027',
    'regional_burn',
    2027,
    'Showtime! — Virginia Key, Miami, February 11 to 14, 2027',
    E'Love Burn 2027 runs February 11–14, 2027 on Virginia Key in Miami, Florida. It is a beachfront participatory arts and camping event, volunteer-run, held in South Florida since 2014.\n\n'
    'The 2027 theme is Showtime!, an homage to the energy of live performance — Love Burn is setting aside a larger share of its art grants to bring performance groups and live acts to the event.\n\n'
    'Practical notes from the organisers: tickets are required and none are sold at the door, there are no refunds and no vendors, everyone is asked to volunteer at least four hours, and you must bring everything you need to camp for your whole stay. Love Burn states it has not been affiliated with Burning Man Project since 2024.\n\n'
    'NYC Deli Rats planning for 2027 has not started. Applications are not open and nothing here is final.\n\n'
    'Official links\n'
    '  Home: https://theloveburn.com/\n'
    '  2027 event page: https://theloveburn.com/home-6309\n'
    '  Tickets: https://tickets.theloveburn.com/2027\n'
    '  Theme camps: https://theloveburn.com/theme\n'
    '  Art proposals: https://theloveburn.com/artproposals\n'
    '  Volunteer: https://theloveburn.com/volunteer\n'
    '  Map: https://theloveburn.com/map\n'
    '  Donate: https://theloveburn.com/donation-998281\n'
    '  Archive / videos: https://theloveburn.com/videos\n'
    '  Ticket questions: tickets@theloveburn.com\n'
    '  Volunteer questions: volunteers@theloveburn.com',
    'Virginia Key, Miami, FL',
    'Virginia Key, Miami, Florida',
    'America/New_York',
    DATE '2027-02-11',
    DATE '2027-02-14',
    'development',
    true,
    false,
    false,              -- applications stay closed
    jsonb_build_object(
      'applications', true,
      'roster', true,
      'directory', true,
      'layout', true,
      'build_week', true,
      'inventory', true,
      'kitchen', true,
      'packing', true,
      'tents', true,
      'transport', true,
      'meals', true,
      'meetings', true,
      'photos', true
    ),
    jsonb_build_object(
      'source_url', 'https://theloveburn.com/',
      'source_read_on', '2026-09-22',
      'theme', jsonb_build_object('name', 'Showtime!'),
      'key_dates', jsonb_build_object(
        'event_starts', '2027-02-11',
        'event_ends', '2027-02-14'
      ),
      'official_links', jsonb_build_object(
        'home', 'https://theloveburn.com/',
        'event_page_2027', 'https://theloveburn.com/home-6309',
        'tickets', 'https://tickets.theloveburn.com/2027',
        'theme_camps', 'https://theloveburn.com/theme',
        'art_proposals', 'https://theloveburn.com/artproposals',
        'artists', 'https://theloveburn.com/artists',
        'volunteer', 'https://theloveburn.com/volunteer',
        'map', 'https://theloveburn.com/map',
        'donate', 'https://theloveburn.com/donation-998281',
        'archive_videos', 'https://theloveburn.com/videos',
        'contact', 'https://theloveburn.com/contact',
        'apps', 'https://dust.events/',
        'facebook_page', 'https://www.facebook.com/theloveburn',
        'facebook_group', 'https://www.facebook.com/groups/loveburngroup',
        'instagram', 'https://www.instagram.com/theloveburn/',
        'youtube', 'https://www.youtube.com/@LoveBurn'
      ),
      'contacts', jsonb_build_object(
        'tickets', 'tickets@theloveburn.com',
        'volunteers', 'volunteers@theloveburn.com'
      ),
      'notes', jsonb_build_array(
        'Tickets required; none sold at the door; no refunds.',
        'No vendors. Bring everything you need to camp for your entire stay.',
        'Volunteer-run: everyone is asked to volunteer at least four hours.',
        'Not affiliated with Burning Man Project as of 2024.'
      )
    )
  )
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_event_id FROM events WHERE slug = 'love-burn-2027';

  INSERT INTO event_settings (event_id, key, value) VALUES
    (v_event_id, 'intake_open', 'false'),
    (v_event_id, 'camp_selection_enabled', 'false')
  ON CONFLICT (event_id, key) DO UPDATE SET value = EXCLUDED.value;

  -- No extra calendar rows: the event window is derived from the event row and
  -- Love Burn has published no other dated milestones for 2027 yet.
END $$;
