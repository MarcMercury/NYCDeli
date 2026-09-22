import { createClient } from '@/lib/supabase/client'
import type { DeliSupabase } from '@/lib/events'
import type { CampEventRow, EventCategory, EventRow } from '@/types/database'

/**
 * The NYC Deli Rats camp calendar.
 *
 * The calendar belongs to the organization, not to any single event. Items may
 * optionally be tied to an event (`event_id`), which is how build dates or an
 * application deadline show up alongside camp meetings and socials.
 */

function db(client?: DeliSupabase): DeliSupabase {
  return client ?? (createClient() as DeliSupabase)
}

export const CALENDAR_CATEGORIES: { value: EventCategory; label: string; icon: string; className: string }[] = [
  { value: 'general', label: 'General', icon: '📌', className: 'bg-gray-200 text-black' },
  { value: 'meeting', label: 'Camp Meeting', icon: '🗣️', className: 'bg-blue-200 text-black' },
  { value: 'social', label: 'Social', icon: '🍻', className: 'bg-pink-200 text-black' },
  { value: 'event', label: 'Event', icon: '🔥', className: 'bg-red-200 text-black' },
  { value: 'application', label: 'Applications', icon: '📨', className: 'bg-indigo-200 text-black' },
  { value: 'deadline', label: 'Deadline', icon: '⏰', className: 'bg-orange-300 text-black' },
  { value: 'build', label: 'Build', icon: '🔨', className: 'bg-amber-300 text-black' },
  { value: 'planning', label: 'Planning', icon: '🗂️', className: 'bg-teal-200 text-black' },
  { value: 'fundraiser', label: 'Fundraiser', icon: '💸', className: 'bg-green-200 text-black' },
  { value: 'shopping', label: 'Shopping', icon: '🛒', className: 'bg-lime-200 text-black' },
  { value: 'other', label: 'Other', icon: '•', className: 'bg-gray-200 text-black' },
]

export function categoryMeta(category: EventCategory) {
  return CALENDAR_CATEGORIES.find(c => c.value === category) ?? CALENDAR_CATEGORIES[0]
}

/** A calendar row, or a date derived from an event (not stored twice). */
export interface CalendarItem {
  id: string
  title: string
  description: string | null
  date: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  location: string | null
  category: EventCategory
  eventId: string | null
  eventSlug: string | null
  isPublic: boolean
  linkUrl: string | null
  /** Derived items come from the events table and are not editable here. */
  derived: boolean
}

function fromRow(row: CampEventRow): CalendarItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.event_date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location,
    category: row.category,
    eventId: row.event_id,
    eventSlug: null,
    isPublic: row.is_public,
    linkUrl: row.link_url,
    derived: false,
  }
}

export interface CalendarQuery {
  from?: string
  to?: string
  eventId?: string
  /** Only items visible to the public site. */
  publicOnly?: boolean
}

export async function fetchCalendarRows(query: CalendarQuery = {}, client?: DeliSupabase): Promise<CampEventRow[]> {
  let q = db(client).from('camp_events').select('*').order('event_date', { ascending: true })
  if (query.from) q = q.gte('event_date', query.from)
  if (query.to) q = q.lte('event_date', query.to)
  if (query.eventId) q = q.eq('event_id', query.eventId)
  if (query.publicOnly) q = q.eq('is_public', true)
  const { data } = await q
  return (data as CampEventRow[] | null) ?? []
}

/**
 * Event dates surfaced as calendar entries so an event never has to be typed
 * into the calendar by hand.
 */
export function eventsAsCalendarItems(events: EventRow[]): CalendarItem[] {
  const items: CalendarItem[] = []

  for (const event of events) {
    if (event.start_date) {
      items.push({
        id: `event:${event.id}`,
        title: event.name,
        description: event.tagline,
        date: event.start_date,
        endDate: event.end_date,
        startTime: null,
        endTime: null,
        location: event.location_name,
        category: 'event',
        eventId: event.id,
        eventSlug: event.slug,
        isPublic: event.is_public,
        linkUrl: `/events/${event.slug}`,
        derived: true,
      })
    }
    if (event.build_start_date) {
      items.push({
        id: `build:${event.id}`,
        title: `${event.name} — build starts`,
        description: null,
        date: event.build_start_date,
        endDate: event.start_date,
        startTime: null,
        endTime: null,
        location: event.location_name,
        category: 'build',
        eventId: event.id,
        eventSlug: event.slug,
        isPublic: event.is_public,
        linkUrl: `/events/${event.slug}`,
        derived: true,
      })
    }
    if (event.applications_close_at) {
      items.push({
        id: `apps-close:${event.id}`,
        title: `${event.name} — applications close`,
        description: null,
        date: event.applications_close_at.slice(0, 10),
        endDate: null,
        startTime: null,
        endTime: null,
        location: null,
        category: 'deadline',
        eventId: event.id,
        eventSlug: event.slug,
        isPublic: event.is_public,
        linkUrl: `/events/${event.slug}`,
        derived: true,
      })
    }
  }

  return items
}

/** Stored calendar rows + derived event dates, sorted chronologically. */
export async function fetchCalendar(
  query: CalendarQuery = {},
  client?: DeliSupabase
): Promise<CalendarItem[]> {
  const supabase = db(client)
  const [rows, eventsRes] = await Promise.all([
    fetchCalendarRows(query, supabase),
    supabase.from('events').select('*'),
  ])

  const events = ((eventsRes.data as EventRow[] | null) ?? []).filter(
    e => (!query.publicOnly || e.is_public) && (!query.eventId || e.id === query.eventId)
  )

  const derived = eventsAsCalendarItems(events).filter(item => {
    if (query.from && item.date < query.from) return false
    if (query.to && item.date > query.to) return false
    return true
  })

  return [...rows.map(fromRow), ...derived].sort((a, b) =>
    a.date === b.date ? a.title.localeCompare(b.title) : a.date.localeCompare(b.date)
  )
}

export function upcomingItems(items: CalendarItem[], from = new Date()): CalendarItem[] {
  const today = from.toISOString().slice(0, 10)
  return items.filter(i => (i.endDate ?? i.date) >= today)
}

export function pastItems(items: CalendarItem[], from = new Date()): CalendarItem[] {
  const today = from.toISOString().slice(0, 10)
  return items.filter(i => (i.endDate ?? i.date) < today).reverse()
}

/** Group into `YYYY-MM` buckets for month headings. */
export function groupByMonth(items: CalendarItem[]): { key: string; label: string; items: CalendarItem[] }[] {
  const groups = new Map<string, CalendarItem[]>()
  for (const item of items) {
    const key = item.date.slice(0, 7)
    const bucket = groups.get(key)
    if (bucket) bucket.push(item)
    else groups.set(key, [item])
  }
  return [...groups.entries()].map(([key, groupItems]) => ({
    key,
    label: new Date(`${key}-01T12:00:00Z`).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
    items: groupItems,
  }))
}

export function formatCalendarDate(item: Pick<CalendarItem, 'date' | 'endDate'>): string {
  const day = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
  if (item.endDate && item.endDate !== item.date) return `${day(item.date)} – ${day(item.endDate)}`
  return day(item.date)
}

export function formatCalendarTime(item: Pick<CalendarItem, 'startTime' | 'endTime'>): string | null {
  if (!item.startTime) return null
  const trim = (t: string) => t.slice(0, 5)
  return item.endTime ? `${trim(item.startTime)}–${trim(item.endTime)}` : trim(item.startTime)
}

// ---------------------------------------------------------------------------
// Month grid
// ---------------------------------------------------------------------------

/** Calendar dates are bare `YYYY-MM-DD`; noon UTC keeps them from shifting a day. */
function asDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`)
}

export function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function addDays(iso: string, days: number): string {
  return new Date(asDate(iso).getTime() + days * 86_400_000).toISOString().slice(0, 10)
}

/** `YYYY-MM` shifted by whole months. */
export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1))
  return shifted.toISOString().slice(0, 7)
}

export function monthLabel(monthKey: string): string {
  return asDate(`${monthKey}-01`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Six Sunday-start weeks of ISO dates covering the month — a fixed grid never reflows. */
export function monthGrid(monthKey: string): string[][] {
  const first = `${monthKey}-01`
  const start = addDays(first, -asDate(first).getUTCDay())
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day))
  )
}

/** Items touching a given day, including every day of a multi-day range. */
export function itemsForDay(items: CalendarItem[], iso: string): CalendarItem[] {
  return items.filter(item => iso >= item.date && iso <= (item.endDate ?? item.date))
}

export function isMultiDay(item: CalendarItem): boolean {
  return Boolean(item.endDate && item.endDate !== item.date)
}

