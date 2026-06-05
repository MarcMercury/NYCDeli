'use client'

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { CampSpotWithReservation, SpotSize } from '@/types/database'
import { doesTentFitSpot } from '@/lib/camp-spots'

// Color map per spot state
const spotColors = {
  available: 'bg-emerald-100 border-emerald-500 hover:bg-emerald-200 cursor-pointer',
  reserved: 'bg-red-100 border-red-400 cursor-not-allowed opacity-70',
  joinable: 'bg-orange-100 border-orange-400 hover:bg-orange-200 cursor-pointer',
  yours: 'bg-yellow-300 border-yellow-600 hover:bg-yellow-400 cursor-pointer ring-2 ring-yellow-600',
  selected: 'bg-blue-300 border-blue-600 ring-2 ring-blue-600',
  tooSmall: 'bg-orange-100 border-orange-400 cursor-not-allowed opacity-50',
  tooBig: 'bg-orange-100 border-orange-400 cursor-not-allowed opacity-50',
  unavailable: 'bg-gray-200 border-gray-400 cursor-not-allowed opacity-40',
}

const sizeLabels: Record<SpotSize, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
  xlarge: 'XL',
}

const sizeBadgeColors: Record<SpotSize, string> = {
  small: 'bg-blue-200 text-blue-800',
  medium: 'bg-green-200 text-green-800',
  large: 'bg-purple-200 text-purple-800',
  xlarge: 'bg-pink-200 text-pink-800',
}

interface SpotGridProps {
  spots: CampSpotWithReservation[]
  currentCamperId: string | null
  currentTentWidth: number | null
  currentTentLength: number | null
  selectedSpotId: string | null
  onSelectSpot: (spot: CampSpotWithReservation) => void
  isAdmin?: boolean
}

export function SpotGrid({
  spots,
  currentCamperId,
  currentTentWidth,
  currentTentLength,
  selectedSpotId,
  onSelectSpot,
  isAdmin = false,
}: SpotGridProps) {
  const [hoveredSpot, setHoveredSpot] = useState<CampSpotWithReservation | null>(null)

  // Group spots by row (memoized — only changes when spots change)
  const sortedRows = useMemo(() => {
    const rows = new Map<string, CampSpotWithReservation[]>()
    for (const spot of spots) {
      const existing = rows.get(spot.row_label) ?? []
      existing.push(spot)
      rows.set(spot.row_label, existing)
    }
    return Array.from(rows.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [spots])

  function getSpotState(spot: CampSpotWithReservation) {
    if (!spot.is_available) return 'unavailable'
    if (spot.reservations.some(r => r.camper_id === currentCamperId)) return 'yours'
    if (spot.id === selectedSpotId) return 'selected'
    if (spot.reservations.length >= spot.max_occupants) return 'reserved'

    // Check tent fit (only for non-admin camper selection)
    if (!isAdmin && currentTentWidth != null && currentTentLength != null) {
      const fitCheck = doesTentFitSpot(currentTentWidth, currentTentLength, spot)
      if (!fitCheck.fits) {
        return currentTentWidth > spot.max_tent_width_ft || currentTentLength > spot.max_tent_length_ft
          ? 'tooBig'
          : 'tooSmall'
      }
    }

    if (spot.reservations.length > 0) return 'joinable'
    return 'available'
  }

  function getTooltip(spot: CampSpotWithReservation, state: string) {
    const base = `${spot.label} — ${spot.spot_width_ft}×${spot.spot_length_ft}ft (${spot.size_category.toUpperCase()})`
    const names = spot.campers.map(c => c.playa_name || c.full_name).join(', ')
    if (state === 'yours') return `${base}\n🏕️ YOUR SPOT — Click to release`
    if (state === 'reserved') return `${base}\n🔒 Full (${spot.reservations.length}/${spot.max_occupants}): ${names}`
    if (state === 'joinable') return `${base}\n🤝 ${names} — ${spot.max_occupants - spot.reservations.length} spot(s) open. Click to join!`
    if (state === 'tooBig') return `${base}\n⚠️ Your tent is too large for this spot`
    if (state === 'tooSmall') return `${base}\n⚠️ Your tent is too small for this spot`
    if (state === 'unavailable') return `${base}\n🚫 Not available`
    if (state === 'selected') return `${base}\n✅ Selected — Confirm to reserve`
    return `${base}\n✅ Available — Click to select`
  }

  function handleClick(spot: CampSpotWithReservation, state: string) {
    if (isAdmin) {
      onSelectSpot(spot)
      return
    }
    if (state === 'available' || state === 'yours' || state === 'selected' || state === 'joinable') {
      onSelectSpot(spot)
    }
  }

  // Stats
  const { totalSpots, availableSpots, fullSpots } = useMemo(() => ({
    totalSpots: spots.length,
    availableSpots: spots.filter(s => s.is_available && s.reservations.length < s.max_occupants).length,
    fullSpots: spots.filter(s => s.reservations.length >= s.max_occupants).length,
  }), [spots])

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="flex flex-wrap gap-4 text-sm font-bold">
        <span className="px-3 py-1 bg-gray-100 border-2 border-black">
          Total: {totalSpots}
        </span>
        <span className="px-3 py-1 bg-emerald-100 border-2 border-emerald-600">
          Available: {availableSpots}
        </span>
        <span className="px-3 py-1 bg-red-100 border-2 border-red-500">
          Full: {fullSpots}
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs font-semibold">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-emerald-100 border-2 border-emerald-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-100 border-2 border-red-400" />
          <span>Full</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-orange-100 border-2 border-orange-400" />
          <span>Joinable</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-300 border-2 border-yellow-600" />
          <span>Your Spot</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-300 border-2 border-blue-600" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-orange-100 border-2 border-orange-400 opacity-50" />
          <span>Tent Doesn&apos;t Fit</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-200 border-2 border-gray-400 opacity-40" />
          <span>Unavailable</span>
        </div>
      </div>

      {/* Orientation Header (like airplane) */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-yellow-400 font-black uppercase tracking-wider text-sm">
          <span>🏕️</span>
          <span>Common Area / Kitchen</span>
          <span>🍳</span>
        </div>
        <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[10px] border-l-transparent border-r-transparent border-t-black mx-auto" />
      </div>

      {/* The Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px] space-y-2">
          {sortedRows.map(([rowLabel, rowSpots]) => (
            <div key={rowLabel} className="flex items-center gap-2">
              {/* Row label */}
              <div className="w-8 h-8 flex items-center justify-center bg-black text-yellow-400 font-black text-sm flex-shrink-0">
                {rowLabel}
              </div>

              {/* Spots in row */}
              <div className="flex gap-2 flex-1">
                {rowSpots.map((spot) => {
                  const state = getSpotState(spot)
                  const tooltip = getTooltip(spot, state)
                  const isClickable = isAdmin || state === 'available' || state === 'yours' || state === 'selected' || state === 'joinable'

                  return (
                    <button
                      key={spot.id}
                      title={tooltip}
                      onClick={() => handleClick(spot, state)}
                      onMouseEnter={() => setHoveredSpot(spot)}
                      onMouseLeave={() => setHoveredSpot(null)}
                      disabled={!isClickable}
                      className={cn(
                        'relative flex flex-col items-center justify-center border-2 transition-all',
                        'min-w-[64px] min-h-[56px] p-1',
                        spotColors[state as keyof typeof spotColors] ?? spotColors.available,
                        isClickable && 'hover:scale-105 active:scale-95',
                        spot.id === selectedSpotId && 'animate-pulse',
                      )}
                      style={{
                        width: `${Math.max(64, spot.spot_width_ft * 5)}px`,
                      }}
                    >
                      {/* Spot number */}
                      <span className="font-black text-xs leading-none">{spot.label}</span>

                      {/* Size badge */}
                      <span className={cn(
                        'text-[9px] font-bold px-1 rounded mt-0.5',
                        sizeBadgeColors[spot.size_category],
                      )}>
                        {sizeLabels[spot.size_category]}
                      </span>

                      {/* Feature dots */}
                      <div className="flex gap-0.5 mt-0.5">
                        {spot.has_power && <span className="text-[8px]" title="Power">⚡</span>}
                        {spot.has_shade && <span className="text-[8px]" title="Shade">⛱️</span>}
                        {spot.is_accessible && <span className="text-[8px]" title="Accessible">♿</span>}
                      </div>

                      {/* Occupancy indicator */}
                      {spot.reservations.length > 0 && (
                        <div className="text-[7px] font-bold mt-0.5">
                          {spot.reservations.length}/{spot.max_occupants}
                        </div>
                      )}

                      {/* Full indicator */}
                      {state === 'reserved' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-red-500 text-lg font-black opacity-30">✕</span>
                        </div>
                      )}

                      {/* Your spot indicator */}
                      {state === 'yours' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 border border-black rounded-full flex items-center justify-center">
                          <span className="text-[8px]">🏕️</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Row label (right side) */}
              <div className="w-8 h-8 flex items-center justify-center bg-black text-yellow-400 font-black text-sm flex-shrink-0">
                {rowLabel}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom orientation */}
      <div className="text-center">
        <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-b-[10px] border-l-transparent border-r-transparent border-b-gray-400 mx-auto" />
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-600 font-bold uppercase tracking-wider text-sm">
          <span>🔇</span>
          <span>Quiet Zone / Camp Boundary</span>
          <span>🔇</span>
        </div>
      </div>

      {/* Hover Detail Panel */}
      {hoveredSpot && (
        <div className="fixed bottom-4 right-4 z-50 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 max-w-xs">
          <div className="font-black text-lg">{hoveredSpot.label}</div>
          <div className="text-sm space-y-1 mt-1">
            <p>Size: <span className="font-bold">{hoveredSpot.spot_width_ft}×{hoveredSpot.spot_length_ft}ft</span> ({hoveredSpot.size_category})</p>
            <p>Tent range: {hoveredSpot.min_tent_width_ft}-{hoveredSpot.max_tent_width_ft}ft W × {hoveredSpot.min_tent_length_ft}-{hoveredSpot.max_tent_length_ft}ft L</p>
            <p>Occupancy: <span className="font-bold">{hoveredSpot.reservations.length}/{hoveredSpot.max_occupants}</span></p>
            <div className="flex gap-2 text-xs">
              {hoveredSpot.has_power && <span className="px-1 bg-yellow-100 border border-yellow-500">⚡ Power</span>}
              {hoveredSpot.has_shade && <span className="px-1 bg-blue-100 border border-blue-500">⛱️ Shade</span>}
              {hoveredSpot.is_accessible && <span className="px-1 bg-purple-100 border border-purple-500">♿ Accessible</span>}
            </div>
            {hoveredSpot.campers.length > 0 && (
              <div className="text-red-600 font-bold">
                {hoveredSpot.campers.map(c => c.playa_name || c.full_name).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
