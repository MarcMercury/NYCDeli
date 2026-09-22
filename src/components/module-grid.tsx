'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getOpsEvent, isInformationStage } from '@/lib/active-event'
import { hasFeature } from '@/lib/events'
import type { EventFeatureKey, EventRow } from '@/types/database'

interface ModuleCard {
  href: string
  icon: string
  title: string
  description: string
  status: string
  statusColor: string
  /** Hidden when the current event doesn't use this module. */
  feature?: EventFeatureKey
  /** Hidden in the offseason — it only describes one event's operations. */
  eventOnly?: boolean
}

const modules: ModuleCard[] = [
  {
    href: '/events',
    icon: '📅',
    title: 'Events',
    description: 'What’s coming up, what’s open for applications, the camp calendar and every past event.',
    status: 'Always On',
    statusColor: 'text-green-400',
  },
  {
    href: '/camp',
    icon: '🏕️',
    title: 'Camp',
    description: 'The event we’re running right now: map, kitchen and shifts, build week and the onsite view.',
    status: 'Event',
    statusColor: 'text-yellow-400',
    eventOnly: true,
  },
  {
    href: '/campers',
    icon: '🐀',
    title: 'The Rats',
    description: 'Who’s who — search by name, playa name or event. Photos, bios and history.',
    status: 'Active',
    statusColor: 'text-green-400',
    feature: 'directory',
  },
  {
    href: '/resources',
    icon: '📚',
    title: 'Resources',
    description: 'How the camp works, BM 101, amenities and everything worth knowing before you show up.',
    status: 'Always On',
    statusColor: 'text-green-400',
  },
  {
    href: '/profile',
    icon: '👤',
    title: 'Your Profile',
    description: 'Your permanent NYC Deli account: contact info, participation history, photos, packing list and schedule.',
    status: 'Always On',
    statusColor: 'text-green-400',
  },
]

/**
 * Module grid for the home page. Modules tied to one event's operations drop
 * out in the offseason rather than linking members at a redirect or a blank
 * page.
 */
export function ModuleGrid() {
  const [event, setEvent] = useState<EventRow | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getOpsEvent().then(result => {
      setEvent(result)
      setLoaded(true)
    })
  }, [])

  if (!loaded) return null

  const offseason = isInformationStage(event)
  const visible = modules.filter(module => {
    if (module.eventOnly && offseason) return false
    return !module.feature || hasFeature(event, module.feature)
  })

  return (
    <section className="relative py-16 px-4 nyc-brick-wall nyc-grime">
      <div className="relative z-10 max-w-7xl mx-auto">
        <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-center mb-2 text-[#fccc0a] nyc-stencil">
          Camp System Modules
        </h2>
        <p className="text-center text-gray-300 mb-12">
          {offseason
            ? 'What’s open right now. Event tooling — the map, shifts and build week — switches on when the next event does.'
            : 'Everything the Rats run on, in four doors. Each event switches on only the modules it actually needs.'}
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((module, i) => (
            <Link key={module.href} href={module.href} className="group">
              <div
                className="h-full bg-black/80 border border-white/10 p-6 nyc-poster"
                style={{ transform: `rotate(${i % 2 === 0 ? '-0.5' : '0.5'}deg)` }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-4xl">{module.icon}</span>
                  <span className={`text-xs font-black uppercase ${module.statusColor}`}>
                    {module.status}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-black text-white">{module.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{module.description}</p>
                <span className="inline-block mt-4 text-sm font-bold text-[#fccc0a] group-hover:text-[#ffd93d]">
                  Go to {module.title} &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
