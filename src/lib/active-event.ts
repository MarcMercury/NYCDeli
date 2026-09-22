import type { DeliSupabase } from '@/lib/events'
import { isAcceptingApplications, stageMeta } from '@/lib/events'
import { createClient } from '@/lib/supabase/client'
import type { EventRow } from '@/types/database'

/**
 * Which event the operational tooling is looking at.
 *
 * Roster, kitchen, layout and build-week data is event-scoped in the database
 * (migration 083), but those screens have no event picker yet — they read and
 * write "the current event". This module is the single place that decides what
 * that means, so the answer can later become a user-selectable context without
 * touching every query.
 */

function db(client?: DeliSupabase): DeliSupabase {
  return client ?? (createClient() as DeliSupabase)
}

/** An event only owns the operational tooling once its stage switches ops on. */
export function isOpsActive(event: Pick<EventRow, 'stage'> | null): boolean {
  return !!event && stageMeta(event.stage).opsActive
}

/**
 * Resolution order: the flagship event, then the soonest event, both only if
 * their stage has operations switched on — an announced-but-not-open event
 * (Event Development) must not take over the map, kitchen and roster. Failing
 * that, the most recently started event, so after an event is archived its
 * history still renders rather than going blank.
 */
export function chooseOpsEvent(events: EventRow[]): EventRow | null {
  const running = events
    .filter(isOpsActive)
    .sort((a, b) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999'))

  const started = events
    .filter(e => e.start_date && e.start_date <= new Date().toISOString().slice(0, 10))
    .sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))

  return (
    running.find(e => e.is_flagship) ??
    running[0] ??
    started[0] ??
    events.find(e => e.is_flagship) ??
    null
  )
}

export async function fetchOpsEvent(client?: DeliSupabase): Promise<EventRow | null> {
  const { data } = await db(client).from('events').select('*')
  return chooseOpsEvent((data as EventRow[] | null) ?? [])
}

/** The event a brand-new application should attach to, if any. */
export async function fetchApplicationTargetEvent(client?: DeliSupabase): Promise<EventRow | null> {
  const { data } = await db(client)
    .from('events')
    .select('*')
    .eq('applications_open', true)
    .order('is_flagship', { ascending: false })
    .order('start_date', { ascending: true, nullsFirst: false })
  return ((data as EventRow[] | null) ?? []).find(isAcceptingApplications) ?? null
}

/** True when nothing is actively running — the org sits in the Information stage. */
export function isInformationStage(event: EventRow | null): boolean {
  return !isOpsActive(event)
}

/** A moment the home page counts down to. */
export interface CountdownTarget {
  id: string
  /** What is being counted down to, e.g. "The Man Burns" or "Love Burn 2027". */
  label: string
  date: Date
  event: EventRow
}

/**
 * The upcoming moments worth a countdown, soonest first.
 *
 * An event is normally counted down to by its start date, except that a
 * Burning Man event counts down to the Man burn when `config.key_dates.man_burn`
 * says when that is — which is what burningman.org itself does.
 */
export async function fetchCountdownTargets(
  limit = 2,
  client?: DeliSupabase
): Promise<CountdownTarget[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await db(client)
    .from('events')
    .select('*')
    .neq('stage', 'closed')
    .gte('start_date', today)
    .order('start_date', { ascending: true })

  const targets: CountdownTarget[] = []

  for (const event of (data as EventRow[] | null) ?? []) {
    const burn = event.kind === 'burning_man' ? configDate(event, 'man_burn') : null
    const day = burn && burn >= today ? burn : event.start_date
    if (!day) continue

    const date = zonedMidnight(day, event.timezone)
    if (!date) continue

    targets.push({
      id: event.id,
      label: burn && burn >= today ? 'The Man Burns' : event.name,
      date,
      event,
    })
  }

  return targets.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, limit)
}

function configDate(event: EventRow, key: string): string | null {
  const keyDates = (event.config as { key_dates?: Record<string, unknown> } | null)?.key_dates
  const value = keyDates?.[key]
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

/** Midnight on a bare date, read in the event's timezone rather than the viewer's. */
function zonedMidnight(day: string, timezone: string): Date | null {
  const asUtc = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(asUtc.getTime())) return null

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(asUtc)

  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? NaN)
  const wallClock = Date.UTC(
    get('year'), get('month') - 1, get('day'),
    get('hour') % 24, get('minute'), get('second')
  )
  if (Number.isNaN(wallClock)) return null

  const offset = wallClock - asUtc.getTime()
  return new Date(asUtc.getTime() - offset)
}

// ---------------------------------------------------------------------------
// Browser-side scoping
// ---------------------------------------------------------------------------

let opsEventPromise: Promise<EventRow | null> | null = null

/** Cached for the life of the page — ~20 components ask for this on every load. */
export function getOpsEvent(): Promise<EventRow | null> {
  if (typeof window === 'undefined') return fetchOpsEvent()
  opsEventPromise ??= fetchOpsEvent()
  return opsEventPromise
}

export function clearOpsEventCache() {
  opsEventPromise = null
}

export async function getOpsEventId(): Promise<string | null> {
  return (await getOpsEvent())?.id ?? null
}

type ScopableQuery<Q> = { or(filter: string): Q }

/**
 * Restrict a query to the current event.
 *
 * Rows with a NULL `event_id` stay visible on purpose: if some write path is
 * ever missed, its rows show up everywhere (obvious, fixable) instead of
 * silently vanishing from the only screen that lists them.
 */
export function scopeToEvent<Q extends ScopableQuery<Q>>(query: Q, eventId: string | null): Q {
  return eventId ? query.or(`event_id.eq.${eventId},event_id.is.null`) : query
}

/** `scopeToEvent` using the cached browser-side event. */
export async function withOpsScope<Q extends ScopableQuery<Q>>(query: Q): Promise<Q> {
  return scopeToEvent(query, await getOpsEventId())
}
