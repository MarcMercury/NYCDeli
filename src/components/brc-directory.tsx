'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

/* ------------------------------------------------------------------ */
/*  Types (mirror src/lib/burningman.ts)                              */
/* ------------------------------------------------------------------ */
interface BMImage {
  thumbnail_url: string | null
}
interface BMLocation {
  frontage?: string | null
  intersection?: string | null
  intersection_type?: string | null
  dimensions?: string | null
  exact_location?: string | null
  category?: string | null
  gps_latitude?: number | null
  gps_longitude?: number | null
}
interface BMCamp {
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
interface BMArt {
  uid: string
  name: string
  year: number
  artist: string | null
  category: string | null
  program: string | null
  hometown: string | null
  description: string | null
  url: string | null
  location_string: string | null
  images: BMImage[] | null
}
interface BMEventOccurrence {
  start_time: string
  end_time: string
}
interface BMEvent {
  uid: string
  title: string
  year: number
  description: string | null
  event_type: { abbr: string; label: string } | null
  hosted_by_camp: string | null
  other_location: string | null
  all_day: boolean | null
  occurrence_set: BMEventOccurrence[] | null
}
interface BMMutantVehicle {
  uid: string
  name: string
  year: number
  artist: string | null
  hometown: string | null
  description: string | null
  url: string | null
  contact_email: string | null
  tags: string[] | null
  images: BMImage[] | null
}

type Tab = 'camp' | 'art' | 'event' | 'mv'

// Events live in the dedicated "What's On" browser, so the directory focuses on
// who/what is on playa (camps, art, mutant vehicles).
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'camp', label: 'Theme Camps', icon: '🏕️' },
  { key: 'art', label: 'Art', icon: '🎨' },
  { key: 'mv', label: 'Mutant Vehicles', icon: '🚙' },
]

const YEARS = [2026, 2025, 2024, 2023]

const NYC_DELI_ALIASES = ['nyc deli', 'new york deli', 'nyc deli rats']

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function isNycDeli(name: string | null | undefined): boolean {
  return NYC_DELI_ALIASES.includes((name ?? '').trim().toLowerCase())
}

function formatOccurrence(occ: BMEventOccurrence): string {
  try {
    const start = new Date(occ.start_time)
    const end = new Date(occ.end_time)
    const day = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    return `${day}, ${t(start)} – ${t(end)}`
  } catch {
    return ''
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function BrcDirectory() {
  const [tab, setTab] = useState<Tab>('camp')
  const [year, setYear] = useState<number>(2026)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [records, setRecords] = useState<BMRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openUid, setOpenUid] = useState<string | null>(null)

  type BMRecord = BMCamp | BMArt | BMEvent | BMMutantVehicle

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  // Camp UID → name map so events can show their host camp name
  const campNameByUid = useRef<Map<string, string>>(new Map())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOpenUid(null)
    try {
      const params = new URLSearchParams({ type: tab, year: String(year) })
      // camp & mv support server-side search; art & event we filter client-side
      if (debounced && (tab === 'camp' || tab === 'mv')) params.set('search', debounced)

      const res = await fetch(`/api/burningman?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (res.status === 429) throw new Error('Too many requests — give it a moment and try again.')
        if (res.status === 404) {
          setRecords([])
          return
        }
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      const data = (await res.json()) as BMRecord[]
      const list = Array.isArray(data) ? data : [data]
      setRecords(list)

      if (tab === 'camp') {
        const m = campNameByUid.current
        for (const c of list as BMCamp[]) m.set(c.uid, c.name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [tab, year, debounced])

  useEffect(() => {
    load()
  }, [load])

  // Client-side filtering (art & events use it; camp/mv already server-filtered
  // but we still narrow further so multi-word queries work nicely)
  const filtered = useMemo(() => {
    const q = debounced.toLowerCase()
    if (!q) return records
    return records.filter((r) => {
      if ('title' in r) {
        const e = r as BMEvent
        return (
          e.title?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.event_type?.label.toLowerCase().includes(q)
        )
      }
      const a = r as BMCamp | BMArt | BMMutantVehicle
      return (
        a.name?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        ('artist' in a && a.artist?.toLowerCase().includes(q)) ||
        ('hometown' in a && a.hometown?.toLowerCase().includes(q))
      )
    })
  }, [records, debounced])

  // Pull NYC Deli's own listing to the top when browsing camps
  const ordered = useMemo(() => {
    if (tab !== 'camp') return filtered
    const deli = (filtered as BMCamp[]).filter((c) => isNycDeli(c.name))
    const rest = (filtered as BMCamp[]).filter((c) => !isNycDeli(c.name))
    return [...deli, ...rest]
  }, [filtered, tab])

  return (
    <div className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <div className="bg-black text-yellow-400 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-black uppercase tracking-tight text-lg leading-none">
            🔥 Black Rock City Directory
          </h2>
          <p className="text-[11px] text-yellow-200/80 mt-1">
            Live search of every camp, art piece, event &amp; mutant vehicle — straight from the official Burning Man API.
          </p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-xs font-bold uppercase tracking-wider bg-yellow-400 text-black border-2 border-yellow-400 px-2 py-1 cursor-pointer"
          aria-label="Event year"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-0 border-b-2 border-black">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setQuery('') }}
            className={`flex-1 min-w-[110px] px-3 py-2 text-xs font-bold uppercase tracking-wider border-r-2 border-black last:border-r-0 transition-colors ${
              tab === t.key ? 'bg-yellow-400 text-black' : 'bg-white hover:bg-gray-100 text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-3 border-b-2 border-black/10">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === 'camp' ? 'Search camps by name, theme, hometown…'
                : tab === 'art' ? 'Search art by name or artist…'
                : tab === 'event' ? 'Search events by title or type…'
                : 'Search mutant vehicles…'
            }
            className="w-full pl-10 pr-4 py-2 border-2 border-black text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </div>

      {/* Results */}
      <div className="p-3">
        {loading ? (
          <div className="py-10 text-center text-sm font-bold text-gray-400 animate-pulse">
            Loading {TABS.find((t) => t.key === tab)?.label.toLowerCase()}…
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-3xl mb-2">⚠️</p>
            <p className="text-sm font-bold text-red-600">{error}</p>
            <button
              onClick={load}
              className="mt-3 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-black bg-yellow-400 hover:bg-yellow-300 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : ordered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-3xl mb-2">🏜️</p>
            <p className="text-sm font-bold text-gray-500">
              {debounced ? 'No matches found' : `No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} published yet for ${year}`}
            </p>
            {debounced && <p className="text-xs text-gray-400 mt-1">Try a different search term.</p>}
          </div>
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              {ordered.length} result{ordered.length !== 1 ? 's' : ''}
              {tab === 'event' || tab === 'art' ? (debounced ? ' (filtered)' : '') : ''}
            </p>
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {ordered.map((r) => {
                const uid = r.uid
                const open = openUid === uid
                const deli = tab === 'camp' && isNycDeli((r as BMCamp).name)
                return (
                  <div
                    key={uid}
                    className={`border-2 ${deli ? 'border-yellow-500 bg-yellow-50' : 'border-black/15 bg-white'} hover:border-black transition-colors`}
                  >
                    <button
                      onClick={() => setOpenUid(open ? null : uid)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left"
                    >
                      <Thumb record={r} tab={tab} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-black truncate flex items-center gap-1.5">
                          {recordTitle(r, tab)}
                          {deli && <span className="text-[9px] bg-black text-yellow-400 px-1 py-0.5 rounded font-black uppercase">Us!</span>}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">{recordSubtitle(r, tab, campNameByUid.current)}</p>
                      </div>
                      <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
                    </button>
                    {open && (
                      <div className="px-3 pb-3 pt-1 border-t border-black/10">
                        <RecordDetail record={r} tab={tab} campNameByUid={campNameByUid.current} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
type AnyRecord = BMCamp | BMArt | BMEvent | BMMutantVehicle

function recordTitle(r: AnyRecord, tab: Tab): string {
  if (tab === 'event') return (r as BMEvent).title || 'Untitled event'
  return (r as BMCamp | BMArt | BMMutantVehicle).name || 'Untitled'
}

function recordSubtitle(r: AnyRecord, tab: Tab, campNames: Map<string, string>): string {
  if (tab === 'camp') {
    const c = r as BMCamp
    return [c.location_string, c.hometown].filter(Boolean).join(' · ') || 'Location TBD'
  }
  if (tab === 'art') {
    const a = r as BMArt
    return [a.artist, a.location_string].filter(Boolean).join(' · ') || a.category || ''
  }
  if (tab === 'event') {
    const e = r as BMEvent
    const host = e.hosted_by_camp ? campNames.get(e.hosted_by_camp) : null
    return [e.event_type?.label, host ? `@ ${host}` : e.other_location].filter(Boolean).join(' · ')
  }
  const mv = r as BMMutantVehicle
  return [mv.artist, mv.hometown].filter(Boolean).join(' · ')
}

function Thumb({ record, tab }: { record: AnyRecord; tab: Tab }) {
  const img =
    tab === 'event'
      ? null
      : (record as BMCamp | BMArt | BMMutantVehicle).images?.[0]?.thumbnail_url ?? null
  const icon = TABS.find((t) => t.key === tab)?.icon ?? '🔥'
  if (!img) {
    return (
      <div className="w-10 h-10 shrink-0 grid place-items-center bg-gray-100 border border-black/10 text-lg">
        {icon}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={img} alt="" loading="lazy" className="w-10 h-10 shrink-0 object-cover border border-black/10" />
  )
}

function RecordDetail({
  record,
  tab,
  campNameByUid,
}: {
  record: AnyRecord
  tab: Tab
  campNameByUid: Map<string, string>
}) {
  if (tab === 'event') {
    const e = record as BMEvent
    return (
      <div className="space-y-2">
        {e.event_type && (
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
            {e.event_type.label}
          </span>
        )}
        {e.description && <p className="text-xs text-gray-700 whitespace-pre-line">{e.description}</p>}
        {e.occurrence_set && e.occurrence_set.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">When</p>
            {e.occurrence_set.map((occ, i) => (
              <p key={i} className="text-xs text-gray-700">🕒 {formatOccurrence(occ)}</p>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-600">
          📍 {e.hosted_by_camp ? campNameByUid.get(e.hosted_by_camp) ?? 'Camp' : e.other_location || 'See location at event'}
        </p>
      </div>
    )
  }

  if (tab === 'camp') {
    const c = record as BMCamp
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {c.location_string && <Pill>📍 {c.location_string}</Pill>}
          {c.location?.dimensions && <Pill>📐 {c.location.dimensions}</Pill>}
          {c.hometown && <Pill>🏠 {c.hometown}</Pill>}
          {c.accepting_campers != null && (
            <Pill className={c.accepting_campers ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}>
              {c.accepting_campers ? '✅ Accepting campers' : '🚫 Not recruiting'}
            </Pill>
          )}
        </div>
        {c.landmark && <p className="text-xs text-gray-600"><span className="font-bold">Landmark:</span> {c.landmark}</p>}
        {c.description && <p className="text-xs text-gray-700 whitespace-pre-line">{c.description}</p>}
        <LinkRow url={c.url} email={c.contact_email} />
      </div>
    )
  }

  if (tab === 'art') {
    const a = record as BMArt
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {a.location_string && <Pill>📍 {a.location_string}</Pill>}
          {a.category && <Pill>{a.category}</Pill>}
          {a.program && <Pill className="bg-orange-200 text-orange-800">{a.program}</Pill>}
          {a.hometown && <Pill>🏠 {a.hometown}</Pill>}
        </div>
        {a.artist && <p className="text-xs text-gray-600"><span className="font-bold">Artist:</span> {a.artist}</p>}
        {a.description && <p className="text-xs text-gray-700 whitespace-pre-line">{a.description}</p>}
        <LinkRow url={a.url} email={null} />
      </div>
    )
  }

  const mv = record as BMMutantVehicle
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {mv.hometown && <Pill>🏠 {mv.hometown}</Pill>}
        {mv.tags?.map((t) => <Pill key={t}>#{t}</Pill>)}
      </div>
      {mv.artist && <p className="text-xs text-gray-600"><span className="font-bold">Artist:</span> {mv.artist}</p>}
      {mv.description && <p className="text-xs text-gray-700 whitespace-pre-line">{mv.description}</p>}
      <LinkRow url={mv.url} email={mv.contact_email} />
    </div>
  )
}

function Pill({ children, className = 'bg-gray-100 text-gray-600' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${className}`}>
      {children}
    </span>
  )
}

function LinkRow({ url, email }: { url: string | null; email: string | null }) {
  if (!url && !email) return null
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-2 border-black bg-yellow-400 hover:bg-yellow-300 transition-colors"
        >
          🔗 Website
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-2 border-black bg-white hover:bg-gray-100 transition-colors"
        >
          ✉️ Contact
        </a>
      )}
    </div>
  )
}
