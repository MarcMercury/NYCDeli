import { createClient } from '@/lib/supabase/client'
import type { DeliSupabase } from '@/lib/events'
import {
  OPEN_APPLICATION_STATUSES,
  derivePersonStatus,
  type JoinedApplication,
  type JoinedParticipation,
} from '@/lib/people'
import type {
  CamperRow,
  EventRow,
  PersonRow,
  PersonStatus,
  UserProfileRow,
  UserRole,
} from '@/types/database'

/**
 * One reader for every human NYC Deli knows about.
 *
 * Before this existed, the admin portal joined `user_profiles` to `campers` on
 * email, the applicant queue read `user_profiles.role`, and the CRM read
 * `people` — three screens, three definitions of "who", three different totals.
 * Migration 088 guarantees the `person_id` links, so everything can be assembled
 * from the `people` spine instead of guessed at.
 */

function db(client?: DeliSupabase): DeliSupabase {
  return client ?? (createClient() as DeliSupabase)
}

/** What the person can do once signed in. `none` means no login exists yet. */
export type AccessLevel = UserRole | 'none'

export const ACCESS_META: Record<AccessLevel, { label: string; hint: string; className: string }> = {
  none: { label: 'No login', hint: 'No account has been created yet.', className: 'bg-gray-200 text-black' },
  pending: { label: 'Pending', hint: 'Signed up but not approved — locked out of the app.', className: 'bg-yellow-200 text-black' },
  user: { label: 'Member', hint: 'Full camper access.', className: 'bg-green-300 text-black' },
  builder: { label: 'Builder', hint: 'Camper access plus build week tooling.', className: 'bg-blue-300 text-black' },
  admin: { label: 'Admin', hint: 'Everything, including this screen.', className: 'bg-red-300 text-black' },
}

export const ASSIGNABLE_ROLES: UserRole[] = ['pending', 'user', 'builder', 'admin']

export interface DirectoryEntry {
  person: PersonRow
  account: UserProfileRow | null
  /** All history, newest first. */
  applications: JoinedApplication[]
  participations: JoinedParticipation[]
  campers: CamperRow[]
  /** Narrowed to the event the directory was fetched for, when one was given. */
  application: JoinedApplication | null
  participation: JoinedParticipation | null
  camper: CamperRow | null
  /** True while an application is still awaiting a decision. */
  awaitingDecision: boolean
  status: PersonStatus
  access: AccessLevel
}

export interface DirectoryFilter {
  search?: string
  status?: PersonStatus | 'all'
  access?: AccessLevel | 'all'
  /** Restrict to people who applied to, or took part in, one event. */
  eventId?: string | 'all'
  limit?: number
}

export interface DirectoryCounts {
  total: number
  awaitingDecision: number
  noLogin: number
  pendingAccess: number
  onRoster: number
}

export async function fetchDirectory(
  filter: DirectoryFilter = {},
  client?: DeliSupabase
): Promise<DirectoryEntry[]> {
  const supabase = db(client)

  const [peopleRes, accountsRes, campersRes, appsRes, partsRes] = await Promise.all([
    supabase.from('people').select('*').order('full_name', { ascending: true }),
    supabase.from('user_profiles').select('*'),
    supabase.from('campers').select('*').order('created_at', { ascending: false }),
    supabase.from('event_applications').select('*, event:events(*)').order('created_at', { ascending: false }),
    supabase.from('event_participants').select('*, event:events(*)').order('created_at', { ascending: false }),
  ])

  const people = (peopleRes.data as PersonRow[] | null) ?? []
  const accounts = (accountsRes.data as UserProfileRow[] | null) ?? []
  const campers = (campersRes.data as CamperRow[] | null) ?? []
  const applications = (appsRes.data as unknown as JoinedApplication[] | null) ?? []
  const participations = (partsRes.data as unknown as JoinedParticipation[] | null) ?? []

  const accountByPerson = keyBy(accounts, a => a.person_id)
  const accountByEmail = keyBy(accounts, a => a.email?.toLowerCase() ?? null)
  const campersByPerson = groupBy(campers, c => c.person_id)
  const appsByPerson = groupBy(applications, a => a.person_id)
  const partsByPerson = groupBy(participations, p => p.person_id)

  const scopedEventId = filter.eventId && filter.eventId !== 'all' ? filter.eventId : null

  const entries = people.map<DirectoryEntry>(person => {
    const personApplications = appsByPerson.get(person.id) ?? []
    const personParticipations = partsByPerson.get(person.id) ?? []
    const personCampers = campersByPerson.get(person.id) ?? []
    const account =
      accountByPerson.get(person.id) ?? accountByEmail.get(person.email.toLowerCase()) ?? null

    const openApplication = personApplications.find(a => OPEN_APPLICATION_STATUSES.includes(a.status)) ?? null
    const status = derivePersonStatus(person.status, {
      applications: personApplications,
      participations: personParticipations,
      openApplication,
      latestApplication: personApplications[0] ?? null,
      accountRole: account?.role ?? null,
      accountDeniedAt: account?.denied_at ?? null,
    })

    return {
      person,
      account,
      applications: personApplications,
      participations: personParticipations,
      campers: personCampers,
      application: scopedEventId
        ? personApplications.find(a => a.event_id === scopedEventId) ?? null
        : personApplications[0] ?? null,
      participation: scopedEventId
        ? personParticipations.find(p => p.event_id === scopedEventId) ?? null
        : personParticipations[0] ?? null,
      camper: scopedEventId
        ? personCampers.find(c => c.event_id === scopedEventId) ?? null
        : personCampers[0] ?? null,
      awaitingDecision: openApplication !== null || account?.role === 'pending',
      status,
      access: account?.role ?? 'none',
    }
  })

  return applyFilter(entries, filter)
}

function applyFilter(entries: DirectoryEntry[], filter: DirectoryFilter): DirectoryEntry[] {
  let result = entries

  const term = filter.search?.trim().toLowerCase()
  if (term) {
    result = result.filter(e =>
      [e.person.full_name, e.person.preferred_name, e.person.playa_name, e.person.email, e.person.phone]
        .some(field => field?.toLowerCase().includes(term))
    )
  }
  if (filter.status && filter.status !== 'all') {
    result = result.filter(e => e.status === filter.status)
  }
  if (filter.access && filter.access !== 'all') {
    result = result.filter(e => e.access === filter.access)
  }
  if (filter.eventId && filter.eventId !== 'all') {
    result = result.filter(e => e.application || e.participation || e.camper)
  }
  return filter.limit ? result.slice(0, filter.limit) : result
}

export function directoryCounts(entries: DirectoryEntry[]): DirectoryCounts {
  return {
    total: entries.length,
    awaitingDecision: entries.filter(e => e.awaitingDecision).length,
    noLogin: entries.filter(e => e.access === 'none').length,
    pendingAccess: entries.filter(e => e.access === 'pending').length,
    onRoster: entries.filter(e => e.participation || e.camper).length,
  }
}

export async function fetchDirectoryEntry(
  personId: string,
  eventId?: string,
  client?: DeliSupabase
): Promise<DirectoryEntry | null> {
  const entries = await fetchDirectory({ eventId: eventId ?? 'all' }, client)
  return entries.find(e => e.person.id === personId) ?? null
}

/**
 * Whether approving this person still has work to do. Used to label the button
 * and to keep already-complete rows out of the review queue.
 */
export function needsPromotion(entry: DirectoryEntry, event: EventRow | null): boolean {
  if (entry.access === 'none' || entry.access === 'pending') return true
  if (!event) return false
  return !entry.participations.some(p => p.event_id === event.id)
}

function keyBy<T>(rows: T[], key: (row: T) => string | null): Map<string, T> {
  const map = new Map<string, T>()
  for (const row of rows) {
    const k = key(row)
    if (k && !map.has(k)) map.set(k, row)
  }
  return map
}

function groupBy<T>(rows: T[], key: (row: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    if (!k) continue
    const bucket = map.get(k)
    if (bucket) bucket.push(row)
    else map.set(k, [row])
  }
  return map
}
