'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchCalendar, formatCalendarDate, upcomingItems, type CalendarItem } from '@/lib/calendar'
import { eventDateLabel, fetchEvents, isAcceptingApplications, stageMeta } from '@/lib/events'
import type { EventRow } from '@/types/database'

/**
 * Org-level "what's happening" strip for the public home page.
 *
 * NYC Deli Rats outlives any single event, so the home page shows whatever the
 * camp currently has going on rather than hard-coding one burn.
 */
export function NextUp() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [items, setItems] = useState<CalendarItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([fetchEvents(), fetchCalendar()]).then(([eventRows, calendar]) => {
      setEvents(eventRows.filter(e => e.stage !== 'closed'))
      setItems(upcomingItems(calendar).slice(0, 5))
      setLoaded(true)
    })
  }, [])

  if (!loaded || (events.length === 0 && items.length === 0)) return null

  const onsite = events.find(e => e.stage === 'build' || e.stage === 'live')

  return (
    <section className="bg-[#111] border-y-2 border-[#fccc0a]/30 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {onsite && (
          <Link
            href="/now"
            className="block mb-8 border-2 border-[#fccc0a] bg-[#fccc0a] text-black px-4 py-3 hover:bg-[#ffd93d] transition-colors"
          >
            <p className="text-xs font-black uppercase tracking-[0.3em]">
              {onsite.stage === 'build' ? 'Build is on' : 'We are live'}
            </p>
            <p className="font-black uppercase">Open the onsite view — works without signal →</p>
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#fccc0a]">What&apos;s Next</h2>
          <div className="flex gap-4 text-sm font-bold uppercase tracking-wider">
            <Link href="/events" className="text-white hover:text-[#fccc0a]">All events →</Link>
            <Link href="/events?view=calendar" className="text-white hover:text-[#fccc0a]">Camp calendar →</Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-gray-400">No event is currently in the works — watch the calendar.</p>
            ) : (
              events.slice(0, 3).map(event => {
                const meta = stageMeta(event.stage)
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.slug}`}
                    className="block border-2 border-white/20 hover:border-[#fccc0a] p-4 transition-colors"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-[#fccc0a]">
                      {meta.icon} {meta.label}
                      {isAcceptingApplications(event) && ' · Applications open'}
                    </p>
                    <p className="text-2xl font-black uppercase text-white mt-1">{event.name}</p>
                    <p className="text-sm text-gray-300">
                      {eventDateLabel(event)}
                      {event.location_name && ` · ${event.location_name}`}
                    </p>
                  </Link>
                )
              })
            )}
          </div>

          <ul className="space-y-2">
            {items.map(item => (
              <li key={item.id} className="flex justify-between gap-4 border-b border-white/10 pb-2">
                <span className="text-white font-semibold">{item.title}</span>
                <span className="text-gray-400 text-sm whitespace-nowrap">{formatCalendarDate(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
