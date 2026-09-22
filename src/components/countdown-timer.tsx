'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { fetchCountdownTargets, type CountdownTarget } from '@/lib/active-event'

function getTimeLeft(target: Date, now: number) {
  const diff = target.getTime() - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, expired: false }
}

type TimeLeft = ReturnType<typeof getTimeLeft>

const emptySubscribe = () => () => {}

/* Rat character using uploaded paste-up style image */
function SprayPaintRat() {
  return (
    <div className="graffiti-rat-wrapper">
      <Image
        src="/Images/RAT%20SPRAYPAINT.png"
        alt="NYC Deli rat with spray paint can"
        width={220}
        height={380}
        className="graffiti-rat-img"
        priority
      />
    </div>
  )
}

/** One labelled clock. `values` omitted renders the pre-hydration placeholder. */
function Clock({ label, icon, values }: { label: string; icon: string; values?: TimeLeft }) {
  const items = values && !values.expired
    ? [
        { value: values.days, label: 'DAYS' },
        { value: values.hours, label: 'HRS' },
        { value: values.minutes, label: 'MIN' },
        { value: values.seconds, label: 'SEC' },
      ]
    : [
        { value: '--', label: 'DAYS' },
        { value: '--', label: 'HRS' },
        { value: '--', label: 'MIN' },
        { value: '--', label: 'SEC' },
      ]

  return (
    <div className="flex flex-col items-center gap-1">
      <h2 className="graffiti-title shrink-0">
        <span className="graffiti-text-compact">
          {values?.expired ? `💥 ${label.toUpperCase()} — BOOM.` : `${icon} ${label} in:`}
        </span>
      </h2>
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
        {items.map(({ value, label: unit }) => (
          <div key={unit} className="flex flex-col items-center">
            <div className="graffiti-number-block-compact">
              <span className="graffiti-number-compact">
                {typeof value === 'number' ? String(value).padStart(2, '0') : value}
              </span>
            </div>
            <span className="graffiti-label-compact">{unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CountdownDisplay({ clocks }: { clocks: { key: string; label: string; icon: string; values?: TimeLeft }[] }) {
  return (
    <section className="countdown-brick-wall relative overflow-hidden border-b-4 border-black">
      {/* Black background with spray paint texture */}
      <div className="absolute inset-0 bg-black">
        {/* Subtle concrete/asphalt texture via CSS noise */}
        <div className="absolute inset-0 nyc-grime" />
        {/* Spray paint ambient glow patches */}
        <div className="absolute inset-0" style={{
          background: [
            'radial-gradient(ellipse 400px 250px at 8% 40%, rgba(185,51,173,0.08) 0%, transparent 70%)',
            'radial-gradient(ellipse 300px 200px at 90% 60%, rgba(185,51,173,0.06) 0%, transparent 70%)',
            'radial-gradient(ellipse 250px 180px at 50% 15%, rgba(252,204,10,0.04) 0%, transparent 70%)',
            'radial-gradient(ellipse 350px 200px at 70% 80%, rgba(57,255,20,0.03) 0%, transparent 70%)',
            'radial-gradient(ellipse 200px 300px at 20% 85%, rgba(255,99,25,0.04) 0%, transparent 70%)',
          ].join(', ')
        }} />
      </div>

      <div className="relative z-10 py-2 md:py-2.5 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-4 md:gap-10 flex-wrap md:flex-nowrap">
            {clocks.map(clock => (
              <Clock key={clock.key} label={clock.label} icon={clock.icon} values={clock.values} />
            ))}

            {/* Rat next to the clocks */}
            <div className="hidden lg:block relative shrink-0">
              <SprayPaintRat />
            </div>
          </div>

          {/* Spray paint splatter accents */}
          <div className="spray-splatters" aria-hidden="true">
            <div className="splatter splatter-1" />
            <div className="splatter splatter-2" />
            <div className="splatter splatter-3" />
            <div className="splatter splatter-4" />
            <div className="splatter splatter-5" />
            <div className="splatter splatter-6" />
          </div>
        </div>
      </div>
    </section>
  )
}

export function CountdownTimer() {
  const [targets, setTargets] = useState<CountdownTarget[]>([])
  const [resolved, setResolved] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  useEffect(() => {
    let active = true
    fetchCountdownTargets().then(result => {
      if (!active) return
      setTargets(result)
      setResolved(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (targets.length === 0) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [targets])

  if (!mounted || !resolved) {
    return <CountdownDisplay clocks={[{ key: 'placeholder', icon: '💣', label: 'This page will self destruct' }]} />
  }

  // Information stage: nothing is coming up, so don't count down to anything.
  if (targets.length === 0) return null

  return (
    <CountdownDisplay
      clocks={targets.map(target => ({
        key: target.id,
        label: target.label,
        icon: '🔥',
        values: getTimeLeft(target.date, now),
      }))}
    />
  )
}
