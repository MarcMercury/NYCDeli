'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'

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
    return (
      <section className="bg-red-600 border-b-4 border-black py-8 px-4 font-nunito">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-6">
            💣 This Page Will Self-Destruct In:
          </h2>
          <div className="flex justify-center gap-4 md:gap-8">
            {['Days', 'Hours', 'Min', 'Sec'].map((label) => (
              <div key={label} className="flex flex-col items-center">
                <div className="bg-black text-red-400 font-mono text-3xl md:text-5xl font-bold px-4 py-3 md:px-6 md:py-4 border-2 border-red-400 rounded-md min-w-[70px] md:min-w-[100px]">
                  --
                </div>
                <span className="text-xs md:text-sm font-semibold tracking-wide text-white/80 mt-2">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (timeLeft.expired) {
    return (
      <section className="bg-red-600 border-b-4 border-black py-8 px-4 font-nunito">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white animate-pulse">
            💥 BOOM. SEE YOU ON THE PLAYA. 💥
          </h2>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-red-600 border-b-4 border-black py-8 px-4 font-nunito">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-6">
          💣 This Page Will Self-Destruct In:
        </h2>
        <div className="flex justify-center gap-4 md:gap-8">
          {[
            { value: timeLeft.days, label: 'Days' },
            { value: timeLeft.hours, label: 'Hours' },
            { value: timeLeft.minutes, label: 'Min' },
            { value: timeLeft.seconds, label: 'Sec' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center">
              <div className="bg-black text-red-400 font-mono text-3xl md:text-5xl font-bold px-4 py-3 md:px-6 md:py-4 border-2 border-red-400 rounded-md min-w-[70px] md:min-w-[100px]">
                {String(value).padStart(2, '0')}
              </div>
              <span className="text-xs md:text-sm font-semibold tracking-wide text-white/80 mt-2">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
