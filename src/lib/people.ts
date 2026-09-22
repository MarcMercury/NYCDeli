import { createClient } from '@/lib/supabase/client'
import type { DeliSupabase } from '@/lib/events'
import type {
  ApplicationStatus,
  EventApplicationRow,
  EventParticipantRow,
  EventRow,
  PersonHistory,
  PersonNoteRow,
  PersonRow,
  PersonStatus,
  UserRole,
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

// Listing people is the directory's job — see src/lib/directory.ts, which joins
// accounts and camper records on top of this pipeline.

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

export type { JoinedApplication, JoinedParticipation }

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
// Application pipeline
// ---------------------------------------------------------------------------

/** Statuses that mean "this application is still waiting on a decision". */
export const OPEN_APPLICATION_STATUSES: ApplicationStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'waitlisted',
]

export const APPLICATION_STATUS_META: Record<ApplicationStatus, { label: string; variant: 'success' | 'error' | 'warning' | 'info' }> = {
  draft: { label: 'Draft', variant: 'info' },
  submitted: { label: 'Submitted', variant: 'warning' },
  under_review: { label: 'Under Review', variant: 'warning' },
  waitlisted: { label: 'Waitlisted', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  denied: { label: 'Denied', variant: 'error' },
  withdrawn: { label: 'Withdrawn', variant: 'info' },
}

/** What the application/account system currently says about one person. */
export interface PersonPipeline {
  applications: JoinedApplication[]
  participations: JoinedParticipation[]
  /** The most recent application still awaiting a decision, if any. */
  openApplication: JoinedApplication | null
  /** The most recent application of any status. */
  latestApplication: JoinedApplication | null
  /** Role on the legacy account-approval gate, when they have a login. */
  accountRole: UserRole | null
  accountDeniedAt: string | null
  /** Status read out of the pipeline rather than the stored `status` column. */
  derivedStatus: PersonStatus
}

/**
 * Reconcile the two review queues into one status.
 *
 * An open application outranks everything: someone who applied again is an
 * applicant even if they were denied or attended in a previous year. A `pending`
 * account is treated as an application in flight, because that is exactly what
 * it is on the legacy `/admin/applicants` screen.
 */
export function derivePersonStatus(
  stored: PersonStatus,
  pipeline: Omit<PersonPipeline, 'derivedStatus'>
): PersonStatus {
  if (stored === 'blocked') return 'blocked'
  if (pipeline.openApplication) return 'applicant'
  if (pipeline.accountDeniedAt || pipeline.latestApplication?.status === 'denied') return 'inactive'
  if (pipeline.accountRole === 'pending') return 'applicant'
  return stored
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
