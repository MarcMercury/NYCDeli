'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const FEATURE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen & shifts',
  layout: 'Camp map & layout',
  build_week: 'Build week',
  shift_draft: 'Shift draft',
  directory: 'Participant directory',
  inventory: 'Inventory',
  electrical: 'Electrical load',
  packing: 'Packing lists',
  tents: 'Housing & tents',
}

function Notice() {
  const feature = useSearchParams().get('unavailable')
  const [dismissed, setDismissed] = useState(false)
  if (!feature || dismissed) return null

  return (
    <div className="bg-[#fccc0a] border-b-4 border-black px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-black">
          {FEATURE_LABELS[feature] ?? 'That section'} isn&apos;t part of the current NYC Deli event.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="text-sm font-black uppercase tracking-wider text-black"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/** Explains the redirect when someone opens a module this event doesn't use. */
export function FeatureUnavailableNotice() {
  return (
    <Suspense fallback={null}>
      <Notice />
    </Suspense>
  )
}
