import type { CalendarItem } from '@/lib/calendar'
import type { EventRow } from '@/types/database'

/**
 * The payload behind /now — everything a camper needs while onsite, small
 * enough to cache and render without a network.
 */
export interface NowShift {
  id: string
  title: string
  date: string
  startTime: string | null
  endTime: string | null
  location: string | null
  status: string
}

export interface NowContact {
  name: string
  role: string
  phone: string | null
}

export interface NowSnapshot {
  capturedAt: string
  event: Pick<EventRow, 'id' | 'name' | 'slug' | 'stage' | 'start_date' | 'end_date' | 'location_name' | 'location_address'> | null
  person: { name: string; playaName: string | null } | null
  camp: {
    address: string | null
    tent: string | null
    zone: string | null
  }
  shifts: NowShift[]
  today: CalendarItem[]
  contacts: NowContact[]
  emergency: { name: string | null; number: string | null; relationship: string | null }
  notes: string[]
}

const STORAGE_KEY = 'nycdeli.now.snapshot.v1'

/**
 * Onsite connectivity is unreliable, so the last good payload is kept in
 * localStorage and rendered immediately on load — the network refresh is an
 * upgrade, not a prerequisite.
 */
export function readCachedSnapshot(): NowSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as NowSnapshot) : null
  } catch {
    return null
  }
}

export function writeCachedSnapshot(snapshot: NowSnapshot) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Storage full or blocked — the live payload still renders.
  }
}

export function snapshotAge(snapshot: NowSnapshot): string {
  const minutes = Math.floor((Date.now() - new Date(snapshot.capturedAt).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.floor(hours / 24)} days ago`
}

export function formatShiftWindow(shift: NowShift): string {
  const day = new Date(`${shift.date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  if (!shift.startTime) return day
  const trim = (t: string) => t.slice(0, 5)
  return shift.endTime ? `${day} · ${trim(shift.startTime)}–${trim(shift.endTime)}` : `${day} · ${trim(shift.startTime)}`
}

/** Shifts that haven't finished yet, soonest first. */
export function upcomingShifts(shifts: NowShift[], now = new Date()): NowShift[] {
  const today = now.toISOString().slice(0, 10)
  return shifts
    .filter(s => s.date >= today)
    .sort((a, b) => (a.date === b.date ? (a.startTime ?? '').localeCompare(b.startTime ?? '') : a.date.localeCompare(b.date)))
}
