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

/* Stylized rat with hoodie, spray can, and NYC Deli logo on back */
function SprayPaintRat() {
  return (
    <div className="graffiti-rat-wrapper">
      {/* Spray mist particles coming from the can */}
      <div className="spray-mist">
        <div className="mist-particle mist-1" />
        <div className="mist-particle mist-2" />
        <div className="mist-particle mist-3" />
        <div className="mist-particle mist-4" />
        <div className="mist-particle mist-5" />
      </div>
      <svg
        viewBox="0 0 200 320"
        className="graffiti-rat"
        aria-label="Stylized rat with spray paint can"
      >
        {/* Tail - long curved */}
        <path
          d="M 55 290 Q 20 310, 10 280 Q 0 250, 25 260 Q 35 265, 55 280"
          fill="none"
          stroke="#8B7355"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Back leg */}
        <ellipse cx="75" cy="285" rx="18" ry="12" fill="#6B5B45" />
        <rect x="62" y="290" width="12" height="22" rx="5" fill="#6B5B45" />
        <ellipse cx="65" cy="312" rx="10" ry="5" fill="#5A4A3A" />

        {/* Front leg (visible) */}
        <rect x="105" y="272" width="10" height="25" rx="4" fill="#6B5B45" />
        <ellipse cx="108" cy="297" rx="8" ry="4" fill="#5A4A3A" />

        {/* Body */}
        <ellipse cx="90" cy="260" rx="42" ry="35" fill="#7B6B55" />

        {/* Hoodie body - oversized streetwear style */}
        <path
          d="M 48 235 Q 45 220, 60 210 L 120 210 Q 135 220, 132 235 L 135 290 Q 130 300, 90 300 Q 50 300, 48 290 Z"
          fill="#333333"
          stroke="#222"
          strokeWidth="1.5"
        />
        {/* Hoodie kangaroo pocket */}
        <path
          d="M 65 265 Q 90 275, 115 265 L 115 280 Q 90 290, 65 280 Z"
          fill="#2a2a2a"
          stroke="#444"
          strokeWidth="0.8"
        />

        {/* NYC DELI logo on the back of hoodie */}
        <g transform="translate(90, 240)">
          {/* Logo background circle */}
          <circle cx="0" cy="0" r="18" fill="#1a1a1a" stroke="#fccc0a" strokeWidth="1.5" />
          {/* NYC text */}
          <text
            x="0"
            y="-4"
            textAnchor="middle"
            fill="#fccc0a"
            fontSize="9"
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
            letterSpacing="1"
          >
            NYC
          </text>
          {/* DELI text */}
          <text
            x="0"
            y="6"
            textAnchor="middle"
            fill="#ee352e"
            fontSize="7"
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
            letterSpacing="0.5"
          >
            DELI
          </text>
          {/* RATS text */}
          <text
            x="0"
            y="14"
            textAnchor="middle"
            fill="#fccc0a"
            fontSize="5"
            fontFamily="Arial, sans-serif"
            letterSpacing="2"
          >
            RATS
          </text>
          {/* Small rat silhouette in logo */}
          <path
            d="M -6 -12 Q -4 -15, -2 -12 Q 0 -10, 2 -12 Q 4 -15, 6 -12 L 4 -10 Q 0 -8, -4 -10 Z"
            fill="#fccc0a"
          />
        </g>

        {/* Hoodie wrinkle details */}
        <path d="M 60 240 Q 65 245, 60 255" fill="none" stroke="#444" strokeWidth="0.8" />
        <path d="M 120 240 Q 115 248, 120 258" fill="none" stroke="#444" strokeWidth="0.8" />
        <path d="M 75 295 Q 85 298, 95 295" fill="none" stroke="#444" strokeWidth="0.6" />

        {/* Hood (pulled back, bunched at neck) */}
        <path
          d="M 60 210 Q 55 195, 65 190 Q 90 183, 115 190 Q 125 195, 120 210"
          fill="#3a3a3a"
          stroke="#222"
          strokeWidth="1"
        />
        <path
          d="M 68 205 Q 90 198, 112 205"
          fill="none"
          stroke="#444"
          strokeWidth="0.8"
        />

        {/* Neck */}
        <rect x="82" y="190" width="16" height="15" rx="6" fill="#7B6B55" />

        {/* Head - angular rat face */}
        <ellipse cx="90" cy="170" rx="28" ry="25" fill="#8B7B65" />
        {/* Snout - elongated */}
        <ellipse cx="90" cy="185" rx="14" ry="10" fill="#9B8B75" />
        <ellipse cx="90" cy="192" rx="6" ry="4" fill="#333" />
        {/* Nostrils */}
        <circle cx="87" cy="191" r="1.5" fill="#111" />
        <circle cx="93" cy="191" r="1.5" fill="#111" />

        {/* Eyes - streetwise, slightly narrowed */}
        <g>
          {/* Left eye */}
          <ellipse cx="78" cy="168" rx="7" ry="5" fill="#111" />
          <ellipse cx="79" cy="167" rx="3" ry="2.5" fill="#f5f5f5" />
          <circle cx="80" cy="167" r="1.2" fill="#111" />
          {/* Right eye */}
          <ellipse cx="102" cy="168" rx="7" ry="5" fill="#111" />
          <ellipse cx="101" cy="167" rx="3" ry="2.5" fill="#f5f5f5" />
          <circle cx="100" cy="167" r="1.2" fill="#111" />
        </g>

        {/* Eyebrow attitude marks */}
        <line x1="72" y1="160" x2="82" y2="162" stroke="#6B5B45" strokeWidth="2" strokeLinecap="round" />
        <line x1="108" y1="162" x2="98" y2="160" stroke="#6B5B45" strokeWidth="2" strokeLinecap="round" />

        {/* Ears - large and round */}
        <ellipse cx="65" cy="148" rx="14" ry="16" fill="#8B7B65" stroke="#6B5B45" strokeWidth="1" />
        <ellipse cx="65" cy="148" rx="8" ry="10" fill="#C4A882" />
        <ellipse cx="115" cy="148" rx="14" ry="16" fill="#8B7B65" stroke="#6B5B45" strokeWidth="1" />
        <ellipse cx="115" cy="148" rx="8" ry="10" fill="#C4A882" />

        {/* Whiskers */}
        <line x1="60" y1="183" x2="40" y2="178" stroke="#AAA" strokeWidth="0.8" />
        <line x1="60" y1="187" x2="38" y2="187" stroke="#AAA" strokeWidth="0.8" />
        <line x1="60" y1="191" x2="40" y2="196" stroke="#AAA" strokeWidth="0.8" />
        <line x1="120" y1="183" x2="140" y2="178" stroke="#AAA" strokeWidth="0.8" />
        <line x1="120" y1="187" x2="142" y2="187" stroke="#AAA" strokeWidth="0.8" />
        <line x1="120" y1="191" x2="140" y2="196" stroke="#AAA" strokeWidth="0.8" />

        {/* Arm holding spray can - extended to the left, spraying */}
        <path
          d="M 52 240 Q 30 225, 15 215 Q 8 210, 5 205"
          fill="none"
          stroke="#333"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Hoodie sleeve */}
        <path
          d="M 52 240 Q 38 230, 25 222"
          fill="none"
          stroke="#333"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Paw/hand */}
        <circle cx="12" cy="208" r="8" fill="#8B7B65" />
        <circle cx="6" cy="205" r="3" fill="#7B6B55" />
        <circle cx="10" cy="202" r="3" fill="#7B6B55" />
        <circle cx="15" cy="201" r="3" fill="#7B6B55" />

        {/* Spray can */}
        <g transform="translate(2, 190) rotate(-30)">
          {/* Can body */}
          <rect x="-6" y="-25" width="14" height="32" rx="3" fill="#ee352e" />
          {/* Can cap/nozzle */}
          <rect x="-3" y="-32" width="8" height="8" rx="2" fill="#ccc" />
          <rect x="0" y="-36" width="3" height="5" rx="1" fill="#999" />
          {/* Can label */}
          <rect x="-4" y="-18" width="10" height="14" rx="1" fill="#fff" opacity="0.3" />
          <text x="1" y="-8" textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">RAT</text>
          {/* Can bottom */}
          <ellipse cx="1" cy="7" rx="7" ry="2" fill="#cc2200" />
        </g>

        {/* Spray paint stream from nozzle */}
        <g opacity="0.6">
          <circle cx="-8" cy="168" r="3" fill="#ee352e" opacity="0.4" />
          <circle cx="-14" cy="162" r="4" fill="#ee352e" opacity="0.3" />
          <circle cx="-6" cy="160" r="2" fill="#ee352e" opacity="0.5" />
          <circle cx="-18" cy="158" r="5" fill="#ee352e" opacity="0.2" />
        </g>

        {/* Other arm - tucked / relaxed */}
        <path
          d="M 130 240 Q 138 255, 132 270"
          fill="none"
          stroke="#333"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <circle cx="132" cy="272" r="6" fill="#8B7B65" />
      </svg>
    </div>
  )
}

function CountdownDisplay({ values, placeholder }: {
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
      {/* Brick wall background with overlay */}
      <div className="absolute inset-0">
        <Image
          src="/Images/nyc/brick-wall.jpg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-black/40" />
        {/* Grime overlay */}
        <div className="absolute inset-0 nyc-grime" />
      </div>

      <div className="relative z-10 py-10 md:py-14 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Graffiti title */}
          <h2 className="graffiti-title text-center mb-8 md:mb-10">
            <span className="graffiti-text-main">
              💣 THIS PAGE WILL SELF-DESTRUCT IN:
            </span>
          </h2>

          {/* Countdown numbers + rat container */}
          <div className="flex items-end justify-center gap-2 sm:gap-3 md:gap-5">
            {/* The countdown numbers */}
            <div className="flex items-end gap-2 sm:gap-3 md:gap-5">
              {items.map(({ value, label }, i) => (
                <div key={label} className="flex flex-col items-center">
                  <div className="graffiti-number-block">
                    <span className="graffiti-number">
                      {typeof value === 'number' ? String(value).padStart(2, '0') : value}
                    </span>
                    {/* Paint drip effects under each number */}
                    <div className="graffiti-drips">
                      <div className="drip drip-1" />
                      <div className="drip drip-2" />
                      {i % 2 === 0 && <div className="drip drip-3" />}
                    </div>
                  </div>
                  <span className="graffiti-label">{label}</span>
                  {/* Colon separator */}
                  {i < items.length - 1 && (
                    <span className="graffiti-colon" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>

            {/* Rat standing next to seconds */}
            <div className="hidden sm:block relative -mb-2 ml-1 md:ml-3">
              <SprayPaintRat />
            </div>
          </div>

          {/* Spray paint splatter accents */}
          <div className="spray-splatters" aria-hidden="true">
            <div className="splatter splatter-1" />
            <div className="splatter splatter-2" />
            <div className="splatter splatter-3" />
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
        <div className="absolute inset-0">
          <Image
            src="/Images/nyc/brick-wall.jpg"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 py-14 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="graffiti-text-main text-4xl md:text-6xl animate-pulse">
              💥 BOOM. SEE YOU ON THE PLAYA. 💥
            </h2>
          </div>
        </div>
      </section>
    )
  }

  return <CountdownDisplay values={timeLeft} />
}
