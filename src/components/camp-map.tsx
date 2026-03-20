'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Alert, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { FloorplanConfigRow, FloorplanObjectRow, CampSpotWithReservation, CamperRow } from '@/types/database'
import { fetchActiveFloorplan, fetchFloorplanObjects } from '@/lib/floorplan'
import { fetchSpotsWithReservations, reserveSpot, releaseReservation, isCampSelectionEnabled, doesTentFitSpot } from '@/lib/camp-spots'
import { createClient } from '@/lib/supabase/client'
import { getTemplateForType } from '@/components/floorplan/object-templates'

type MapMode = 'explore' | 'reserve'

interface InfoPanelData {
  type: 'object' | 'spot'
  object?: FloorplanObjectRow
  spot?: CampSpotWithReservation
}

export function CampMap() {
  // Floorplan data
  const [config, setConfig] = useState<FloorplanConfigRow | null>(null)
  const [objects, setObjects] = useState<FloorplanObjectRow[]>([])
  const [spots, setSpots] = useState<CampSpotWithReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // User/camper identity
  const [camper, setCamper] = useState<CamperRow | null>(null)
  const [email, setEmail] = useState('')
  const [isIdentified, setIsIdentified] = useState(false)
  const [identifyLoading, setIdentifyLoading] = useState(false)
  const [selectionEnabled, setSelectionEnabled] = useState(false)

  // Map interaction
  const [mode, setMode] = useState<MapMode>('explore')
  const [scale, setScale] = useState(2.5)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [infoPanelData, setInfoPanelData] = useState<InfoPanelData | null>(null)
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Layers
  const [layers, setLayers] = useState({
    structures: true,
    kitchen: true,
    utilities: true,
    boundaries: true,
    tents: true,
  })

  const containerRef = useRef<HTMLDivElement>(null)

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [floorplan, selEnabled] = await Promise.all([
        fetchActiveFloorplan(),
        isCampSelectionEnabled(),
      ])

      setSelectionEnabled(selEnabled)

      if (!floorplan) {
        setError('No camp layout has been created yet. Check back later!')
        setLoading(false)
        return
      }

      setConfig(floorplan)

      const [objs, spotsData] = await Promise.all([
        fetchFloorplanObjects(floorplan.id),
        fetchSpotsWithReservations().catch(() => [] as CampSpotWithReservation[]),
      ])

      setObjects(objs)
      setSpots(spotsData)
    } catch {
      setError('Failed to load camp map data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Identify camper
  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIdentifyLoading(true)

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('campers')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .single()

      if (fetchError || !data) {
        setError('No camper found with that email. Register first!')
        return
      }

      setCamper(data as CamperRow)
      setIsIdentified(true)
      setMode('reserve')
    } catch {
      setError('Something went wrong looking you up.')
    } finally {
      setIdentifyLoading(false)
    }
  }

  // Pan handlers
  function handlePointerDown(e: React.PointerEvent) {
    // Only pan on middle mouse button or if clicking empty canvas space
    if (e.button === 1 || (e.button === 0 && (e.target as HTMLElement).dataset.canvas === 'true')) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
      e.preventDefault()
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }
  }

  function handlePointerUp() {
    setIsPanning(false)
  }

  // Zoom with mouse wheel
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.25 : 0.25
    setScale(prev => Math.max(0.5, Math.min(6, prev + delta)))
  }

  // Click on an object
  function handleObjectClick(obj: FloorplanObjectRow) {
    // Check if it's a reservable tent
    if (obj.properties?.reservable && mode === 'reserve') {
      // Try to find a matching camp spot for this tent
      const matchingSpot = findSpotForObject(obj)
      if (matchingSpot) {
        setInfoPanelData({ type: 'spot', spot: matchingSpot, object: obj })
        return
      }
    }
    setInfoPanelData({ type: 'object', object: obj })
  }

  // Find a camp spot that matches a floorplan tent object's position
  function findSpotForObject(obj: FloorplanObjectRow): CampSpotWithReservation | null {
    // Match by proximity — spots have x_position/y_position, objects have x/y
    return spots.find(s => {
      const dx = Math.abs(s.x_position - obj.x)
      const dy = Math.abs(s.y_position - obj.y)
      return dx < 5 && dy < 5
    }) || null
  }

  // Reserve a spot from the map
  async function handleReserveSpot(spot: CampSpotWithReservation) {
    if (!camper) return
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Check tent fit
      const fitCheck = doesTentFitSpot(camper.shelter_width_ft, camper.shelter_length_ft, spot)
      if (!fitCheck.fits) {
        setError(fitCheck.reason ?? "Your tent doesn't fit this spot.")
        setActionLoading(false)
        return
      }

      // Release existing reservation if any
      const existingReservation = spots.find(s => s.reservation?.camper_id === camper.id)
      if (existingReservation?.reservation) {
        await releaseReservation(existingReservation.reservation.id)
      }

      await reserveSpot(spot.id, camper.id)
      setSuccess(`Spot ${spot.label} is yours! 🏕️`)
      setInfoPanelData(null)
      await loadData()
    } catch {
      setError('Failed to reserve spot. It may have just been taken.')
      await loadData()
    } finally {
      setActionLoading(false)
    }
  }

  // Release your spot
  async function handleReleaseSpot(spot: CampSpotWithReservation) {
    if (!spot.reservation) return
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await releaseReservation(spot.reservation.id)
      setSuccess(`Spot ${spot.label} released.`)
      setInfoPanelData(null)
      await loadData()
    } catch {
      setError('Failed to release spot.')
    } finally {
      setActionLoading(false)
    }
  }

  // Reset view
  function handleResetView() {
    setPanOffset({ x: 0, y: 0 })
    setScale(2.5)
  }

  // Get spot status color for tent overlay
  function getSpotOverlayClass(obj: FloorplanObjectRow): string {
    if (!obj.properties?.reservable) return ''
    const spot = findSpotForObject(obj)
    if (!spot) return ''
    if (spot.reservation?.camper_id === camper?.id) return 'ring-4 ring-yellow-400'
    if (spot.reservation) return 'ring-4 ring-red-400'
    if (camper) {
      const fitCheck = doesTentFitSpot(camper.shelter_width_ft, camper.shelter_length_ft, spot)
      if (!fitCheck.fits) return 'ring-4 ring-orange-400 opacity-60'
    }
    return 'ring-4 ring-emerald-400'
  }

  // Sorted objects by z-index
  const sortedObjects = [...objects].sort((a, b) => a.z_index - b.z_index)

  // Filter by layer visibility
  const visibleObjects = sortedObjects.filter(obj => {
    const template = getTemplateForType(obj.object_type)
    if (!template) return layers.structures
    if (obj.object_type === 'tent') return layers.tents
    return layers[template.category as keyof typeof layers] ?? true
  })

  // My reservation
  const myReservation = spots.find(s => s.reservation?.camper_id === camper?.id)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">🏕️</div>
          <p className="font-black uppercase tracking-wider text-lg">Loading Camp Spots...</p>
          <p className="text-sm text-gray-600">Rendering the playa from above</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🏜️</div>
            <h2 className="text-2xl font-black uppercase mb-4">No Layout Yet</h2>
            <p className="text-gray-600">
              The camp layout hasn&apos;t been created by leadership yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Bar */}
      <div className="bg-black text-white px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sticky top-16 z-40">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-black uppercase tracking-wider text-yellow-400">
            🏕️ Camp Spots
          </h1>
          <Badge variant={mode === 'explore' ? 'default' : 'success'}>
            {mode === 'explore' ? '👁️ Explore' : '🏕️ Reserve'}
          </Badge>
          {myReservation && (
            <Badge variant="warning">Your Spot: {myReservation.label}</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Toggle */}
          {selectionEnabled && (
            <div className="flex border border-gray-600 rounded-sm overflow-hidden">
              <button
                onClick={() => setMode('explore')}
                className={cn(
                  'px-3 py-1 text-xs font-bold uppercase transition-colors',
                  mode === 'explore' ? 'bg-yellow-400 text-black' : 'hover:bg-gray-800'
                )}
              >
                👁️ Explore
              </button>
              <button
                onClick={() => {
                  if (!isIdentified) {
                    setInfoPanelData(null)
                    // Will show identify form in sidebar
                  }
                  setMode('reserve')
                }}
                className={cn(
                  'px-3 py-1 text-xs font-bold uppercase transition-colors',
                  mode === 'reserve' ? 'bg-emerald-400 text-black' : 'hover:bg-gray-800'
                )}
              >
                🏕️ Reserve
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale(prev => Math.max(0.5, prev - 0.5))}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs font-bold"
            >
              −
            </button>
            <span className="text-xs font-mono w-10 text-center">{scale.toFixed(1)}x</span>
            <button
              onClick={() => setScale(prev => Math.min(6, prev + 0.5))}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs font-bold"
            >
              +
            </button>
          </div>

          {/* Reset View */}
          <button
            onClick={handleResetView}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-xs font-bold uppercase"
            title="Reset view"
          >
            ⟳ Reset
          </button>

          {/* Toggles */}
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={e => setShowGrid(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-[10px] uppercase font-bold">Grid</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={e => setShowLabels(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-[10px] uppercase font-bold">Labels</span>
          </label>
        </div>
      </div>

      {/* Alerts */}
      <div className="max-w-7xl mx-auto px-4 pt-3 space-y-2">
        {error && <Alert variant="error">{error} <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button></Alert>}
        {success && <Alert variant="success">{success} <button className="ml-2 underline" onClick={() => setSuccess(null)}>Dismiss</button></Alert>}
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Map Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ height: 'calc(100vh - 180px)' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
        >
          <div
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              transition: isPanning ? 'none' : 'transform 0.1s ease-out',
            }}
            className="p-8"
          >
            {/* The floorplan canvas */}
            <div
              data-canvas="true"
              className="relative bg-amber-50/80 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]"
              style={{
                width: config.width_ft * scale,
                height: config.length_ft * scale,
                backgroundImage: showGrid
                  ? `linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
                     linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)`
                  : 'none',
                backgroundSize: `${config.grid_size_ft * scale}px ${config.grid_size_ft * scale}px`,
              }}
            >
              {/* Compass */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-black uppercase tracking-wider bg-black text-yellow-400 px-4 py-1 z-10">
                ↑ Street Side (N)
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-black uppercase tracking-wider bg-gray-400 text-white px-4 py-1 z-10">
                ↓ Open Playa (S)
              </div>

              {/* Scale indicator */}
              <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1">
                <div
                  className="h-0.5 bg-black"
                  style={{ width: 50 * scale / 2.5 }}
                />
                <span className="text-[9px] font-mono font-bold bg-white/80 px-1">
                  {Math.round(50 / (scale / 2.5))}ft
                </span>
              </div>

              {/* Rendered objects */}
              {visibleObjects.map(obj => {
                const template = getTemplateForType(obj.object_type)
                const isHovered = hoveredObjectId === obj.id
                const isSelected = infoPanelData?.object?.id === obj.id
                const spotOverlay = mode === 'reserve' ? getSpotOverlayClass(obj) : ''
                const isReservable = obj.properties?.reservable

                return (
                  <div
                    key={obj.id}
                    className={cn(
                      'absolute border-2 transition-all duration-150 select-none',
                      isHovered && 'shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] z-30',
                      isSelected && 'ring-2 ring-blue-400 ring-offset-2 z-40 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                      isReservable && mode === 'reserve' && 'cursor-pointer hover:scale-[1.02]',
                      !isReservable && 'cursor-pointer',
                      spotOverlay
                    )}
                    style={{
                      left: obj.x * scale,
                      top: obj.y * scale,
                      width: obj.width_ft * scale,
                      height: obj.height_ft * scale,
                      backgroundColor: `${obj.color}${isHovered ? 'ee' : 'bb'}`,
                      borderColor: obj.color,
                      transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
                      zIndex: isSelected ? 40 : isHovered ? 30 : obj.z_index,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleObjectClick(obj)
                    }}
                    onMouseEnter={() => setHoveredObjectId(obj.id)}
                    onMouseLeave={() => setHoveredObjectId(null)}
                  >
                    {/* Labels */}
                    {showLabels && obj.width_ft * scale > 20 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden p-0.5">
                        <span className="text-[10px]">{template?.icon || '📦'}</span>
                        <span className="text-[9px] font-black uppercase tracking-wider text-center leading-tight text-black/80 truncate max-w-full px-0.5">
                          {obj.label || template?.label || obj.object_type}
                        </span>
                        {/* Reservation status indicators for tents */}
                        {isReservable && mode === 'reserve' && (() => {
                          const spot = findSpotForObject(obj)
                          if (!spot) return null
                          if (spot.reservation?.camper_id === camper?.id) {
                            return <span className="text-[7px] bg-yellow-500 text-black px-1 rounded-sm mt-0.5 font-bold">YOUR SPOT</span>
                          }
                          if (spot.reservation) {
                            return <span className="text-[7px] bg-red-500 text-white px-1 rounded-sm mt-0.5">{spot.camper?.playa_name || 'Taken'}</span>
                          }
                          return <span className="text-[7px] bg-emerald-500 text-white px-1 rounded-sm mt-0.5">AVAILABLE</span>
                        })()}
                        {/* In explore mode, show who's there */}
                        {isReservable && mode === 'explore' && (() => {
                          const spot = findSpotForObject(obj)
                          if (!spot?.reservation) return null
                          return <span className="text-[7px] bg-black/70 text-white px-1 rounded-sm mt-0.5">{spot.camper?.playa_name || spot.camper?.full_name || 'Reserved'}</span>
                        })()}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Click-away to deselect */}
              <div
                data-canvas="true"
                className="absolute inset-0 -z-10"
                onClick={() => setInfoPanelData(null)}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[340px] lg:max-h-[calc(100vh-180px)] overflow-y-auto border-l-4 border-black bg-white p-4 space-y-4">
          {/* Layer Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">🗂️ Layers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {Object.entries(layers).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={e => setLayers(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="w-3.5 h-3.5"
                  />
                  <span className="font-bold capitalize">{key}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Identify / Reserve Mode */}
          {mode === 'reserve' && !isIdentified && (
            <Card className="border-emerald-500 border-2">
              <CardHeader>
                <CardTitle className="text-sm">🏕️ Reserve a Spot</CardTitle>
                <CardDescription>Enter your email to claim a tent site</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleIdentify} className="space-y-3">
                  <Input
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="yourname@example.com"
                    required
                  />
                  <Button type="submit" loading={identifyLoading} className="w-full">
                    Find My Registration
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Camper Info */}
          {camper && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">🧑 Your Info</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="font-bold">{camper.playa_name || camper.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shelter</span>
                  <span className="font-bold capitalize">{camper.shelter_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tent Size</span>
                  <span className="font-bold">{camper.shelter_width_ft}×{camper.shelter_length_ft}ft</span>
                </div>
                {camper.power_required && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Power</span>
                    <span className="font-bold">⚡ {camper.power_type}</span>
                  </div>
                )}
                {myReservation && (
                  <div className="mt-2 p-2 bg-yellow-50 border-2 border-yellow-400 text-center">
                    <p className="font-black text-lg">{myReservation.label}</p>
                    <p className="text-xs text-gray-500">Your current spot</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Panel — Object details */}
          {infoPanelData?.type === 'object' && infoPanelData.object && (
            <Card className="border-blue-500 border-2">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <span>{getTemplateForType(infoPanelData.object.object_type)?.icon || '📦'}</span>
                  {infoPanelData.object.label}
                </CardTitle>
                <CardDescription>
                  {getTemplateForType(infoPanelData.object.object_type)?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <Badge>{infoPanelData.object.object_type.replace(/_/g, ' ')}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Size</span>
                  <span className="font-bold">{infoPanelData.object.width_ft}×{infoPanelData.object.height_ft}ft</span>
                </div>
                {infoPanelData.object.properties?.capacity && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Capacity</span>
                    <span className="font-bold">{infoPanelData.object.properties.capacity} people</span>
                  </div>
                )}
                {infoPanelData.object.properties?.description && (
                  <p className="text-gray-600 text-xs mt-2 p-2 bg-gray-50 border">{infoPanelData.object.properties.description}</p>
                )}
                {infoPanelData.object.properties?.responsibilities && (
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-500 mb-1">Includes</p>
                    <div className="flex flex-wrap gap-1">
                      {(infoPanelData.object.properties.responsibilities as string[]).map((r, i) => (
                        <Badge key={i}>{r}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setInfoPanelData(null)}
                  className="text-xs text-gray-500 underline mt-2"
                >
                  Close
                </button>
              </CardContent>
            </Card>
          )}

          {/* Info Panel — Spot reservation details */}
          {infoPanelData?.type === 'spot' && infoPanelData.spot && (
            <Card className="border-emerald-500 border-2">
              <CardHeader>
                <CardTitle className="text-sm">
                  {infoPanelData.spot.reservation?.camper_id === camper?.id
                    ? '⚠️ Your Spot'
                    : infoPanelData.spot.reservation
                    ? '🔒 Reserved Spot'
                    : '✅ Available Spot'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-black text-center">{infoPanelData.spot.label}</div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Space</span>
                    <span className="font-bold">{infoPanelData.spot.spot_width_ft}×{infoPanelData.spot.spot_length_ft}ft</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Size</span>
                    <Badge>{infoPanelData.spot.size_category.toUpperCase()}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fits tent</span>
                    <span className="font-bold text-xs">
                      {infoPanelData.spot.min_tent_width_ft}-{infoPanelData.spot.max_tent_width_ft}ft × {infoPanelData.spot.min_tent_length_ft}-{infoPanelData.spot.max_tent_length_ft}ft
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs mt-1">
                    {infoPanelData.spot.has_power && <span className="px-2 py-0.5 bg-yellow-100 border border-yellow-500">⚡ Power</span>}
                    {infoPanelData.spot.has_shade && <span className="px-2 py-0.5 bg-blue-100 border border-blue-500">⛱️ Shade</span>}
                    {infoPanelData.spot.is_accessible && <span className="px-2 py-0.5 bg-purple-100 border border-purple-500">♿ Accessible</span>}
                  </div>
                  {infoPanelData.spot.reservation && infoPanelData.spot.reservation.camper_id !== camper?.id && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-300 text-xs">
                      <p className="font-bold text-red-700">Reserved by {infoPanelData.spot.camper?.playa_name || infoPanelData.spot.camper?.full_name || 'a camper'}</p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {isIdentified && camper && !infoPanelData.spot.reservation && (
                  <Button
                    onClick={() => handleReserveSpot(infoPanelData.spot!)}
                    loading={actionLoading}
                    className="w-full"
                  >
                    🏕️ Reserve This Spot
                  </Button>
                )}
                {infoPanelData.spot.reservation?.camper_id === camper?.id && (
                  <Button
                    variant="danger"
                    onClick={() => handleReleaseSpot(infoPanelData.spot!)}
                    loading={actionLoading}
                    className="w-full"
                  >
                    🔓 Release This Spot
                  </Button>
                )}
                <button
                  onClick={() => setInfoPanelData(null)}
                  className="text-xs text-gray-500 underline w-full text-center"
                >
                  Close
                </button>
              </CardContent>
            </Card>
          )}

          {/* Map Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">📍 Legend</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1.5">
              {mode === 'reserve' && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 ring-4 ring-emerald-400 border-blue-400 bg-blue-200" />
                    <span>Available — click to reserve</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 ring-4 ring-yellow-400 border-blue-400 bg-blue-200" />
                    <span>Your spot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 ring-4 ring-red-400 border-blue-400 bg-blue-200" />
                    <span>Taken by another camper</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 ring-4 ring-orange-400 border-blue-400 bg-blue-200 opacity-60" />
                    <span>Doesn&apos;t fit your tent</span>
                  </div>
                  <hr className="my-2" />
                </>
              )}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-300 border-2 border-blue-500" />
                <span>Tents / Shelters</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-300 border-2 border-yellow-500" />
                <span>Kitchen Areas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-300 border-2 border-green-500" />
                <span>Common Areas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 border-2 border-gray-500" />
                <span>Utilities</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-300 border-2 border-purple-500" />
                <span>Entertainment</span>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">💡 Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-600 space-y-1.5">
              <p>🖱️ <strong>Click + drag</strong> to pan around the map</p>
              <p>🔍 <strong>Scroll wheel</strong> to zoom in/out</p>
              <p>👆 <strong>Click any object</strong> to see details</p>
              {selectionEnabled && (
                <>
                  <p>🏕️ <strong>Switch to Reserve mode</strong> to claim a tent spot</p>
                  <p>🏷️ <strong>Colored rings</strong> show spot availability</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stats footer */}
          <div className="text-[10px] text-gray-400 text-center space-y-0.5 pt-2">
            <p>{config.name} — {config.width_ft}×{config.length_ft}ft</p>
            <p>{objects.length} objects • {spots.filter(s => !s.reservation).length}/{spots.length} spots available</p>
          </div>
        </div>
      </div>
    </div>
  )
}
