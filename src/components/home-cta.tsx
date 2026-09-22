'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchEvents } from '@/lib/events'
import { fetchHomeCtaConfig, resolveHomeCtas, type HomeCtaConfig, type ResolvedCta } from '@/lib/home-cta'
import type { EventRow } from '@/types/database'

const HERO_STYLES = {
  primary:
    'inline-flex items-center px-8 py-4 bg-[#fccc0a] text-black font-black tracking-wide text-lg uppercase hover:bg-[#ffd93d] transition-all border-2 border-[#fccc0a] shadow-[4px_4px_0px_0px_rgba(252,204,10,0.4)] hover:shadow-[2px_2px_0px_0px_rgba(252,204,10,0.4)] hover:translate-x-[2px] hover:translate-y-[2px]',
  secondary:
    'inline-flex items-center px-6 py-4 bg-transparent text-[#fccc0a] font-black tracking-wide text-sm uppercase hover:bg-[#fccc0a]/10 transition-all border-2 border-[#fccc0a]/60 hover:border-[#fccc0a]',
}

const JOIN_STYLES = {
  primary:
    'inline-flex items-center px-8 py-4 bg-black text-[#fccc0a] font-black tracking-wide text-lg uppercase hover:bg-gray-900 transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]',
  secondary:
    'inline-flex items-center px-6 py-4 bg-transparent text-black font-black tracking-wide text-sm uppercase hover:bg-black/10 transition-all border-2 border-black',
}

function useHomeCtas(placement: 'hero' | 'join') {
  const [ctas, setCtas] = useState<ResolvedCta[]>([])
  const [config, setConfig] = useState<HomeCtaConfig | null>(null)

  useEffect(() => {
    Promise.all([fetchHomeCtaConfig(), fetchEvents()]).then(([cfg, events]: [HomeCtaConfig, EventRow[]]) => {
      setConfig(cfg)
      setCtas(resolveHomeCtas(cfg, events, placement))
    })
  }, [placement])

  return { ctas, config }
}

/** Admin-managed buttons in the hero, alongside the fixed structural links. */
export function HeroCtas() {
  const { ctas } = useHomeCtas('hero')

  return (
    <>
      {ctas.map(cta => (
        <Link key={cta.key} href={cta.href} className={HERO_STYLES[cta.variant]}>
          {cta.label}
        </Link>
      ))}
    </>
  )
}

/**
 * The "Ready to Join?" band. Heading, body and buttons are all admin-editable,
 * so it can describe whatever is actually open instead of one hard-coded burn.
 */
export function JoinSection() {
  const { ctas, config } = useHomeCtas('join')
  if (!config) return null

  return (
    <section className="relative py-16 px-4 overflow-hidden font-nunito">
      <div className="absolute inset-0 bg-[#fccc0a]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
      <div className="nyc-awning h-2 absolute top-0 left-0 right-0" />
      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-extrabold tracking-tight mb-4 text-black">{config.joinHeading}</h2>
        <p className="text-lg mb-8 text-black/80 leading-relaxed">{config.joinBody}</p>
        <div className="flex flex-wrap justify-center items-center gap-4">
          {ctas.map(cta => (
            <Link key={cta.key} href={cta.href} className={JOIN_STYLES[cta.variant]}>
              {cta.label}
            </Link>
          ))}
          <Link href="/events" className={JOIN_STYLES.secondary}>
            Browse All Events
          </Link>
        </div>
      </div>
    </section>
  )
}
