'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  EVENT_KIND_LABELS,
  eventDateLabel,
  fetchEvents,
  isAcceptingApplications,
  stageMeta,
} from '@/lib/events'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { EventRow } from '@/types/database'

/**
 * Public event index. Anonymous visitors see only events flagged public (RLS),
 * which is what makes this double as the camp's promotional page.
 */
export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents().then(rows => {
      setEvents(rows)
      setLoading(false)
    })
  }, [])

  const active = events.filter(e => e.stage !== 'closed')
  const archived = events.filter(e => e.stage === 'closed')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-black uppercase tracking-wider">Events</h1>
      <p className="text-gray-600 mt-1 mb-8">
        Everything NYC Deli Rats builds, burns and throws — past, present and upcoming.
      </p>

      {loading ? (
        <p className="font-bold uppercase tracking-wider text-gray-500">Loading…</p>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-600">
            No events are listed right now. Check the{' '}
            <Link href="/calendar" className="underline font-bold">camp calendar</Link> for what&apos;s coming up.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          <Section title="Current & Upcoming" events={active} emptyText="Nothing currently in the works." />
          {archived.length > 0 && <Section title="Past Events" events={archived} emptyText="" />}
        </div>
      )}
    </div>
  )
}

function Section({ title, events, emptyText }: { title: string; events: EventRow[]; emptyText: string }) {
  return (
    <section>
      <h2 className="text-lg font-black uppercase tracking-wider border-b-2 border-black pb-1 mb-4">{title}</h2>
      {events.length === 0 ? (
        <p className="text-gray-600">{emptyText}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  )
}

export function EventCard({ event }: { event: EventRow }) {
  const meta = stageMeta(event.stage)
  const open = isAcceptingApplications(event)

  return (
    <Card className="flex flex-col">
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
