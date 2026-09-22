-- 088_unified_directory_and_event_settings.sql
--
-- Two changes that let one screen manage everyone.
--
-- 1. `people` becomes the spine every other record hangs off. Accounts,
--    campers and applications already had a `person_id`/`user_id` column but
--    nothing guaranteed it was populated, so each admin screen invented its own
--    join (usually on email) and the three screens disagreed about the counts.
--    This backfills every link and adds the indexes those joins need.
--
-- 2. `event_settings` — registration windows, camp geometry and camp-selection
--    switches describe one event, not the organisation. They lived in
--    `system_settings`, so the 2026 camp footprint would silently become the
--    2027 footprint. `maintenance_mode` and `home_ctas` deliberately stay
--    global: proxy.ts reads maintenance_mode with an unauthenticated client on
--    every request, and the home page CTAs are org-level.

begin;

-- ---------------------------------------------------------------------------
-- 1. Directory integrity
-- ---------------------------------------------------------------------------

-- Every camper row belongs to a person. Match on email, the durable key.
update public.campers c
set person_id = p.id
from public.people p
where c.person_id is null
  and lower(c.email) = lower(p.email);

-- Campers with no person at all (historic imports) get one created.
with missing as (
  select distinct on (lower(c.email))
    lower(c.email) as email,
    c.full_name,
    c.playa_name,
    c.phone,
    c.emergency_contact_name,
    c.emergency_contact_number,
    c.emergency_contact_relationship,
    c.dietary_restrictions,
    c.allergies,
    nullif(concat_ws(e'\n', c.medical_conditions, c.medications), '') as medical_notes
  from public.campers c
  where c.person_id is null
  order by lower(c.email), c.updated_at desc
)
insert into public.people (
  email, full_name, playa_name, phone,
  emergency_contact_name, emergency_contact_number, emergency_contact_relationship,
  dietary_restrictions, allergies, medical_notes, status
)
select
  email, full_name, playa_name, phone,
  emergency_contact_name, emergency_contact_number, emergency_contact_relationship,
  dietary_restrictions, allergies, medical_notes, 'prospect'
from missing
on conflict do nothing;

update public.campers c
set person_id = p.id
from public.people p
where c.person_id is null
  and lower(c.email) = lower(p.email);

-- Every account belongs to a person.
update public.user_profiles up
set person_id = p.id
from public.people p
where up.person_id is null
  and lower(up.email) = lower(p.email);

with missing as (
  select up.id, lower(up.email) as email
  from public.user_profiles up
  where up.person_id is null
)
insert into public.people (email, full_name, status)
select m.email, split_part(m.email, '@', 1), 'prospect'
from missing m
on conflict do nothing;

update public.user_profiles up
set person_id = p.id
from public.people p
where up.person_id is null
  and lower(up.email) = lower(p.email);

-- The reverse link: a person points at the account that can sign in as them.
update public.people p
set user_id = up.id
from public.user_profiles up
where p.user_id is null
  and up.person_id = p.id;

-- An account points at its camper row for the most recent event it has one in.
update public.user_profiles up
set camper_id = c.id
from (
  select distinct on (c.person_id) c.id, c.person_id
  from public.campers c
  left join public.events e on e.id = c.event_id
  where c.person_id is not null
  order by c.person_id, e.start_date desc nulls last, c.created_at desc
) c
where up.camper_id is null
  and up.person_id = c.person_id;

-- Applications and participations carry the camper row they were decided on.
update public.event_applications ea
set camper_id = c.id
from public.campers c
where ea.camper_id is null
  and c.person_id = ea.person_id
  and c.event_id is not distinct from ea.event_id;

update public.event_participants ep
set camper_id = c.id
from public.campers c
where ep.camper_id is null
  and c.person_id = ep.person_id
  and c.event_id is not distinct from ep.event_id;

create index if not exists idx_campers_person_id on public.campers(person_id);
create index if not exists idx_user_profiles_person_id on public.user_profiles(person_id);
create index if not exists idx_people_user_id on public.people(user_id);
create index if not exists idx_event_applications_person on public.event_applications(person_id);
create index if not exists idx_event_participants_person on public.event_participants(person_id);

-- ---------------------------------------------------------------------------
-- 2. Event-scoped settings
-- ---------------------------------------------------------------------------

create table if not exists public.event_settings (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  key text not null,
  value text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, key)
);

create index if not exists idx_event_settings_event on public.event_settings(event_id);

drop trigger if exists set_event_settings_updated_at on public.event_settings;
create trigger set_event_settings_updated_at
  before update on public.event_settings
  for each row execute function public.set_updated_at();

alter table public.event_settings enable row level security;

-- Readable by anyone for the same reason system_settings is: the public intake
-- and layout pages need the registration window and camp footprint before the
-- visitor has an account. Nothing sensitive is stored here.
drop policy if exists event_settings_select_public on public.event_settings;
create policy event_settings_select_public on public.event_settings
  for select using (true);

drop policy if exists event_settings_modify_admin on public.event_settings;
create policy event_settings_modify_admin on public.event_settings
  for all using (public.is_site_admin()) with check (public.is_site_admin());

-- Seed each existing event from the global values it was actually run with, so
-- nothing changes behaviour on the day this ships.
insert into public.event_settings (event_id, key, value)
select e.id, s.key, s.value
from public.events e
cross join public.system_settings s
where s.key in (
  'registration_deadline',
  'intake_open',
  'camp_width_ft',
  'camp_length_ft',
  'min_tent_spacing_ft',
  'camp_selection_enabled',
  'camp_selection_open_date'
)
on conflict (event_id, key) do nothing;

commit;
