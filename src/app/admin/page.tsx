'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Card, CardContent, Alert } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { fetchDeliSummary, type DeliSummary } from '@/lib/events'

function SummaryStat({ value, label, hint }: { value: ReactNode; label: string; hint: string }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-3xl font-black">{value}</p>
        <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
        <p className="text-[11px] text-gray-400 truncate" title={hint}>{hint}</p>
      </CardContent>
    </Card>
  )
}

/** Admin tools grouped by the job being done, not by when they were built. */
const ADMIN_GROUPS: {
  title: string
  blurb: string
  links: { href: string; icon: string; label: string; hint: string }[]
}[] = [
  {
    title: 'Run the Event',
    blurb: 'lifecycle, applications and crews',
    links: [
      { href: '/admin/events', icon: '🎪', label: 'Event Management', hint: 'Create, stage, archive events' },
      { href: '/admin/people', icon: '🗂️', label: 'People & Users', hint: 'Directory, access, approvals' },
      { href: '/admin/applicants', icon: '📝', label: 'Applicants', hint: 'Review and approve' },
      { href: '/events?view=calendar', icon: '🗓️', label: 'Camp Calendar', hint: 'Meetings & deadlines' },
    ],
  },
  {
    title: 'Kitchen & Shifts',
    blurb: 'who works when',
    links: [
      { href: '/admin/kitchen-shifts', icon: '🍳', label: 'Kitchen Shift Builder', hint: 'Positions, times, roles' },
      { href: '/admin/shift-draft', icon: '🎯', label: 'Shift Draft', hint: 'Rank, draft, publish' },
    ],
  },
  {
    title: 'People',
    blurb: 'the permanent record',
    links: [
      { href: '/admin/ideas', icon: '💡', label: 'Forum', hint: 'Ideas & questions' },
    ],
  },
  {
    title: 'Camp Assets & Setup',
    blurb: 'what gets built and what the public sees',
    links: [
      { href: '/admin/layout-builder', icon: '🗺️', label: 'Layout Builder', hint: 'Place everything' },
      { href: '/admin/staking-plan', icon: '🚩', label: 'Staking Plan', hint: 'Print for the field' },
      { href: '/admin/tent-map', icon: '⛺', label: 'Tent Map', hint: 'Who sleeps where' },
      { href: '/admin/home', icon: '🏠', label: 'Home Page', hint: 'Public CTAs' },
    ],
  },
]

export default function AdminPage() {
  const [summary, setSummary] = useState<DeliSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({})
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const errors: Record<string, string> = {}

    const summaryData = await fetchDeliSummary(supabase).catch(() => null)
    if (!summaryData) errors.summary = 'Could not load the Deli summary'

    setSummary(summaryData)
    setFetchErrors(errors)
    setLastRefreshed(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <p className="font-bold uppercase tracking-wider">Loading Admin Panel...</p>
          <p className="text-sm text-gray-600">With great power comes great spreadsheets</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-2">
            Admin Control
          </h1>
          <p className="text-gray-600">
            Override responsibly. Or don&apos;t. You&apos;re the admin.
          </p>
        </div>

        {/* Warning */}
        <Alert variant="warning" className="mb-8">
          <strong>Admin Mode Active.</strong> Changes here affect the live system. 
          Think before you click. Data has feelings.
        </Alert>

        {/* Data Connection Status */}
        {Object.keys(fetchErrors).length > 0 && (
          <Alert variant="error" className="mb-4">
            <strong>Data fetch errors:</strong>{' '}
            {Object.entries(fetchErrors).map(([key, msg]) => (
              <span key={key} className="block text-sm">
                {key}: {msg}
              </span>
            ))}
            <button className="ml-2 underline" onClick={() => fetchData()}>Retry</button>
          </Alert>
        )}

        {/* Deli Summary */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${Object.keys(fetchErrors).length === 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              Deli Summary{Object.keys(fetchErrors).length > 0 && ' — Partial Data'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-gray-400">
                Updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              className="text-xs underline text-gray-500 hover:text-black"
              onClick={() => fetchData()}
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryStat
            value={summary?.totalCampers ?? '⚠'}
            label="Total Campers"
            hint="Every event, all time"
          />
          <SummaryStat
            value={summary ? summary.activeEventCampers : '⚠'}
            label="Campers On-Event"
            hint={summary?.activeEvent?.name ?? 'No event running'}
          />
          <SummaryStat
            value={summary ? summary.openEventApplications : '⚠'}
            label="Applications"
            hint={summary?.openEvent?.name ?? 'Applications closed'}
          />
          <SummaryStat
            value={summary?.daysUntilNextApplicationEvent ?? '—'}
            label="Days To Next Event"
            hint={summary?.nextApplicationEvent?.name ?? 'Nothing needing applicants'}
          />
        </div>

        <div className="space-y-6 mb-8">
          {ADMIN_GROUPS.map(group => (
            <section key={group.title}>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] border-b-2 border-black pb-1 mb-3">
                {group.title}
                <span className="ml-2 font-bold normal-case tracking-normal text-gray-500">{group.blurb}</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {group.links.map(link => (
                  <Link key={link.href} href={link.href} className="block">
                    <Card className="hover:border-yellow-500 transition-colors h-full">
                      <CardContent className="py-4 text-center">
                        <p className="text-3xl font-black">{link.icon}</p>
                        <p className="text-xs uppercase tracking-wider text-yellow-700 font-bold">{link.label}</p>
                        <p className="text-[11px] text-gray-500 mt-1">{link.hint}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

      </div>
    </div>
  )
}
