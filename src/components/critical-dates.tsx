'use client'

import { useEffect, useState } from 'react'
import { fetchCalendar, formatCalendarDate, upcomingItems, type CalendarItem } from '@/lib/calendar'
import { getOpsEvent, isInformationStage } from '@/lib/active-event'
import type { EventRow } from '@/types/database'

const LINE_COLOURS = [
  'nyc-line-yellow',
  'nyc-line-red',
  'nyc-line-green',
  'nyc-line-orange',
  'nyc-line-purple',
]

/**
 * Subway-board of the dates that actually matter next. Reads the camp calendar
 * instead of a hard-coded Burning Man schedule, and disappears entirely when
 * nothing is on the books.
 */
export function CriticalDates() {
  const [items, setItems] = useState<CalendarItem[]>([])
  const [event, setEvent] = useState<EventRow | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([fetchCalendar(), getOpsEvent()]).then(([calendar, opsEvent]) => {
      setItems(upcomingItems(calendar).slice(0, 5))
      setEvent(opsEvent)
      setLoaded(true)
    })
  }, [])

  if (!loaded || items.length === 0) return null

  const subtitle = isInformationStage(event) ? 'Coming up' : event?.name ?? 'Coming up'

  return (
    <section className="bg-[#0a0a0a] py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-center text-[#fccc0a] mb-2 nyc-neon-subtle">
          Critical Dates
        </h2>
        <p className="text-center text-gray-400 mb-12 text-sm uppercase tracking-widest">
          {subtitle}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
          {items.map((item, i) => (
            <div key={item.id} className="text-center">
              <div className={`w-8 h-8 rounded-full ${LINE_COLOURS[i % LINE_COLOURS.length]} mx-auto mb-3 flex items-center justify-center`}>
                <div className="w-4 h-4 rounded-full bg-[#0a0a0a]" />
              </div>
              <div className="text-2xl font-black text-white mb-2">
                {formatCalendarDate(item)}
              </div>
              <div className="font-black uppercase tracking-[0.15em] text-sm mb-1 text-gray-300">
                {item.title}
              </div>
              {item.location && <div className="text-xs text-gray-500">{item.location}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
