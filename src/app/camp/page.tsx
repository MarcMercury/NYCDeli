'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getOpsEvent, isInformationStage } from '@/lib/active-event'
import { eventDateLabel, fetchPublicEvents, hasFeature, stageMeta } from '@/lib/events'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { EventFeatureKey, EventRow, EventStage, UserRole } from '@/types/database'

interface OpsTile {
  href: string
  icon: string
  title: string
  description: string
  feature?: EventFeatureKey
  /** Roles allowed to see it; omitted means everyone signed in. */
  roles?: UserRole[]
  /** Stages it's relevant to; omitted means every active stage. */
  stages?: EventStage[]
  primary?: boolean
}

const TILES: OpsTile[] = [
  {
    href: '/now',
    icon: '🔥',
    title: 'Onsite Now',
    description: 'Where you sleep, when you work, who to call. Cached so it works without signal.',
    stages: ['build', 'live'],
    primary: true,
  },
  {
    href: '/map',
    icon: '🏕️',
    title: 'Camp Map',
    description: 'Interactive 2D & 3D site plan — tents, kitchen, shade and zones.',
    feature: 'layout',
  },
  {
    href: '/kitchen',
    icon: '🍳',
    title: 'Kitchen & Shifts',
    description: 'Roles, the sign-up sheet and the published shift schedule.',
    feature: 'kitchen',
  },
  {
    href: '/build-week',
    icon: '🔨',
    title: 'Build Week',
    description: 'Crew roster, day-by-day schedule, inventory, electrical and shade.',
    feature: 'build_week',
    roles: ['builder', 'admin'],
  },
  {
    href: '/profile?tab=my-schedule',
    icon: '⏰',
    title: 'Your Schedule',
    description: 'The shifts you personally signed up for.',
    feature: 'kitchen',
  },
  {
    href: '/profile?tab=packing-list',
    icon: '🎒',
    title: 'Your Packing List',
    description: 'Personal checklist built from the camp base list.',
    feature: 'packing',
  },
  {
    href: '/profile?tab=arrival',
    icon: '🚐',
    title: 'Arrival & Transport',
    description: 'When you get in, how you travel and what that means for camp.',
    feature: 'transport',
  },
]

/**
 * One door to whatever the camp is currently running. Keeps the top nav short:
 * map, kitchen, build week and the onsite view are all "this event", not four
 * separate destinations.
 */
export default function CampPage() {
  const [event, setEvent] = useState<EventRow | null>(null)
  const [upcoming, setUpcoming] = useState<EventRow[]>([])
  const [role, setRole] = useState<UserRole | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      getOpsEvent(),
      fetchPublicEvents(),
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session?.user) return null
        const { data } = await supabase.from('user_profiles').select('role').eq('id', session.user.id).single()
        return (data as { role: UserRole } | null)?.role ?? null
      }),
    ]).then(([opsEvent, publicEvents, userRole]) => {
      const today = new Date().toISOString().slice(0, 10)
      setEvent(opsEvent)
      setUpcoming(
        publicEvents
          .filter(e => e.id !== opsEvent?.id && e.stage !== 'closed' && (!e.start_date || e.start_date >= today))
          .sort((a, b) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999'))
      )
      setRole(userRole)
      setLoaded(true)
    })
  }, [])

  if (!loaded) {
    return <p className="max-w-5xl mx-auto px-4 py-10 font-bold uppercase tracking-wider text-gray-500">Loading…</p>
  }

  const offseason = isInformationStage(event)
  const meta = event ? stageMeta(event.stage) : null
  const days = daysUntil(event?.start_date ?? null)

  const tiles = TILES.filter(tile => {
    if (tile.roles && !(role && tile.roles.includes(role))) return false
    if (tile.stages && !(event && tile.stages.includes(event.stage))) return false
    return !tile.feature || hasFeature(event, tile.feature)
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-black uppercase tracking-wider">Camp</h1>

      {offseason ? (
        <>
          <p className="text-gray-600 mt-1">
            No camp operations are running. Map, kitchen, shifts and packing lists switch on for an
            event once it reaches prep — not while it is still being planned.
          </p>
          <Card className="mt-6">
            <CardContent className="py-8 text-center space-y-4">
              <p className="text-gray-700">
                {event
                  ? <>The last event was <strong>{event.name}</strong>. Its records, photos and roster are preserved.</>
                  : 'No event has been set up yet.'}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/events"><Button>See Events</Button></Link>
                {event && (
                  <Link href={`/events/${event.slug}`}><Button variant="secondary">{event.name}</Button></Link>
                )}
                <Link href="/resources"><Button variant="secondary">Camp Resources</Button></Link>
              </div>
            </CardContent>
          </Card>

          {upcoming.length > 0 && (
            <>
              <h2 className="text-xl font-black uppercase tracking-wide mt-8">In the works</h2>
              <div className="grid sm:grid-cols-2 gap-4 mt-3">
                {upcoming.map(next => {
                  const nextMeta = stageMeta(next.stage)
                  return (
                    <Link
                      key={next.id}
                      href={`/events/${next.slug}`}
                      className="border-2 border-black bg-white hover:bg-yellow-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors"
                    >
                      <span className={cn('inline-block px-2 py-0.5 text-xs font-bold uppercase border-2', nextMeta.className)}>
                        {nextMeta.icon} {nextMeta.label}
                      </span>
                      <span className="block font-black uppercase tracking-wide mt-2">{next.name}</span>
                      <span className="block text-sm font-bold text-gray-700">
                        {eventDateLabel(next)}
                        {next.location_name && ` · ${next.location_name}`}
                      </span>
                      <span className="block text-sm text-gray-600 mt-1">{nextMeta.description}</span>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={cn('px-2 py-0.5 text-xs font-bold uppercase border-2', meta!.className)}>
              {meta!.icon} {meta!.label}
            </span>
            {days !== null && days > 0 && <Badge variant="warning">{days} days out</Badge>}
          </div>
          <h2 className="text-2xl font-black uppercase tracking-wide mt-2">{event!.name}</h2>
          <p className="font-bold text-gray-700">
            {eventDateLabel(event!)}
            {event!.location_name && ` · ${event!.location_name}`}
          </p>
          <p className="text-sm text-gray-600 mt-2">{meta!.description}</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {tiles.map(tile => (
              <Link
                key={tile.href}
                href={tile.href}
                className={cn(
                  'border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors',
                  tile.primary ? 'bg-yellow-400 hover:bg-yellow-300' : 'bg-white hover:bg-yellow-50'
                )}
              >
                <span className="text-2xl" aria-hidden>{tile.icon}</span>
                <span className="block font-black uppercase tracking-wide mt-1">{tile.title}</span>
                <span className="block text-sm text-gray-700 mt-1">{tile.description}</span>
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-4 text-sm font-bold uppercase tracking-wider">
            <Link href={`/events/${event!.slug}`} className="underline">Event details & photos →</Link>
            <Link href="/campers" className="underline">Who&apos;s coming →</Link>
            {role === 'admin' && <Link href="/admin/events" className="underline">Run this event →</Link>}
          </div>
        </>
      )}
    </div>
  )
}

function daysUntil(date: string | null): number | null {
  if (!date) return null
  const target = new Date(`${date}T12:00:00Z`).getTime()
  const today = new Date().setHours(12, 0, 0, 0)
  return Math.round((target - today) / 86_400_000)
}
