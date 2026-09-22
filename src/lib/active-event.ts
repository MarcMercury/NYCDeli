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

/** The event the app should count down to, or null when nothing is upcoming. */
export async function fetchCountdownTarget(
  client?: DeliSupabase
): Promise<{ date: Date; event: EventRow } | null> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await db(client)
    .from('events')
    .select('*')
    .neq('stage', 'closed')
    .gte('start_date', today)
    .order('start_date', { ascending: true })
    .limit(1)

  const event = ((data as EventRow[] | null) ?? [])[0]
  if (!event?.start_date) return null

  // Bare dates are local to the event, not the viewer.
  const date = new Date(`${event.start_date}T00:00:00${offsetFor(event.timezone)}`)
  return Number.isNaN(date.getTime()) ? null : { date, event }
}

/** Crude but adequate: the only timezones the camp operates in. */
function offsetFor(timezone: string): string {
  return timezone === 'America/New_York' ? '-04:00' : '-07:00'
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
