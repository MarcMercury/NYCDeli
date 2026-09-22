import { createClient } from '@/lib/supabase/client'
import type { DeliSupabase } from '@/lib/events'
import type {
  EventApplicationRow,
  EventParticipantRow,
  EventRow,
  PersonHistory,
  PersonNoteRow,
  PersonRow,
  PersonStatus,
} from '@/types/database'

/**
 * The historical CRM.
 *
 * A person exists independently of any event. Closing an event never deletes,
 * deactivates or detaches a person — it only freezes that event's rows. Every
 * application and participation stays attached to the person forever.
 */

function db(client?: DeliSupabase): DeliSupabase {
  return client ?? (createClient() as DeliSupabase)
}

export const PERSON_STATUS_META: Record<PersonStatus, { label: string; className: string }> = {
  prospect: { label: 'Prospect', className: 'bg-gray-200 text-black' },
  applicant: { label: 'Applicant', className: 'bg-blue-200 text-black' },
  member: { label: 'Member', className: 'bg-green-300 text-black' },
  alumni: { label: 'Alumni', className: 'bg-purple-200 text-black' },
  inactive: { label: 'Inactive', className: 'bg-gray-300 text-black' },
  blocked: { label: 'Blocked', className: 'bg-red-300 text-black' },
}

export function personDisplayName(person: Pick<PersonRow, 'full_name' | 'preferred_name' | 'playa_name'>): string {
  const base = person.preferred_name?.trim() || person.full_name
  return person.playa_name?.trim() ? `${base} “${person.playa_name.trim()}”` : base
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export interface PeopleFilter {
  search?: string
  status?: PersonStatus | 'all'
  limit?: number
}

export async function fetchPeople(filter: PeopleFilter = {}, client?: DeliSupabase): Promise<PersonRow[]> {
  let query = db(client).from('people').select('*').order('full_name', { ascending: true })

  if (filter.status && filter.status !== 'all') query = query.eq('status', filter.status)
  if (filter.search?.trim()) {
    const term = `%${filter.search.trim()}%`
    query = query.or(`full_name.ilike.${term},email.ilike.${term},playa_name.ilike.${term}`)
  }
  if (filter.limit) query = query.limit(filter.limit)

  const { data } = await query
  return (data as PersonRow[] | null) ?? []
}

export async function fetchPersonById(id: string, client?: DeliSupabase): Promise<PersonRow | null> {
  const { data } = await db(client).from('people').select('*').eq('id', id).maybeSingle()
  return (data as PersonRow | null) ?? null
}

export async function fetchPersonByUserId(userId: string, client?: DeliSupabase): Promise<PersonRow | null> {
  const { data } = await db(client).from('people').select('*').eq('user_id', userId).maybeSingle()
  return (data as PersonRow | null) ?? null
}

/**
 * Recognise a returning applicant. Email is the durable key across events —
 * campers change phones, names and playa names, rarely their sign-in address.
 */
export async function fetchPersonByEmail(email: string, client?: DeliSupabase): Promise<PersonRow | null> {
  const { data } = await db(client)
    .from('people')
    .select('*')
    .ilike('email', email.trim())
    .maybeSingle()
  return (data as PersonRow | null) ?? null
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

type JoinedApplication = EventApplicationRow & { event: EventRow | null }
type JoinedParticipation = EventParticipantRow & { event: EventRow | null }

export async function fetchPersonHistory(personId: string, client?: DeliSupabase): Promise<PersonHistory | null> {
  const supabase = db(client)

  const [personRes, appsRes, partsRes, notesRes] = await Promise.all([
    supabase.from('people').select('*').eq('id', personId).maybeSingle(),
    supabase
      .from('event_applications')
      .select('*, event:events(*)')
      .eq('person_id', personId)
      .order('created_at', { ascending: false }),
    supabase
      .from('event_participants')
      .select('*, event:events(*)')
      .eq('person_id', personId)
      .order('created_at', { ascending: false }),
    supabase
      .from('person_notes')
      .select('*')
      .eq('person_id', personId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const person = personRes.data as PersonRow | null
  if (!person) return null

  return {
    person,
    applications: (appsRes.data as unknown as JoinedApplication[] | null) ?? [],
    participations: (partsRes.data as unknown as JoinedParticipation[] | null) ?? [],
    notes: (notesRes.data as PersonNoteRow[] | null) ?? [],
  }
}

/** Compact participation summary for application review screens. */
export interface ParticipationSummary {
  eventsAttended: number
  eventsApplied: number
  firstEventYear: number | null
  lastEventName: string | null
  isReturning: boolean
}

export function summarizeHistory(history: Pick<PersonHistory, 'applications' | 'participations'>): ParticipationSummary {
  const attended = history.participations.filter(p => p.status === 'attended' || p.status === 'confirmed')
  const years = attended
    .map(p => p.event?.year ?? (p.event?.start_date ? Number(p.event.start_date.slice(0, 4)) : null))
    .filter((y): y is number => typeof y === 'number')

  return {
    eventsAttended: attended.length,
    eventsApplied: history.applications.length,
    firstEventYear: years.length ? Math.min(...years) : null,
    lastEventName: attended[0]?.event?.name ?? null,
    isReturning: attended.length > 0,
  }
}

// ---------------------------------------------------------------------------
// Event rosters (person-centric views of an event)
// ---------------------------------------------------------------------------

export async function fetchEventApplications(
  eventId: string,
  client?: DeliSupabase
): Promise<(EventApplicationRow & { person: PersonRow | null })[]> {
  const { data } = await db(client)
    .from('event_applications')
    .select('*, person:people(*)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  return (data as unknown as (EventApplicationRow & { person: PersonRow | null })[] | null) ?? []
}

export async function fetchEventParticipants(
  eventId: string,
  client?: DeliSupabase
): Promise<(EventParticipantRow & { person: PersonRow | null })[]> {
  const { data } = await db(client)
    .from('event_participants')
    .select('*, person:people(*)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
  return (data as unknown as (EventParticipantRow & { person: PersonRow | null })[] | null) ?? []
}
