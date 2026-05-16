'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Alert } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import type { Camper } from '@/types/database'

interface PlacedCamper extends Camper {
  displayX: number
  displayY: number
  displayWidth: number
  displayHeight: number
}

// Camp dimensions in feet
const CAMP_WIDTH = 150
const CAMP_LENGTH = 300
const MIN_SPACING = 3
const GRID_SIZE = 10 // 10ft grid

// Colors for different shelter types
const shelterColors: Record<string, string> = {
  tent: 'bg-blue-400 border-blue-600',
  shiftpod: 'bg-purple-400 border-purple-600',
  rv: 'bg-orange-400 border-orange-600',
  vehicle: 'bg-gray-400 border-gray-600',
  other: 'bg-green-400 border-green-600',
}

// Zone definitions
const zones = [
  { id: 'kitchen', name: 'Kitchen', x: 0, y: 0, width: 40, height: 30, color: 'bg-yellow-200 border-yellow-500' },
  { id: 'common', name: 'Common Area', x: 40, y: 0, width: 70, height: 30, color: 'bg-green-200 border-green-500' },
  { id: 'shade', name: 'Shade Structure', x: 110, y: 0, width: 40, height: 30, color: 'bg-blue-200 border-blue-500' },
]

// Simple auto-placement algorithm (defined outside component to avoid reference-before-declaration)
function autoPlaceCampers(camperList: Camper[]): PlacedCamper[] {
  const placed: PlacedCamper[] = []
  let currentX = MIN_SPACING
  let currentY = 40 // Start below the fixed zones
  let rowHeight = 0

  for (const camper of camperList) {
    const width = camper.shelter_length_ft
    const height = camper.shelter_width_ft

    // Use existing position if available
    if (camper.layout_x !== null && camper.layout_y !== null) {
      placed.push({
        ...camper,
        displayX: camper.layout_x,
        displayY: camper.layout_y,
        displayWidth: width,
        displayHeight: height,
      })
      continue
    }

    // Check if fits in current row
    if (currentX + width + MIN_SPACING > CAMP_WIDTH) {
      // Move to next row
      currentX = MIN_SPACING
      currentY += rowHeight + MIN_SPACING
      rowHeight = 0
    }

    // Check if fits in camp
    if (currentY + height > CAMP_LENGTH) {
      console.warn(`Camp is full! Cannot place ${camper.full_name}`)
      continue
    }

    placed.push({
      ...camper,
      displayX: currentX,
      displayY: currentY,
      displayWidth: width,
      displayHeight: height,
    })

    currentX += width + MIN_SPACING
    rowHeight = Math.max(rowHeight, height)
  }

  return placed
}

export default function LayoutPage() {
  const [campers, setCampers] = useState<PlacedCamper[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCamper, setSelectedCamper] = useState<PlacedCamper | null>(null)
  const [showLayers, setShowLayers] = useState({
    tents: true,
    shade: true,
    kitchen: true,
    zones: true,
    grid: true,
  })
  const [viewScale, setViewScale] = useState(2) // pixels per foot

  const fetchCampers = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('campers')
      .select('*')
      .order('arrival_date', { ascending: true })

    if (error) {
      console.error('Error fetching campers:', error)
      return
    }

    // Auto-place campers that don't have positions
    const placed = autoPlaceCampers(data || [])
    setCampers(placed)
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchCampers()
  }, [fetchCampers])

  const toggleLayer = (layer: keyof typeof showLayers) => {
    setShowLayers(prev => ({ ...prev, [layer]: !prev[layer] }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <p className="font-bold uppercase tracking-wider">Loading Layout...</p>
          <p className="text-sm text-gray-600">Calculating spatial harmony</p>
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
            Camp Layout
          </h1>
          <p className="text-gray-600">
            Where you&apos;ll sleep (if you measured correctly).
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Zoom */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2">Zoom</p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setViewScale(Math.max(1, viewScale - 0.5))}
                    >
                      −
                    </Button>
                    <span className="flex-1 text-center py-1.5 border-2 border-black bg-gray-100 text-sm">
                      {viewScale}x
                    </span>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setViewScale(Math.min(4, viewScale + 0.5))}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Layers */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2">Layers</p>
                  <div className="space-y-2">
                    {Object.entries(showLayers).map(([key, value]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={() => toggleLayer(key as keyof typeof showLayers)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm capitalize">{key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Campers:</span>
                    <span className="font-bold">{campers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Placed:</span>
                    <span className="font-bold text-green-600">{campers.filter(c => c.displayX > 0).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Camp Size:</span>
                    <span className="font-bold">{CAMP_WIDTH} × {CAMP_LENGTH} ft</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader>
                <CardTitle>Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(shelterColors).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className={cn('w-4 h-4 border-2', color)} />
                      <span className="text-sm capitalize">{type}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Selected Camper */}
            {selectedCamper && (
              <Card variant="warning">
                <CardHeader>
                  <CardTitle>{selectedCamper.playa_name || selectedCamper.full_name}</CardTitle>
                  <CardDescription>{selectedCamper.full_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Shelter:</span>
                      <Badge>{selectedCamper.shelter_type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{selectedCamper.shelter_length_ft} × {selectedCamper.shelter_width_ft} ft</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Position:</span>
                      <span>({selectedCamper.displayX.toFixed(0)}, {selectedCamper.displayY.toFixed(0)})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Power:</span>
                      <Badge variant={selectedCamper.power_required ? 'warning' : 'default'}>
                        {selectedCamper.power_required ? selectedCamper.power_type : 'None'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Map View */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Camp Map</CardTitle>
                <CardDescription>
                  {CAMP_WIDTH}ft × {CAMP_LENGTH}ft — Click a tent to see details
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-auto">
                <div 
                  className="relative bg-amber-100 border-4 border-black"
                  style={{ 
                    width: CAMP_WIDTH * viewScale,
                    height: CAMP_LENGTH * viewScale,
                    backgroundImage: showLayers.grid ? 
                      `linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                       linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)` : 'none',
                    backgroundSize: `${GRID_SIZE * viewScale}px ${GRID_SIZE * viewScale}px`,
                  }}
                >
                  {/* Zones */}
                  {showLayers.zones && zones.map(zone => (
                    <div
                      key={zone.id}
                      className={cn(
                        'absolute border-2 flex items-center justify-center',
                        zone.color,
                        showLayers.kitchen || zone.id !== 'kitchen' ? 'opacity-60' : 'opacity-20'
                      )}
                      style={{
                        left: zone.x * viewScale,
                        top: zone.y * viewScale,
                        width: zone.width * viewScale,
                        height: zone.height * viewScale,
                      }}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-black/50">
                        {zone.name}
                      </span>
                    </div>
                  ))}

                  {/* Camper Tents */}
                  {showLayers.tents && campers.map(camper => (
                    <div
                      key={camper.id}
                      className={cn(
                        'absolute border-2 cursor-pointer transition-all hover:z-10 hover:scale-105',
                        'flex items-center justify-center text-xs font-bold text-white',
                        shelterColors[camper.shelter_type] || shelterColors.other,
                        selectedCamper?.id === camper.id && 'ring-4 ring-yellow-400 z-20',
                        camper.placement_locked && 'ring-2 ring-red-500'
                      )}
                      style={{
                        left: camper.displayX * viewScale,
                        top: camper.displayY * viewScale,
                        width: camper.displayWidth * viewScale,
                        height: camper.displayHeight * viewScale,
                      }}
                      onClick={() => setSelectedCamper(camper)}
                      title={`${camper.playa_name || camper.full_name} (${camper.shelter_length_ft}×${camper.shelter_width_ft}ft)`}
                    >
                      {camper.displayWidth * viewScale > 30 && (
                        <span className="text-[10px] truncate px-1">
                          {getInitials(camper.playa_name || camper.full_name)}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Compass */}
                  <div className="absolute top-2 right-2 bg-white/80 border-2 border-black p-2 text-xs">
                    <div className="text-center font-bold">N</div>
                    <div className="flex justify-between">
                      <span>W</span>
                      <span className="mx-2">⊕</span>
                      <span>E</span>
                    </div>
                    <div className="text-center font-bold">S</div>
                  </div>

                  {/* Scale */}
                  <div className="absolute bottom-2 left-2 bg-white/80 border-2 border-black px-2 py-1 text-xs font-bold">
                    {GRID_SIZE}ft
                    <div 
                      className="h-1 bg-black mt-1" 
                      style={{ width: GRID_SIZE * viewScale }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* No data alert */}
            {campers.length === 0 && (
              <Alert variant="info" className="mt-4">
                No campers registered yet. The layout will populate as people register.
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
