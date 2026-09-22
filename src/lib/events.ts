import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type {
  Database,
  EventApplicationField,
  EventRow,
  EventStage,
  EventKind,
  EventFeatureKey,
  EventFeatures,
} from '@/types/database'

/**
 * The event lifecycle engine.
 *
 * NYC Deli Rats is the permanent organization; an *event* is a bounded thing it
 * runs (Burning Man, a regional burn, a fundraiser, a build day). Every event
 * walks the same nine-stage lifecycle, but each one decides for itself which
 * operational modules it needs — a bar night does not need an electrical load
 * calculator.
 *
 * Stage 1 ("Information") is the organization's resting state, not a row in
 * `events`: it's what the app shows when nothing is in an active stage.
 */

export type DeliSupabase = SupabaseClient<Database>

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export const EVENT_STAGES: EventStage[] = [
  'development',
  'application',
  'prep',
  'finalization',
  'build',
  'live',
  'post_event',
  'closed',
]

export interface StageMeta {
  stage: EventStage
  /** Position in the lifecycle as presented to admins (stage 1 is Information). */
  step: number
  label: string
  icon: string
  /** What this stage means for the people in it. */
  description: string
  /** What admins are expected to be doing. */
  adminFocus: string
  /** Event may appear in public listings / the calendar. */
  publiclyListable: boolean
  /** New applications may be accepted. */
  acceptsApplications: boolean
  /** Participants may use the full operational tooling. */
  opsActive: boolean
  /** Event data is frozen; history only. */
  readOnly: boolean
  className: string
}

export const STAGE_META: Record<EventStage, StageMeta> = {
  development: {
    stage: 'development',
    step: 2,
    label: 'Event Development',
    icon: '🧱',
    description: 'Announced or in the works. Dates and basics may be visible; applications are not open yet.',
    adminFocus: 'Build out the event: dates, description, required modules, application form, logistics scaffolding.',
    publiclyListable: true,
    acceptsApplications: false,
    opsActive: false,
    readOnly: false,
    className: 'bg-gray-200 text-black border-black',
  },
  application: {
    stage: 'application',
    step: 3,
    label: 'Applications Open',
    icon: '📨',
    description: 'Anyone can apply. Returning members get their information preloaded.',
    adminFocus: 'Review applications against each person’s NYC Deli history; approve, waitlist or deny.',
    publiclyListable: true,
    acceptsApplications: true,
    opsActive: false,
    readOnly: false,
    className: 'bg-blue-200 text-black border-black',
  },
  prep: {
    stage: 'prep',
    step: 4,
    label: 'Event Prep',
    icon: '🛠️',
    description: 'Approved participants join the operational planning. Applications may still be open.',
    adminFocus: 'Fill the operational systems: transport, housing, teams, work assignments, meals, supplies.',
    publiclyListable: true,
    acceptsApplications: true,
    opsActive: true,
    readOnly: false,
    className: 'bg-yellow-200 text-black border-black',
  },
  finalization: {
    stage: 'finalization',
    step: 5,
    label: 'Finalization',
    icon: '📋',
    description: 'Applications are closed and the participant list is final. Last preparation period.',
    adminFocus: 'Close every gap: logistics, responsibilities, schedules, requirements, final details.',
    publiclyListable: true,
    acceptsApplications: false,
    opsActive: true,
    readOnly: false,
    className: 'bg-orange-200 text-black border-black',
  },
  build: {
    stage: 'build',
    step: 6,
    label: 'Event Build',
    icon: '🔨',
    description: 'The team is onsite building. The app prioritizes build-time operational information.',
    adminFocus: 'Run the build: schedule, inventory, infrastructure, crew assignments.',
    publiclyListable: true,
    acceptsApplications: false,
    opsActive: true,
    readOnly: false,
    className: 'bg-amber-300 text-black border-black',
  },
  live: {
    stage: 'live',
    step: 7,
    label: 'Event Live',
    icon: '🔥',
    description: 'The event is happening. The app strips down to critical information only.',
    adminFocus: 'Keep the essentials current. Assume unreliable connectivity — print/cache what matters.',
    publiclyListable: true,
    acceptsApplications: false,
    opsActive: true,
    readOnly: false,
    className: 'bg-red-300 text-black border-black',
  },
  post_event: {
    stage: 'post_event',
    step: 8,
    label: 'Post-Event',
    icon: '📝',
    description: 'Over but still active: feedback, surveys, information updates, wrap-up.',
    adminFocus: 'Capture notes and lessons learned, finish post-event tasks, review participation.',
    publiclyListable: true,
    acceptsApplications: false,
    opsActive: true,
    readOnly: false,
    className: 'bg-purple-200 text-black border-black',
  },
  closed: {
    stage: 'closed',
    step: 9,
    label: 'Closed / Archived',
    icon: '📦',
    description: 'Historical and read-only. Participation is preserved on every person’s permanent profile.',
    adminFocus: 'Nothing — reopen the event only to correct the record.',
    publiclyListable: true,
    acceptsApplications: false,
    opsActive: false,
    readOnly: true,
    className: 'bg-gray-800 text-yellow-400 border-black',
  },
}

/** Stage 1 of the lifecycle, which belongs to the organization rather than any event. */
export const INFORMATION_STAGE = {
  step: 1,
  label: 'Information',
  icon: '🥪',
  description:
    'No applications are open. The app is the NYC Deli Rats site and member portal: account, calendar, history, camp info.',
} as const

export function stageMeta(stage: EventStage): StageMeta {
  return STAGE_META[stage] ?? STAGE_META.development
}

export function nextStage(stage: EventStage): EventStage | null {
  const i = EVENT_STAGES.indexOf(stage)
  return i >= 0 && i < EVENT_STAGES.length - 1 ? EVENT_STAGES[i + 1] : null
}

export function previousStage(stage: EventStage): EventStage | null {
  const i = EVENT_STAGES.indexOf(stage)
  return i > 0 ? EVENT_STAGES[i - 1] : null
}

/** A closed event is history; it must be explicitly reopened before editing. */
export function isEventEditable(event: Pick<EventRow, 'stage'>): boolean {
  return !stageMeta(event.stage).readOnly
}

export function isAcceptingApplications(
  event: Pick<EventRow, 'stage' | 'applications_open' | 'applications_close_at'>
): boolean {
  if (!stageMeta(event.stage).acceptsApplications) return false
  if (!event.applications_open) return false
  if (event.applications_close_at && new Date(event.applications_close_at) < new Date()) return false
  return true
}

// ---------------------------------------------------------------------------
// Features — what a given event actually needs
// ---------------------------------------------------------------------------

export interface FeatureMeta {
  key: EventFeatureKey
  label: string
  description: string
}

export const EVENT_FEATURE_META: FeatureMeta[] = [
  { key: 'applications', label: 'Applications', description: 'Accept applications through the site.' },
  { key: 'roster', label: 'Participant Roster', description: 'Track who is coming and their status.' },
  { key: 'directory', label: 'Participant Directory', description: 'Let participants see each other.' },
  { key: 'layout', label: 'Camp Layout / Map', description: 'Placeable 2D/3D site plan.' },
  { key: 'build_week', label: 'Build Schedule', description: 'Day-by-day build planning and crews.' },
  { key: 'inventory', label: 'Inventory', description: 'Gear, materials and verification checklists.' },
  { key: 'electrical', label: 'Electrical Load', description: 'Generator, distro boxes and load calculation.' },
  { key: 'kitchen', label: 'Kitchen / Meals', description: 'Roles, coverage and meal service.' },
  { key: 'shift_draft', label: 'Shift Draft', description: 'Ranked shift selection and auto-draft.' },
  { key: 'packing', label: 'Packing Lists', description: 'Personal packing checklists.' },
  { key: 'tents', label: 'Housing / Tents', description: 'Shelter details, sharing and placement.' },
  { key: 'transport', label: 'Transport', description: 'Arrival, departure and vehicles.' },
  { key: 'meals', label: 'Meal Planning', description: 'Menus, provisioning and dietary needs.' },
  { key: 'meetings', label: 'Meetings & Agendas', description: 'Planning meeting notes and agendas.' },
  { key: 'photos', label: 'Photos', description: 'Event photo collection.' },
]

/** Sensible starting module set per event kind. Admins can change any of it. */
export const FEATURE_PRESETS: Record<EventKind, EventFeatures> = {
  burning_man: {
    applications: true, roster: true, directory: true, layout: true, build_week: true,
    inventory: true, electrical: true, kitchen: true, shift_draft: true, packing: true,
    tents: true, transport: true, meals: true, meetings: true, photos: true,
  },
  regional_burn: {
    applications: true, roster: true, directory: true, layout: true, build_week: true,
    inventory: true, kitchen: true, packing: true, tents: true, transport: true,
    meals: true, meetings: true, photos: true,
  },
  camp_social: { roster: true, directory: true, photos: true },
  fundraiser: { roster: true, directory: true, meetings: true, photos: true },
  build_day: { roster: true, build_week: true, inventory: true, meetings: true },
  meeting: { roster: true, meetings: true },
  retreat: {
    applications: true, roster: true, directory: true, packing: true,
    transport: true, meals: true, photos: true,
  },
  other: { roster: true },
}

export function hasFeature(
  event: Pick<EventRow, 'features'> | null | undefined,
  key: EventFeatureKey
): boolean {
  return Boolean(event?.features?.[key])
}

export function enabledFeatures(event: Pick<EventRow, 'features'>): FeatureMeta[] {
  return EVENT_FEATURE_META.filter(f => event.features?.[f.key])
}

// ---------------------------------------------------------------------------
// Application forms
// ---------------------------------------------------------------------------

/**
 * Fallback questions for an event that hasn't defined its own form. Kept
 * deliberately small — a build day shouldn't ask Burning Man questions. Events
 * override this wholesale via `events.application_schema`.
 */
export const DEFAULT_APPLICATION_FIELDS: EventApplicationField[] = [
  { key: 'why', label: 'Why do you want to join this event?', type: 'textarea', required: true },
  { key: 'experience', label: 'Relevant experience or skills you bring', type: 'textarea' },
  { key: 'referral', label: 'How do you know NYC Deli Rats?', type: 'text' },
  { key: 'availability', label: 'Availability / constraints', type: 'text' },
]

export function applicationFields(event: Pick<EventRow, 'application_schema'>): EventApplicationField[] {
  const schema = event.application_schema
  return Array.isArray(schema) && schema.length > 0 ? schema : DEFAULT_APPLICATION_FIELDS
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  burning_man: 'Burning Man',
  regional_burn: 'Regional Burn',
  camp_social: 'Camp Social',
  fundraiser: 'Fundraiser',
  build_day: 'Build Day',
  meeting: 'Meeting',
  retreat: 'Retreat',
  other: 'Other',
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function formatDay(iso: string, opts: Intl.DateTimeFormatOptions): string {
  // Bare dates are calendar dates — read them as UTC so they don't shift a day.
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' })
}

export function eventDateLabel(event: Pick<EventRow, 'start_date' | 'end_date'>): string {
  const { start_date: start, end_date: end } = event
  if (!start && !end) return 'Dates TBD'
  if (start && !end) return formatDay(start, { month: 'short', day: 'numeric', year: 'numeric' })
  if (!start && end) return `Through ${formatDay(end!, { month: 'short', day: 'numeric', year: 'numeric' })}`
  const sameYear = start!.slice(0, 4) === end!.slice(0, 4)
  const sameMonth = sameYear && start!.slice(0, 7) === end!.slice(0, 7)
  const left = formatDay(start!, sameMonth ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' })
  const right = formatDay(end!, { month: sameMonth ? undefined : 'short', day: 'numeric', year: 'numeric' })
  return `${left} – ${right}`
}

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

/**
 * Every fetcher takes an optional client so the same function works in a
 * client component (browser client, default) and in a server component or
 * server action (cookie-bound server client).
 */
function db(client?: DeliSupabase): DeliSupabase {
  return client ?? (createClient() as DeliSupabase)
}

export async function fetchEvents(client?: DeliSupabase): Promise<EventRow[]> {
  const { data } = await db(client)
    .from('events')
    .select('*')
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  return (data as EventRow[] | null) ?? []
}

export async function fetchPublicEvents(client?: DeliSupabase): Promise<EventRow[]> {
  const { data } = await db(client)
    .from('events')
    .select('*')
    .eq('is_public', true)
    .order('start_date', { ascending: false, nullsFirst: false })
  return (data as EventRow[] | null) ?? []
}

export async function fetchEventBySlug(slug: string, client?: DeliSupabase): Promise<EventRow | null> {
  const { data } = await db(client).from('events').select('*').eq('slug', slug).maybeSingle()
  return (data as EventRow | null) ?? null
}

export async function fetchEventById(id: string, client?: DeliSupabase): Promise<EventRow | null> {
  const { data } = await db(client).from('events').select('*').eq('id', id).maybeSingle()
  return (data as EventRow | null) ?? null
}

/**
 * The event the app should foreground. Prefers the explicitly flagged flagship
 * event, otherwise the soonest non-closed event. Null means the organization is
 * in the Information stage.
 */
export async function fetchCurrentEvent(client?: DeliSupabase): Promise<EventRow | null> {
  const supabase = db(client)

  const { data: flagship } = await supabase
    .from('events')
    .select('*')
    .eq('is_flagship', true)
    .maybeSingle()
  if (flagship) return flagship as EventRow

  const { data } = await supabase
    .from('events')
    .select('*')
    .neq('stage', 'closed')
    .order('start_date', { ascending: true, nullsFirst: false })
    .limit(1)
  return ((data as EventRow[] | null) ?? [])[0] ?? null
}

/** Events a member can currently apply to. */
export async function fetchOpenEvents(client?: DeliSupabase): Promise<EventRow[]> {
  const { data } = await db(client)
    .from('events')
    .select('*')
    .eq('applications_open', true)
    .in('stage', ['application', 'prep'])
    .order('start_date', { ascending: true, nullsFirst: false })
  return ((data as EventRow[] | null) ?? []).filter(isAcceptingApplications)
}

export interface EventCounts {
  applications: number
  pendingApplications: number
  participants: number
}

export async function fetchEventCounts(eventId: string, client?: DeliSupabase): Promise<EventCounts> {
  const supabase = db(client)
  const [all, pending, participants] = await Promise.all([
    supabase.from('event_applications').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase
      .from('event_applications')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .in('status', ['submitted', 'under_review', 'waitlisted']),
    supabase.from('event_participants').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
  ])
  return {
    applications: all.count ?? 0,
    pendingApplications: pending.count ?? 0,
    participants: participants.count ?? 0,
  }
}
