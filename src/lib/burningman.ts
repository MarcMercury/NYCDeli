// Burning Man Public API client (server-side only).
// Docs: https://api.burningman.org/docs
//
// The API key is sent in the `X-API-Key` header and must NEVER reach the
// browser. Only import this module from server code (route handlers / server
// components / actions). The client UI talks to /api/burningman instead.

const BM_API_BASE = 'https://api.burningman.org/api'

// The event year the camp app is currently focused on. Camps/art/events for a
// given year only exist once Burning Man publishes them, so callers may fall
// back to a prior year if the current one is empty.
export const CURRENT_BM_YEAR = 2026

/** All Burning Man Public API resource types we can query. */
export type BMResourceType = 'camp' | 'art' | 'event' | 'mv'

function getBurningManApiKey(): string {
  const key = process.env.BURNINGMAN_API_KEY
  if (!key) throw new Error('BURNINGMAN_API_KEY is not configured')
  return key
}

// ─── Types ─────────────────────────────────────────────────────

export interface BMImage {
  thumbnail_url: string | null
  gallery_ref?: string | null
}

export interface BMLocation {
  frontage?: string | null
  intersection?: string | null
  intersection_type?: string | null
  dimensions?: string | null
  exact_location?: string | null
  // Art / open-playa style coordinates
  category?: string | null
  distance?: number | null
  hour?: number | null
  minute?: number | null
  gps_latitude?: number | null
  gps_longitude?: number | null
}

export interface BMCamp {
  uid: string
  name: string
  year: number
  url: string | null
  contact_email: string | null
  hometown: string | null
  description: string | null
  landmark: string | null
  accepting_campers: boolean | null
  location: BMLocation | null
  location_string: string | null
  images: BMImage[] | null
}

export interface BMArt {
  uid: string
  name: string
  year: number
  artist: string | null
  category: string | null
  program: string | null
  hometown: string | null
  description: string | null
  url: string | null
  contact_email: string | null
  donation_link: string | null
  guided_tours: boolean | null
  self_guided_tour_map: boolean | null
  needs_volunteers: boolean | null
  location: BMLocation | null
  location_string: string | null
  images: BMImage[] | null
}

export interface BMEventOccurrence {
  start_time: string
  end_time: string
}

export interface BMEvent {
  uid: string
  event_id: number
  title: string
  year: number
  description: string | null
  print_description: string | null
  event_type: { abbr: string; label: string } | null
  hosted_by_camp: string | null
  other_location: string | null
  check_location: boolean | null
  all_day: boolean | null
  contact: string | null
  slug: string | null
  occurrence_set: BMEventOccurrence[] | null
}

export interface BMMutantVehicle {
  uid: string
  name: string
  year: number
  artist: string | null
  hometown: string | null
  description: string | null
  url: string | null
  contact_email: string | null
  donation_link: string | null
  tags: string[] | null
  images: BMImage[] | null
}

export type BMRecord = BMCamp | BMArt | BMEvent | BMMutantVehicle

// ─── Core fetch ────────────────────────────────────────────────

export class BurningManApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'BurningManApiError'
  }
}

async function bmFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(`${BM_API_BASE}${path}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  }

  const res = await fetch(url, {
    headers: { 'X-API-Key': getBurningManApiKey() },
    // BMORG data only updates a few times per day; cache for an hour to stay
    // well under the API rate limit and keep the directory snappy.
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new BurningManApiError(
      `Burning Man API ${path} failed (${res.status})${body ? `: ${body.slice(0, 200)}` : ''}`,
      res.status,
    )
  }

  return res.json() as Promise<T>
}

// ─── Theme Camps ───────────────────────────────────────────────

export function fetchCamps(year = CURRENT_BM_YEAR, search?: string): Promise<BMCamp[]> {
  return bmFetch<BMCamp[]>('/camp', { year, search })
}

export function fetchCampByUid(uid: string): Promise<BMCamp> {
  return bmFetch<BMCamp>(`/camp/${encodeURIComponent(uid)}`)
}

// ─── Art Installations ─────────────────────────────────────────

export function fetchArt(
  year = CURRENT_BM_YEAR,
  opts: { category?: string; program?: string; search?: string } = {},
): Promise<BMArt[]> {
  return bmFetch<BMArt[]>('/art', { year, ...opts })
}

export function fetchArtByUid(uid: string): Promise<BMArt> {
  return bmFetch<BMArt>(`/art/${encodeURIComponent(uid)}`)
}

// ─── Events ────────────────────────────────────────────────────

export function fetchEvents(year = CURRENT_BM_YEAR): Promise<BMEvent[]> {
  return bmFetch<BMEvent[]>('/event', { year })
}

export function fetchEventByUid(uid: string): Promise<BMEvent> {
  return bmFetch<BMEvent>(`/event/${encodeURIComponent(uid)}`)
}

// ─── Mutant Vehicles (year > 2025) ─────────────────────────────

export function fetchMutantVehicles(year = CURRENT_BM_YEAR, search?: string): Promise<BMMutantVehicle[]> {
  return bmFetch<BMMutantVehicle[]>('/mv', { year, search })
}

export function fetchMutantVehicleByUid(uid: string): Promise<BMMutantVehicle> {
  return bmFetch<BMMutantVehicle>(`/mv/${encodeURIComponent(uid)}`)
}

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Try to locate NYC Deli's own camp listing for a given year. The API's
 * `search` param is fuzzy and returns many results, so we narrow to an exact
 * (case-insensitive) name match on a short list of known aliases.
 */
export async function findNycDeliCamp(year = CURRENT_BM_YEAR): Promise<BMCamp | null> {
  const aliases = ['nyc deli', 'new york deli', 'nyc deli rats']
  const results = await fetchCamps(year, 'deli')
  const match = results.find((c) =>
    aliases.includes((c.name ?? '').trim().toLowerCase()),
  )
  return match ?? null
}
