'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  EVENT_KIND_LABELS,
  eventDateLabel,
  fetchEvents,
  isAcceptingApplications,
  stageMeta,
} from '@/lib/events'
import { CampCalendar } from '@/components/camp-calendar'
import { EventThumbnail } from '@/components/event-media'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { EventRow } from '@/types/database'

type View = 'upcoming' | 'calendar' | 'past'

const VIEWS: { key: View; label: string }[] = [
  { key: 'upcoming', label: 'Current & Upcoming' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'past', label: 'Past Events' },
]

/**
 * Public events index. Anonymous visitors see only events flagged public (RLS),
 * which is what makes this double as the camp's promotional page. The camp
 * calendar lives here too — "what is the camp doing" is one question, not two.
 */
export default function EventsPage() {
  return (
    <Suspense fallback={null}>
      <EventsPageBody />
    </Suspense>
  )
}

function EventsPageBody() {
  const router = useRouter()
  const params = useSearchParams()
  const requested = params.get('view') as View | null
  const [view, setView] = useState<View>(requested === 'calendar' || requested === 'past' ? requested : 'upcoming')
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents().then(rows => {
      setEvents(rows)
      setLoading(false)
    })
  }, [])

  const select = (next: View) => {
    setView(next)
    router.replace(next === 'upcoming' ? '/events' : `/events?view=${next}`, { scroll: false })
  }

  const active = events.filter(e => e.stage !== 'closed')
  const archived = events.filter(e => e.stage === 'closed')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-black uppercase tracking-wider">Events</h1>
      <p className="text-gray-600 mt-1 mb-6">
        Everything NYC Deli Rats builds, burns and throws — plus every meeting, deadline and social in between.
      </p>

      <div className="flex flex-wrap gap-1 mb-6 border-b-2 border-black">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => select(v.key)}
            className={cn(
              'px-4 py-2 text-sm font-bold uppercase tracking-wider border-2 border-b-0',
              view === v.key ? 'bg-black text-yellow-400 border-black' : 'bg-white border-transparent hover:bg-gray-100'
            )}
          >
            {v.label}
            {v.key === 'past' && archived.length > 0 && ` (${archived.length})`}
          </button>
        ))}
      </div>

      {view === 'calendar' ? (
        <CampCalendar />
      ) : loading ? (
        <p className="font-bold uppercase tracking-wider text-gray-500">Loading…</p>
      ) : view === 'upcoming' ? (
        <EventList
          events={active}
          emptyText="Nothing currently in the works — check the Calendar tab for what the camp is up to."
        />
      ) : (
        <EventList events={archived} emptyText="No archived events yet." />
      )}
    </div>
  )
}

function EventList({ events, emptyText }: { events: EventRow[]; emptyText: string }) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-600">{emptyText}</CardContent>
      </Card>
    )
  }
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}

export function EventCard({ event }: { event: EventRow }) {
  const meta = stageMeta(event.stage)
  const open = isAcceptingApplications(event)

  return (
    <Card className="flex flex-col overflow-hidden">
      <EventThumbnail event={event} />
      <CardContent className="py-5 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={cn('px-2 py-0.5 text-xs font-bold uppercase border-2', meta.className)}>
            {meta.icon} {meta.label}
          </span>
          <Badge>{EVENT_KIND_LABELS[event.kind]}</Badge>
          {event.is_flagship && <Badge variant="warning">Current</Badge>}
          {open && <Badge variant="success">Applications open</Badge>}
        </div>

        <h3 className="text-2xl font-black uppercase tracking-wide">{event.name}</h3>
        <p className="font-bold text-sm text-gray-700 mt-1">
          {eventDateLabel(event)}
          {event.location_name && ` · ${event.location_name}`}
        </p>
        {event.tagline && <p className="text-gray-700 mt-2">{event.tagline}</p>}
      </CardContent>
      <div className="px-6 pb-5">
        <Link href={`/events/${event.slug}`}>
          <Button variant={open ? 'primary' : 'secondary'} size="sm">
            {open ? 'Apply / Details' : 'View Event'}
          </Button>
        </Link>
      </div>
    </Card>
  )
}
