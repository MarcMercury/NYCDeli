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

/**
 * Resolution order: the flagship event, then the soonest event that is still
 * running, then the most recent event of all. The final fallback matters —
 * after Burning Man 2026 is archived the camp map and kitchen schedule should
 * still render its history rather than going blank.
 */
export async function fetchOpsEvent(client?: DeliSupabase): Promise<EventRow | null> {
  const supabase = db(client)

  const { data: flagship } = await supabase.from('events').select('*').eq('is_flagship', true).maybeSingle()
  if (flagship) return flagship as EventRow

  const { data: live } = await supabase
    .from('events')
    .select('*')
    .neq('stage', 'closed')
    .order('start_date', { ascending: true, nullsFirst: false })
    .limit(1)
  const soonest = ((live as EventRow[] | null) ?? [])[0]
  if (soonest) return soonest

  const { data: latest } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: false, nullsFirst: false })
    .limit(1)
  return ((latest as EventRow[] | null) ?? [])[0] ?? null
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
  return !event || stageMeta(event.stage).readOnly
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
