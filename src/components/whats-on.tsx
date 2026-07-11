'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

/* ------------------------------------------------------------------ */
/*  Types (mirror src/lib/burningman.ts)                              */
/* ------------------------------------------------------------------ */
interface BMEventOccurrence {
  start_time: string
  end_time: string
}
interface BMEvent {
  uid: string
  title: string
  year: number
  description: string | null
  print_description: string | null
  event_type: { abbr: string; label: string } | null
  hosted_by_camp: string | null
  located_at_art: string | null
  other_location: string | null
  check_location: boolean | null
  all_day: boolean | null
  url: string | null
  occurrence_set: BMEventOccurrence[] | null
}
interface BMCampLite {
  uid: string
  name: string
  location_string: string | null
}

/* ------------------------------------------------------------------ */
/*  Event-type taxonomy (from the BM API `abbr` values)               */
/* ------------------------------------------------------------------ */
const EVENT_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  work: { label: 'Workshops', icon: '🧑\u200d🏫', color: 'bg-blue-200 text-blue-800' },
  prty: { label: 'Music/Party', icon: '🎉', color: 'bg-purple-200 text-purple-800' },
  food: { label: 'Food', icon: '🍔', color: 'bg-yellow-200 text-yellow-800' },
  tea: { label: 'Beverages', icon: '☕', color: 'bg-amber-200 text-amber-800' },
  arts: { label: 'Arts & Crafts', icon: '🎨', color: 'bg-pink-200 text-pink-800' },
  adlt: { label: 'Mature (18+)', icon: '🔞', color: 'bg-red-200 text-red-800' },
  kid: { label: 'Kids', icon: '🧸', color: 'bg-green-200 text-green-800' },
  othr: { label: 'Other', icon: '✨', color: 'bg-gray-200 text-gray-700' },
}

const YEARS = [2026, 2025, 2024, 2023]

/* ------------------------------------------------------------------ */
/*  Date helpers — occurrences are already in playa time (-07:00),     */
/*  so we read the wall-clock straight from the ISO string to avoid    */
/*  browser-timezone drift.                                            */
/* ------------------------------------------------------------------ */
interface ParsedTime {
  date: string // YYYY-MM-DD
  minutes: number // minutes since midnight (for sorting)
  time: string // "6:00 PM"
}
function parsePlayaIso(iso: string): ParsedTime {
  const date = iso.slice(0, 10)
  const hh = parseInt(iso.slice(11, 13), 10) || 0
  const mmStr = iso.slice(14, 16) || '00'
  const mm = parseInt(mmStr, 10) || 0
  const ampm = hh >= 12 ? 'PM' : 'AM'
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return { date, minutes: hh * 60 + mm, time: `${h12}:${mmStr} ${ampm}` }
}
function dayLabel(date: string): { weekday: string; short: string } {
  const d = new Date(`${date}T12:00:00`)
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'long' }),
    short: d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }),
  }
}

/* A single event happening at one specific time. */
interface Occurrence {
  key: string
  event: BMEvent
  date: string
  start: ParsedTime
  end: ParsedTime
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function WhatsOn() {
  const [year, setYear] = useState<number>(2026)
  const [events, setEvents] = useState<BMEvent[]>([])
  const [campNames, setCampNames] = useState<Map<string, BMCampLite>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [activeDay, setActiveDay] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<string | 'all'>('all')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 300)
    return () => clearTimeout(t)
  }, [query])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOpenKey(null)
    setActiveDay(null)
    try {
      const [evRes, campRes] = await Promise.all([
        fetch(`/api/burningman?type=event&year=${year}`),
        fetch(`/api/burningman?type=camp&year=${year}`),
      ])
      if (!evRes.ok) {
        if (evRes.status === 404) { setEvents([]); return }
        const body = await evRes.json().catch(() => ({}))
        throw new Error(body.error || `Couldn't load events (${evRes.status})`)
      }
      const evData = (await evRes.json()) as BMEvent[]
      setEvents(Array.isArray(evData) ? evData : [])

      if (campRes.ok) {
        const campData = (await campRes.json()) as BMCampLite[]
        const map = new Map<string, BMCampLite>()
        for (const c of campData) map.set(c.uid, c)
        setCampNames(map)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => { load() }, [load])

  // Flatten every event into individual timed occurrences.
  // The Burning Man API frequently returns the same event more than once (and
  // occasionally repeats an occurrence), which would otherwise render duplicate
  // cards and — worse — produce duplicate React keys that break list
  // reconciliation (making the filters appear unresponsive). Dedupe on a
  // composite of the event uid + occurrence start time so every card is unique.
  const allOccurrences = useMemo<Occurrence[]>(() => {
    const out: Occurrence[] = []
    const seen = new Set<string>()
    for (const ev of events) {
      const set = ev.occurrence_set ?? []
      for (const occ of set) {
        if (!occ.start_time) continue
        const key = `${ev.uid}-${occ.start_time}`
        if (seen.has(key)) continue
        seen.add(key)
        const start = parsePlayaIso(occ.start_time)
        const end = parsePlayaIso(occ.end_time || occ.start_time)
        out.push({ key, event: ev, date: start.date, start, end })
      }
    }
    return out
  }, [events])

  // Distinct event days, sorted chronologically.
  const days = useMemo(() => {
    return Array.from(new Set(allOccurrences.map((o) => o.date))).sort()
  }, [allOccurrences])

  // Pick a sensible default day: today if the burn is on, else the first day.
  useEffect(() => {
    if (days.length === 0) { setActiveDay(null); return }
    const today = new Date().toISOString().slice(0, 10)
    setActiveDay(days.includes(today) ? today : days[0])
  }, [days])

  // Type counts for the currently selected day.
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const o of allOccurrences) {
      if (activeDay && o.date !== activeDay) continue
      const abbr = o.event.event_type?.abbr ?? 'othr'
      counts[abbr] = (counts[abbr] ?? 0) + 1
    }
    return counts
  }, [allOccurrences, activeDay])

  // Final filtered + sorted list for the selected day.
  const visible = useMemo(() => {
    return allOccurrences
      .filter((o) => {
        if (activeDay && o.date !== activeDay) return false
        if (activeType !== 'all' && (o.event.event_type?.abbr ?? 'othr') !== activeType) return false
        if (debounced) {
          const host = o.event.hosted_by_camp ? campNames.get(o.event.hosted_by_camp)?.name ?? '' : ''
          const hay = `${o.event.title} ${o.event.description ?? ''} ${host} ${o.event.other_location ?? ''}`.toLowerCase()
          if (!hay.includes(debounced)) return false
        }
        return true
      })
      .sort((a, b) => a.start.minutes - b.start.minutes)
  }, [allOccurrences, activeDay, activeType, debounced, campNames])

  function locationFor(ev: BMEvent): string {
    if (ev.hosted_by_camp) {
      const c = campNames.get(ev.hosted_by_camp)
      if (c) return c.location_string ? `${c.name} · ${c.location_string}` : c.name
      return 'Hosted by a camp'
    }
    if (ev.located_at_art) return 'At an art installation'
    if (ev.other_location) return ev.other_location
    return 'Location TBD on playa'
  }

  return (
    <div className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <div className="bg-black text-yellow-400 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-black uppercase tracking-tight text-lg leading-none">
            📅 What&apos;s On — Playa Events
          </h2>
          <p className="text-[11px] text-yellow-200/80 mt-1">
            Every official Black Rock City event, by day &amp; type — live from the Burning Man API.
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

      {loading ? (
        <div className="py-12 text-center text-sm font-bold text-gray-400 animate-pulse">
          Loading the playa events calendar…
        </div>
      ) : error ? (
        <div className="py-10 text-center">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="text-sm font-bold text-red-600">{error}</p>
          <button
            onClick={load}
            className="mt-3 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-black bg-yellow-400 hover:bg-yellow-300 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : days.length === 0 ? (
        <div className="py-12 text-center px-6">
          <p className="text-4xl mb-3">🌅</p>
          <p className="text-sm font-bold text-gray-600">No events published yet for {year}</p>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            Burners submit playa events closer to the burn (typically opening mid-June and finalizing in August). Check back soon — or switch the year above to browse a previous year&apos;s full calendar.
          </p>
        </div>
      ) : (
        <>
          {/* Day navigation */}
          <div className="border-b-2 border-black overflow-x-auto">
            <div className="flex">
              {days.map((d) => {
                const lbl = dayLabel(d)
                const active = d === activeDay
                return (
                  <button
                    key={d}
                    onClick={() => { setActiveDay(d); setOpenKey(null) }}
                    className={`shrink-0 px-3 py-2 text-center border-r-2 border-black last:border-r-0 transition-colors ${
                      active ? 'bg-yellow-400 text-black' : 'bg-white hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider leading-none">{lbl.weekday}</span>
                    <span className="block text-[11px] font-medium opacity-70 leading-tight mt-0.5">{lbl.short}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Type filters */}
          <div className="px-3 pt-3 flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveType('all')}
              className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-2 border-black transition-colors ${
                activeType === 'all' ? 'bg-black text-yellow-400' : 'bg-white hover:bg-gray-100'
              }`}
            >
              All
            </button>
            {Object.entries(EVENT_TYPES).map(([abbr, meta]) => {
              const count = typeCounts[abbr] ?? 0
              if (count === 0) return null
              return (
                <button
                  key={abbr}
                  onClick={() => setActiveType(activeType === abbr ? 'all' : abbr)}
                  className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-2 border-black transition-colors ${
                    activeType === abbr ? 'bg-black text-yellow-400' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  {meta.icon} {meta.label} ({count})
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">🔍</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events by title, camp, or keyword…"
                className="w-full pl-10 pr-4 py-2 border-2 border-black text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          {/* Results */}
          <div className="px-3 pb-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              {visible.length} event{visible.length !== 1 ? 's' : ''}
              {activeDay ? ` · ${dayLabel(activeDay).short}` : ''}
            </p>
            {visible.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-3xl mb-2">🏜️</p>
                <p className="text-sm font-bold text-gray-500">Nothing matches those filters</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
                {visible.map((o) => {
                  const meta = EVENT_TYPES[o.event.event_type?.abbr ?? 'othr'] ?? EVENT_TYPES.othr
                  const open = openKey === o.key
                  const desc = o.event.description || o.event.print_description || ''
                  return (
                    <div key={o.key} className="border-2 border-black/15 bg-white hover:border-black transition-colors">
                      <button
                        onClick={() => setOpenKey(open ? null : o.key)}
                        className="w-full flex items-start gap-3 px-3 py-2 text-left"
                      >
                        {/* Time block */}
                        <div className="shrink-0 w-16 text-center">
                          <span className="block text-xs font-black text-black leading-tight">{o.start.time.replace(' ', '\u00a0')}</span>
                          <span className="block text-[10px] text-gray-400 leading-tight">{o.end.time.replace(' ', '\u00a0')}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-black truncate">{o.event.title}</p>
                          <p className="text-[11px] text-gray-500 truncate">{locationFor(o.event)}</p>
                        </div>
                        <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.color}`}>
                          {meta.icon}
                        </span>
                        <span className={`shrink-0 text-gray-400 text-xs transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
                      </button>
                      {open && (
                        <div className="px-3 pb-3 pt-1 border-t border-black/10 space-y-2">
                          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${meta.color}`}>
                            {meta.icon} {meta.label}
                          </span>
                          <p className="text-xs text-gray-600">📍 {locationFor(o.event)}</p>
                          {desc && <p className="text-xs text-gray-700 whitespace-pre-line">{desc}</p>}
                          {o.event.occurrence_set && o.event.occurrence_set.length > 1 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Also happening</p>
                              <div className="flex flex-wrap gap-1">
                                {o.event.occurrence_set.map((oc, i) => {
                                  const p = parsePlayaIso(oc.start_time)
                                  const dl = dayLabel(p.date)
                                  return (
                                    <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                      {dl.short} {p.time}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          {o.event.url && (
                            <a
                              href={o.event.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-2 border-black bg-yellow-400 hover:bg-yellow-300 transition-colors"
                            >
                              🔗 More info
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
