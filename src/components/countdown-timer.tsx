'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import Image from 'next/image'

const TARGET_DATE = new Date('2026-08-30T00:00:00-07:00') // Aug 30, 2026 PDT (Black Rock City time)

function getTimeLeft() {
  const now = new Date()
  const diff = TARGET_DATE.getTime() - now.getTime()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, expired: false }
}

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

function CountdownDisplay({ values }: {
  values?: { days: number; hours: number; minutes: number; seconds: number };
  placeholder?: boolean;
}) {
  const items = values
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

      <div className="relative z-10 py-4 md:py-5 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Single-line: title + countdown + rat */}
          <div className="flex items-center justify-center gap-3 md:gap-6 flex-wrap md:flex-nowrap">
            {/* Graffiti title */}
            <h2 className="graffiti-title shrink-0">
              <span className="graffiti-text-compact">
                💣 This page will self destruct in:
              </span>
            </h2>

            {/* Countdown numbers */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
              {items.map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center">
                  <div className="graffiti-number-block-compact">
                    <span className="graffiti-number-compact">
                      {typeof value === 'number' ? String(value).padStart(2, '0') : value}
                    </span>
                  </div>
                  <span className="graffiti-label-compact">{label}</span>
                </div>
              ))}
            </div>

            {/* Rat next to countdown */}
            <div className="hidden sm:block relative shrink-0">
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
  const [timeLeft, setTimeLeft] = useState(getTimeLeft)
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) {
    return <CountdownDisplay placeholder />
  }

  if (timeLeft.expired) {
    return (
      <section className="countdown-brick-wall relative overflow-hidden border-b-4 border-black">
        <div className="absolute inset-0 bg-black">
          <div className="absolute inset-0 nyc-grime" />
        </div>
        <div className="relative z-10 py-4 md:py-5 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="graffiti-text-main text-2xl md:text-4xl animate-pulse">
              💥 BOOM. SEE YOU ON THE PLAYA. 💥
            </h2>
          </div>
        </div>
      </section>
    )
  }

  return <CountdownDisplay values={timeLeft} />
}
