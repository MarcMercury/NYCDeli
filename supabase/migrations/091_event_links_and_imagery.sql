-- 091: Give the 2027 events real link lists and real imagery.
--
-- 089/090 dumped their links into the description as plain text because
-- nothing rendered `config`. That made them unclickable. This replaces the
-- flat `official_links` object with an ordered `links` array (label, url,
-- group) that the UI renders as actual anchors, adds an `images` array of
-- artwork pulled from each event's own site, sets `cover_image_path`, and
-- strips the now-duplicated link block out of the descriptions.
--
-- Image files live in public/Images/events/. Each entry keeps the photographer
-- credit and the page it came from so attribution survives in the data.

UPDATE events SET
  cover_image_path = '/Images/events/burning-man-2027-spellbound.webp',
  description =
    E'Black Rock City 2027 rises in the Nevada desert from August 29 to September 6, 2027. The Man burns Saturday September 4; the Temple burns Sunday September 5.\n\n'
    'The 2027 theme is Spellbound: a celebration of playa magic, from the serendipity of resonant coincidence to the awe of seeing things that cannot possibly be. Burning Man Project describes the city as a bazaar of enchantments — bring your curiosities, your art, your questions and your capacity for awe.\n\n'
    'NYC Deli Rats camp planning for 2027 has not started. Applications are not open and nothing here is final.',
  config = (config - 'official_links' - 'cover_image_url')
    || jsonb_build_object(
      'links', jsonb_build_array(
        jsonb_build_object('group', 'Start here', 'label', 'Black Rock City 2027', 'url', 'https://burningman.org/black-rock-city/black-rock-city-2027/'),
        jsonb_build_object('group', 'Start here', 'label', 'Spellbound theme announcement', 'url', 'https://journal.burningman.org/2026/09/news/official-announcements/burning-man-2027-spellbound/'),
        jsonb_build_object('group', 'Start here', 'label', 'Tickets & ticket updates', 'url', 'https://burningman.org/tickets'),
        jsonb_build_object('group', 'Start here', 'label', 'Help & FAQs', 'url', 'https://help.burningman.org/hc/en-us'),
        jsonb_build_object('group', 'Prepare', 'label', 'Survival Guide', 'url', 'https://survival.burningman.org/'),
        jsonb_build_object('group', 'Prepare', 'label', 'Playa Primer', 'url', 'https://linktr.ee/playaprimer'),
        jsonb_build_object('group', 'Prepare', 'label', 'Preparation resources', 'url', 'https://burningman.org/black-rock-city/preparation/'),
        jsonb_build_object('group', 'Prepare', 'label', 'Public infrastructure', 'url', 'https://burningman.org/black-rock-city/preparation/infrastructure/'),
        jsonb_build_object('group', 'Bring something', 'label', 'Theme camps & Placement', 'url', 'https://burningman.org/black-rock-city/camps/'),
        jsonb_build_object('group', 'Bring something', 'label', 'RSVP: Placement office hours', 'url', 'https://docs.google.com/forms/d/e/1FAIpQLSd4etQzC1PpRqjSRlKYpb_0jkDYgkC-X1VmTDkDUdNgjzwlww/viewform?usp=dialog'),
        jsonb_build_object('group', 'Bring something', 'label', 'Bring your art', 'url', 'https://burningman.org/black-rock-city/bring-your-art/'),
        jsonb_build_object('group', 'Bring something', 'label', 'Mutant vehicles (DMV)', 'url', 'https://burningman.org/black-rock-city/bring-your-mutant-vehicle/'),
        jsonb_build_object('group', 'Bring something', 'label', 'Renewables for Artists Team', 'url', 'https://www.renewablesforartiststeam.org/join-the-rat'),
        jsonb_build_object('group', 'Get involved', 'label', 'Volunteer matching quiz', 'url', 'https://burningmaned.typeform.com/to/Cc7OrIEs'),
        jsonb_build_object('group', 'Get involved', 'label', 'Rising Sparks', 'url', 'https://burningman.org/about-us/who-we-are/rising-sparks/'),
        jsonb_build_object('group', 'Get involved', 'label', 'Regional Network', 'url', 'https://burningman.org/global-events-groups/'),
        jsonb_build_object('group', 'Get involved', 'label', 'The Jackrabbit Speaks newsletter', 'url', 'https://burningman.org/news/jrs/'),
        jsonb_build_object('group', 'Get involved', 'label', 'Marketplace', 'url', 'https://marketplace.burningman.org/')
      ),
      'images', jsonb_build_array(
        jsonb_build_object(
          'path', '/Images/events/burning-man-2027-spellbound.webp',
          'alt', 'Burning Man 2027 Spellbound key art',
          'caption', 'Spellbound — the 2027 theme',
          'credit', 'Burning Man Project',
          'source_url', 'https://burningman.org/black-rock-city/black-rock-city-2027/',
          'link', 'https://journal.burningman.org/2026/09/news/official-announcements/burning-man-2027-spellbound/'
        ),
        jsonb_build_object(
          'path', '/Images/events/burning-man-2027-playa.webp',
          'alt', 'A burner with arms outstretched at sunset in front of a winged art piece',
          'caption', 'Eight days in the Nevada desert',
          'credit', 'LUMINEA.EU',
          'source_url', 'https://burningman.org/black-rock-city/black-rock-city-2027/',
          'link', 'https://burningman.org/black-rock-city/black-rock-city-2027/'
        ),
        jsonb_build_object(
          'path', '/Images/events/burning-man-2027-preparation.webp',
          'alt', 'Three burners carrying black and yellow gear crates on the playa',
          'caption', 'Preparation resources',
          'credit', 'espressobuzz',
          'source_url', 'https://burningman.org/black-rock-city/preparation/',
          'link', 'https://burningman.org/black-rock-city/preparation/'
        ),
        jsonb_build_object(
          'path', '/Images/events/burning-man-2027-infrastructure.webp',
          'alt', 'Participants buying block ice at an Arctica sales tent',
          'caption', 'Public infrastructure — Arctica ice sales',
          'credit', 'Robert Bruce Anderson',
          'source_url', 'https://burningman.org/black-rock-city/preparation/infrastructure/',
          'link', 'https://burningman.org/black-rock-city/preparation/infrastructure/'
        ),
        jsonb_build_object(
          'path', '/Images/events/burning-man-2027-camps.webp',
          'alt', 'A theme camp in Black Rock City',
          'caption', 'Placed camps',
          'credit', 'Philippe Glade',
          'source_url', 'https://burningman.org/black-rock-city/camps/',
          'link', 'https://burningman.org/black-rock-city/camps/'
        )
      )
    )
WHERE slug = 'burning-man-2027';

UPDATE events SET
  cover_image_path = '/Images/events/love-burn-2027-calling-artists.webp',
  description =
    E'Love Burn 2027 runs February 11–14, 2027 on Virginia Key in Miami, Florida. It is a beachfront participatory arts and camping event, volunteer-run, held in South Florida since 2014.\n\n'
    'The 2027 theme is Showtime!, an homage to the energy of live performance — Love Burn is setting aside a larger share of its art grants to bring performance groups and live acts to the event.\n\n'
    'Practical notes from the organisers: tickets are required and none are sold at the door, there are no refunds and no vendors, everyone is asked to volunteer at least four hours, and you must bring everything you need to camp for your whole stay. Love Burn states it has not been affiliated with Burning Man Project since 2024.\n\n'
    'NYC Deli Rats planning for 2027 has not started. Applications are not open and nothing here is final.',
  config = (config - 'official_links')
    || jsonb_build_object(
      'links', jsonb_build_array(
        jsonb_build_object('group', 'Start here', 'label', 'Love Burn home', 'url', 'https://theloveburn.com/'),
        jsonb_build_object('group', 'Start here', 'label', '2027 event page', 'url', 'https://theloveburn.com/home-6309'),
        jsonb_build_object('group', 'Start here', 'label', 'Tickets', 'url', 'https://tickets.theloveburn.com/2027'),
        jsonb_build_object('group', 'Start here', 'label', 'Event apps (Dust)', 'url', 'https://dust.events/'),
        jsonb_build_object('group', 'Bring something', 'label', 'Theme camps', 'url', 'https://theloveburn.com/theme'),
        jsonb_build_object('group', 'Bring something', 'label', 'Submit an art proposal', 'url', 'https://theloveburn.com/artproposals'),
        jsonb_build_object('group', 'Bring something', 'label', 'Art we have awarded', 'url', 'https://theloveburn.com/artists'),
        jsonb_build_object('group', 'Bring something', 'label', 'Volunteer', 'url', 'https://theloveburn.com/volunteer'),
        jsonb_build_object('group', 'On site', 'label', 'Event map', 'url', 'https://theloveburn.com/map'),
        jsonb_build_object('group', 'Get involved', 'label', 'Donate', 'url', 'https://theloveburn.com/donation-998281'),
        jsonb_build_object('group', 'Get involved', 'label', 'Archive & videos', 'url', 'https://theloveburn.com/videos'),
        jsonb_build_object('group', 'Get involved', 'label', 'Contact', 'url', 'https://theloveburn.com/contact'),
        jsonb_build_object('group', 'Community', 'label', 'Facebook page', 'url', 'https://www.facebook.com/theloveburn'),
        jsonb_build_object('group', 'Community', 'label', 'Facebook group', 'url', 'https://www.facebook.com/groups/loveburngroup'),
        jsonb_build_object('group', 'Community', 'label', 'Instagram', 'url', 'https://www.instagram.com/theloveburn/'),
        jsonb_build_object('group', 'Community', 'label', 'YouTube', 'url', 'https://www.youtube.com/@LoveBurn')
      ),
      'images', jsonb_build_array(
        jsonb_build_object(
          'path', '/Images/events/love-burn-2027-logo.webp',
          'alt', 'Love Burn 2027 logo',
          'caption', 'Love Burn 2027 — Showtime!',
          'credit', 'The Love Burn, Inc.',
          'source_url', 'https://theloveburn.com/'
        ),
        jsonb_build_object(
          'path', '/Images/events/love-burn-2027-calling-artists.webp',
          'alt', 'Calling artists, performers and live acts — submit your art proposal',
          'caption', 'Calling artists, performers & live acts',
          'credit', 'The Love Burn, Inc.',
          'source_url', 'https://theloveburn.com/',
          'link', 'https://theloveburn.com/artproposals'
        ),
        jsonb_build_object(
          'path', '/Images/events/love-burn-2027-bring-art.webp',
          'alt', 'Bring art to Love Burn',
          'caption', 'Bring art',
          'credit', 'The Love Burn, Inc.',
          'source_url', 'https://theloveburn.com/',
          'link', 'https://theloveburn.com/artproposals'
        ),
        jsonb_build_object(
          'path', '/Images/events/love-burn-2027-theme-camp.webp',
          'alt', 'Create a theme camp at Love Burn',
          'caption', 'Create a theme camp',
          'credit', 'The Love Burn, Inc.',
          'source_url', 'https://theloveburn.com/',
          'link', 'https://theloveburn.com/theme'
        ),
        jsonb_build_object(
          'path', '/Images/events/love-burn-2027-performance.webp',
          'alt', 'Bring a performance to Love Burn',
          'caption', 'Bring a performance',
          'credit', 'The Love Burn, Inc.',
          'source_url', 'https://theloveburn.com/',
          'link', 'https://theloveburn.com/artproposals'
        ),
        jsonb_build_object(
          'path', '/Images/events/love-burn-2027-volunteer.webp',
          'alt', 'Volunteer at Love Burn',
          'caption', 'Volunteer — everyone gives four hours',
          'credit', 'The Love Burn, Inc.',
          'source_url', 'https://theloveburn.com/',
          'link', 'https://theloveburn.com/volunteer'
        )
      )
    )
WHERE slug = 'love-burn-2027';
