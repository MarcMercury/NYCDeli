'use client'

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Alert, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { FloorplanConfigRow, FloorplanObjectRow, CampSpotWithReservation, CamperRow } from '@/types/database'
import { fetchActiveFloorplan, fetchFloorplanObjects } from '@/lib/floorplan'
import { fetchSpotsWithReservations, reserveSpot, releaseReservation, doesTentFitSpot } from '@/lib/camp-spots'
import { createClient } from '@/lib/supabase/client'
import { getTemplateForType } from '@/components/floorplan/object-templates'
import { ObjectDetailSVG } from '@/components/floorplan/object-detail-svg'
import { computeShadePosts } from '@/lib/shade-posts'

// Lazy-load the heavy Three.js 3D component
const CampMap3D = lazy(() => import('@/components/camp-map-3d').then(m => ({ default: m.CampMap3D })))

type WizardStep = 'identify' | 'verify-dimensions' | 'confirm'

interface SelectedObject {
  object: FloorplanObjectRow
  spot: CampSpotWithReservation | null
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
  const [identifyLoading, setIdentifyLoading] = useState(false)

  // Map interaction
  const DEFAULT_SCALE = 4.5
  const MIN_SCALE = 1.5
  const MAX_SCALE = 12
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(null)
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // AI spot recommendations
  const [aiRecs, setAiRecs] = useState<Array<{ spot_id: string; label: string; reason: string }>>([])
  const [aiRecsLoading, setAiRecsLoading] = useState(false)



  // Search / jump-to
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [hasInitialPan, setHasInitialPan] = useState(false)

  // Reserve Wizard
  const [wizardStep, setWizardStep] = useState<WizardStep | null>(null)
  const [wizardTentWidth, setWizardTentWidth] = useState('')
  const [wizardTentLength, setWizardTentLength] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)

  // 3D view mode
  const [viewMode, setViewMode] = useState<'2d' | '3d-webgl'>('2d')

  // 3D model generation state
  const [_generating3D, setGenerating3D] = useState<string | null>(null) // object ID being generated
  const [modelGenProgress, setModelGenProgress] = useState<string | null>(null)

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const floorplan = await fetchActiveFloorplan()

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

  // Identify camper (wizard step 1)
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

      const camperData = data as CamperRow
      setCamper(camperData)
      // Pre-fill tent dimensions from registration
      setWizardTentWidth(String(camperData.shelter_width_ft))
      setWizardTentLength(String(camperData.shelter_length_ft))
      // Move to dimension verification step
      setWizardStep('verify-dimensions')
    } catch {
      setError('Something went wrong looking you up.')
    } finally {
      setIdentifyLoading(false)
    }
  }

  // Pan handlers
  function handlePointerDown(e: React.PointerEvent) {
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

  // Scroll wheel zoom (zoom towards cursor position)
  // Attached as native event with { passive: false } so preventDefault actually stops page scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = container!.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top

      const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      setScale(prev => {
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * zoomFactor))
        const scaleRatio = newScale / prev
        setPanOffset(po => ({
          x: cursorX - (cursorX - po.x) * scaleRatio,
          y: cursorY - (cursorY - po.y) * scaleRatio,
        }))
        return newScale
      })
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, []) // stable — MIN_SCALE / MAX_SCALE are constants

  // Center map in viewport on initial load
  useEffect(() => {
    if (config && containerRef.current && !hasInitialPan) {
      const viewportW = containerRef.current.clientWidth
      const viewportH = containerRef.current.clientHeight
      const mapW = config.width_ft * DEFAULT_SCALE
      const mapH = config.length_ft * DEFAULT_SCALE
      const x = (viewportW - mapW) / 2 - 32
      const y = Math.min(0, (viewportH - mapH) / 2) - 32
      setPanOffset({ x, y })
      setHasInitialPan(true)
    }
   
  }, [config, hasInitialPan])

  // Jump to a specific object on the map
  function jumpToObject(obj: FloorplanObjectRow) {
    if (!containerRef.current) return
    const viewportW = containerRef.current.clientWidth
    const viewportH = containerRef.current.clientHeight
    // Center the object in the viewport
    const objCenterX = (obj.x + obj.width_ft / 2) * scale
    const objCenterY = (obj.y + obj.height_ft / 2) * scale
    setPanOffset({
      x: viewportW / 2 - objCenterX - 32,
      y: viewportH / 2 - objCenterY - 32,
    })
    handleObjectClick(obj)
    setSearchQuery('')
    setSearchOpen(false)
  }

  // Filtered search results
  const searchResults = searchQuery.trim().length > 0
    ? objects.filter(obj => {
        const q = searchQuery.toLowerCase()
        const label = (obj.label || '').toLowerCase()
        const type = obj.object_type.replace(/_/g, ' ').toLowerCase()
        // Also match camper playa_name for reserved spots
        const spot = obj.properties?.reservable ? findSpotForObject(obj) : null
        const camperNames = spot?.campers.map(c => (c.playa_name || c.full_name || '').toLowerCase()).join(' ') || ''
        return label.includes(q) || type.includes(q) || camperNames.includes(q)
      }).slice(0, 12)
    : []

  // Click on an object — always show info, attach matching spot if reservable
  function handleObjectClick(obj: FloorplanObjectRow) {
    setSidebarOpen(true)
    setWizardStep(null)
    setError(null)
    setSuccess(null)
    const spot = obj.properties?.reservable ? findSpotForObject(obj) : null
    setSelectedObject({ object: obj, spot })
  }

  // Find a camp spot that matches a floorplan tent object
  function findSpotForObject(obj: FloorplanObjectRow): CampSpotWithReservation | null {
    // Primary: match by direct link
    const byId = spots.find(s => s.floorplan_object_id === obj.id)
    if (byId) return byId
    // Fallback: match by position proximity
    return spots.find(s => {
      const dx = Math.abs(s.x_position - obj.x)
      const dy = Math.abs(s.y_position - obj.y)
      return dx < 5 && dy < 5
    }) || null
  }

  // Start the reserve wizard
  function handleStartReserve() {
    setError(null)
    if (camper) {
      // Already identified — pre-fill and go to dimension verification
      setWizardTentWidth(String(camper.shelter_width_ft))
      setWizardTentLength(String(camper.shelter_length_ft))
      setWizardStep('verify-dimensions')
    } else {
      setWizardStep('identify')
    }
  }

  // Verify dimensions and move to confirm step
  function handleVerifyDimensions(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const spot = selectedObject?.spot
    if (!spot) return

    const width = parseFloat(wizardTentWidth)
    const length = parseFloat(wizardTentLength)

    if (!width || !length || width <= 0 || length <= 0) {
      setError('Please enter valid tent dimensions.')
      return
    }

    const fitCheck = doesTentFitSpot(width, length, spot)
    if (!fitCheck.fits) {
      setError(fitCheck.reason ?? "Your tent doesn't fit this spot.")
      return
    }

    setWizardStep('confirm')
  }

  // Final reservation
  async function handleConfirmReserve() {
    if (!camper || !selectedObject?.spot) return
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const spot = selectedObject.spot

      // reserveSpot() handles releasing existing reservation on other spots internally
      await reserveSpot(spot.id, camper.id)

      const tentMates = spot.campers.filter(c => c.id !== camper.id)
      const shareMsg = tentMates.length > 0
        ? ` Sharing with ${tentMates.map(c => c.playa_name || c.full_name).join(', ')}.`
        : ''
      setSuccess(`Spot ${spot.label} is yours! 🏕️${shareMsg}`)
      setWizardStep(null)
      setSelectedObject(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reserve spot. It may be full.')
      await loadData()
    } finally {
      setActionLoading(false)
    }
  }

  // Release your spot
  async function handleReleaseSpot(spot: CampSpotWithReservation) {
    if (!camper) return
    const myRes = spot.reservations.find(r => r.camper_id === camper.id)
    if (!myRes) return
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await releaseReservation(myRes.id)
      setSuccess(`Spot ${spot.label} released.`)
      setSelectedObject(null)
      setWizardStep(null)
      await loadData()
    } catch {
      setError('Failed to release spot.')
    } finally {
      setActionLoading(false)
    }
  }

  async function getAiSpotRecommendations() {
    if (!camper || spots.length === 0) return
    setAiRecsLoading(true)
    setAiRecs([])
    try {
      const res = await fetch('/api/ai/spot-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camper, spots }),
      })
      const data = await res.json()
      if (res.ok && data.recommendations) {
        setAiRecs(data.recommendations)
      } else {
        setError(data.error || 'Failed to get recommendations')
      }
    } catch {
      setError('Network error getting spot recommendations')
    }
    setAiRecsLoading(false)
  }

  function handleResetView() {
    setScale(DEFAULT_SCALE)

    if (config && containerRef.current) {
      const viewportW = containerRef.current.clientWidth
      const viewportH = containerRef.current.clientHeight
      const mapW = config.width_ft * DEFAULT_SCALE
      const mapH = config.length_ft * DEFAULT_SCALE
      const x = (viewportW - mapW) / 2 - 32
      const y = Math.min(0, (viewportH - mapH) / 2) - 32
      setPanOffset({ x, y })
    } else {
      setPanOffset({ x: 0, y: 0 })
    }
  }

  // ─── 3D Model Generation (OpenAI + Meshy) ────────────────────
  async function handleGenerate3DModel(obj: FloorplanObjectRow) {
    setGenerating3D(obj.id)
    setModelGenProgress('Generating 3D description with AI...')
    setError(null)

    try {
      // Step 1: Call our API route which uses OpenAI to create prompt + Meshy to start generation
      const startRes = await fetch('/api/generate-3d-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object_type: obj.object_type,
          label: obj.label,
          width_ft: obj.width_ft,
          height_ft: obj.height_ft,
          color: obj.color,
          properties: obj.properties,
        }),
      })

      if (!startRes.ok) {
        const err = await startRes.json()
        throw new Error(err.error || 'Failed to start 3D generation')
      }

      const { task_id, prompt_used } = await startRes.json()
      setModelGenProgress(`3D model generating... (AI prompt: "${prompt_used.slice(0, 80)}...")`)

      // Step 2: Poll for completion
      let attempts = 0
      const maxAttempts = 60 // ~5 minutes at 5s intervals
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 5000))
        attempts++

        const statusRes = await fetch(`/api/check-3d-model?task_id=${encodeURIComponent(task_id)}`)
        if (!statusRes.ok) continue

        const status = await statusRes.json()
        setModelGenProgress(`3D model: ${status.status} (${status.progress}%)`)

        if (status.status === 'SUCCEEDED') {
          // Save the model URL to the floorplan object properties
          const supabase = createClient()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('floorplan_objects')
            .update({
              properties: {
                ...obj.properties,
                meshy_task_id: task_id,
                meshy_model_url: status.model_urls?.glb,
                meshy_thumbnail_url: status.thumbnail_url,
              },
            })
            .eq('id', obj.id)

          setSuccess(`3D model generated for ${obj.label}! 🎉`)
          setModelGenProgress(null)
          await loadData() // Refresh to pick up new model URL
          break
        }

        if (status.status === 'FAILED') {
          throw new Error(status.error || '3D generation failed')
        }
      }

      if (attempts >= maxAttempts) {
        setModelGenProgress(null)
        setError('3D generation timed out. The model may still be processing — try refreshing later.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate 3D model')
      setModelGenProgress(null)
    } finally {
      setGenerating3D(null)
    }
  }

  // Spot overlay ring colors on the map
  function getSpotOverlayClass(obj: FloorplanObjectRow): string {
    if (!obj.properties?.reservable) return ''
    const spot = findSpotForObject(obj)
    if (!spot) return 'ring-4 ring-emerald-400'
    const isMine = camper && spot.reservations.some(r => r.camper_id === camper.id)
    if (isMine) return 'ring-4 ring-yellow-400'
    if (spot.reservations.length >= spot.max_occupants) return 'ring-4 ring-red-400'
    if (spot.reservations.length > 0) return 'ring-4 ring-orange-400' // partially occupied, joinable
    return 'ring-4 ring-emerald-400'
  }

  // Sorted objects by z-index — all always visible
  const visibleObjects = [...objects].sort((a, b) => a.z_index - b.z_index)
  const shadePostsByObj = computeShadePosts(objects)

  // My reservation (supports tent sharing — find the spot where I'm one of the campers)
  const myReservation = camper ? spots.find(s => s.reservations.some(r => r.camper_id === camper.id)) : undefined
  const _myReservationRecord = camper && myReservation
    ? myReservation.reservations.find(r => r.camper_id === camper.id)
    : undefined

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">🏕️</div>
          <p className="font-black uppercase tracking-wider text-lg">Loading Camp Map...</p>
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
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header Bar */}
      <div className="bg-black text-white px-4 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 z-40 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-black uppercase tracking-wider text-yellow-400">
            🏕️ Camp Map
          </h1>
          {myReservation && (
            <Badge variant="warning">Your Spot: {myReservation.label}</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search / Jump-to */}
          <div className="relative">
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setSearchOpen(prev => !prev); setTimeout(() => searchInputRef.current?.focus(), 50) }}
                className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black uppercase tracking-wider"
                title="Search map objects"
              >
                🔍 Find
              </button>
              {searchOpen && (
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') }
                    if (e.key === 'Enter' && searchResults.length > 0) jumpToObject(searchResults[0])
                  }}
                  placeholder="Search tents, areas, names..."
                  className="w-48 px-2 py-1 text-xs bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400"
                />
              )}
            </div>
            {/* Search results dropdown */}
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-gray-900 border border-gray-700 shadow-xl z-[100] max-h-64 overflow-y-auto">
                {searchResults.map(obj => {
                  const template = getTemplateForType(obj.object_type)
                  const spot = obj.properties?.reservable ? findSpotForObject(obj) : null
                  return (
                    <button
                      key={obj.id}
                      onClick={() => jumpToObject(obj)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-800 flex items-center gap-2 border-b border-gray-800"
                    >
                      <span>{template?.icon || '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white truncate">{obj.label || obj.object_type.replace(/_/g, ' ')}</div>
                        <div className="text-gray-400 text-[10px]">{obj.object_type.replace(/_/g, ' ')} • {obj.width_ft}×{obj.height_ft}ft</div>
                      </div>
                      {spot && spot.reservations.length >= spot.max_occupants && (
                        <span className="text-[10px] bg-red-500/20 text-red-400 px-1 rounded">Full</span>
                      )}
                      {spot && spot.reservations.length > 0 && spot.reservations.length < spot.max_occupants && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1 rounded">{spot.reservations.length}/{spot.max_occupants}</span>
                      )}
                      {spot && spot.reservations.length === 0 && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded">Open</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Reset View */}
          <button
            onClick={handleResetView}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-xs font-bold uppercase"
            title="Re-center map"
          >
            ⟳ Center
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

          {/* Full 3D WebGL View */}
          <button
            onClick={() => setViewMode(prev => prev === '3d-webgl' ? '2d' : '3d-webgl')}
            className={cn(
              'px-3 py-1 text-xs font-black uppercase tracking-wider transition-colors',
              viewMode === '3d-webgl'
                ? 'bg-purple-500 text-white hover:bg-purple-400'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            )}
            title="Switch to full 3D WebGL view with Meshy AI models"
          >
            {viewMode === '3d-webgl' ? '🎮 Exit 3D' : '🎮 3D View'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row relative" style={{ height: 'calc(100vh - 120px)' }}>
        {/* 3D WebGL View */}
        {viewMode === '3d-webgl' && config && (
          <div className="flex-1 relative" style={{ height: '100%' }}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full bg-gradient-to-b from-sky-300 to-amber-200">
                <div className="text-center">
                  <div className="animate-spin text-5xl mb-4">🎮</div>
                  <p className="font-black uppercase tracking-wider text-lg">Loading 3D View...</p>
                  <p className="text-sm text-gray-600">Preparing WebGL renderer</p>
                </div>
              </div>
            }>
              <CampMap3D
                config={config}
                objects={objects}
                spots={spots}
                camper={camper}
                selectedObjectId={selectedObject?.object?.id || null}
                hoveredObjectId={hoveredObjectId}
                showLabels={showLabels}
                onSelectObject={(obj) => {
                  if (!obj) { setSelectedObject(null); return }
                  setSidebarOpen(true)
                  const spot = obj.properties?.reservable ? findSpotForObject(obj) : null
                  setSelectedObject({ object: obj, spot })
                }}
                onHoverObject={setHoveredObjectId}
                onGenerate3DModel={handleGenerate3DModel}
              />
            </Suspense>

            {/* 3D model generation progress overlay */}
            {modelGenProgress && (
              <div className="absolute bottom-4 left-4 right-4 z-50">
                <div className="bg-black/80 text-white px-4 py-3 rounded-lg flex items-center gap-3">
                  <div className="animate-spin text-xl">🎨</div>
                  <div>
                    <p className="font-bold text-sm">Generating 3D Model</p>
                    <p className="text-xs text-gray-300">{modelGenProgress}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Original 2D/CSS-3D Map Canvas */}
        {viewMode !== '3d-webgl' && (
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative"
          style={{ height: '100%' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Alerts overlaid on map */}
          <div className="absolute top-2 left-2 right-2 z-50 space-y-2 pointer-events-none">
            {error && <div className="pointer-events-auto"><Alert variant="error">{error} <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button></Alert></div>}
            {success && <div className="pointer-events-auto"><Alert variant="success">{success} <button className="ml-2 underline" onClick={() => setSuccess(null)}>Dismiss</button></Alert></div>}
          </div>
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
                transition: 'transform 0.6s ease',
              }}
            >
              {/* Border labels */}
              {config.border_label_north && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-black uppercase tracking-wider bg-black text-yellow-400 px-4 py-1 z-10 whitespace-nowrap">
                  ↑ {config.border_label_north}
                </div>
              )}
              {config.border_label_south && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-black uppercase tracking-wider bg-gray-400 text-white px-4 py-1 z-10 whitespace-nowrap">
                  ↓ {config.border_label_south}
                </div>
              )}
              {config.border_label_west && (
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 z-10">
                  <span
                    className="text-xs font-black uppercase tracking-wider bg-black text-white px-3 py-1 whitespace-nowrap"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    {config.border_label_west}
                  </span>
                </div>
              )}
              {config.border_label_east && (
                <div className="absolute -right-6 top-1/2 -translate-y-1/2 z-10">
                  <span
                    className="text-xs font-black uppercase tracking-wider bg-black text-white px-3 py-1 whitespace-nowrap"
                    style={{ writingMode: 'vertical-rl' }}
                  >
                    {config.border_label_east}
                  </span>
                </div>
              )}

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
                const isSelected = selectedObject?.object?.id === obj.id
                const spotOverlay = getSpotOverlayClass(obj)
                const isReservable = obj.properties?.reservable
                const objWidthPx = obj.width_ft * scale
                const objHeightPx = obj.height_ft * scale

                const isShade = obj.object_type === 'shade_structure' || obj.object_type === 'shade_sail'
                const isShadeBackground = obj.object_type === 'shade_structure' && !isSelected

                return (
                  <div
                    key={obj.id}
                    className={cn(
                      'absolute select-none',
                      isShadeBackground ? 'pointer-events-none' : 'cursor-pointer'
                    )}
                    style={{
                      left: obj.x * scale,
                      top: obj.y * scale,
                      width: objWidthPx,
                      height: objHeightPx,
                      zIndex: isShadeBackground
                        ? -1
                        : isSelected ? 200 : isHovered ? 150 : obj.z_index,
                      transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleObjectClick(obj)
                    }}
                    onMouseEnter={() => setHoveredObjectId(obj.id)}
                    onMouseLeave={() => setHoveredObjectId(null)}
                  >
                    {/* The main visible object */}
                    <div
                      className={cn(
                        'absolute border-2 transition-all duration-150',
                        isHovered && 'shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)]',
                        isSelected && 'ring-2 ring-blue-400 ring-offset-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                        isReservable && 'hover:scale-[1.02]',
                        spotOverlay
                      )}
                      style={{
                        left: 0,
                        top: 0,
                        width: objWidthPx,
                        height: objHeightPx,
                        backgroundColor: isShadeBackground
                          ? `${obj.color}30`
                          : `${obj.color}${isHovered ? 'ee' : 'bb'}`,
                        borderColor: obj.color,
                        borderStyle: isShadeBackground ? 'dashed' : 'solid',
                      }}
                    >
                      {/* Detailed SVG overlay */}
                      <ObjectDetailSVG
                        objectType={obj.object_type}
                        width={objWidthPx}
                        height={objHeightPx}
                        color={obj.color}
                      />

                      {/* Shade structure support posts — corners + every 10 ft along the perimeter.
                          Shared posts (between adjacent shade structures) render once with an
                          amber outline; the non-owner skips rendering. */}
                      {obj.object_type === 'shade_structure' && (() => {
                        const posts = shadePostsByObj.get(obj.id) ?? []
                        const sz = Math.max(1 * scale, 4)
                        return (
                          <>
                            {posts.map((p, i) => {
                              if (p.shared && !p.owned) return null
                              return (
                                <div
                                  key={i}
                                  title={p.shared ? 'Shared post (used by adjacent shade structure)' : undefined}
                                  className={cn(
                                    'absolute rounded-full border',
                                    p.shared ? 'bg-amber-400 border-amber-700' : 'bg-gray-700 border-gray-900',
                                  )}
                                  style={{
                                    width: sz,
                                    height: sz,
                                    left: p.xLocal * scale,
                                    top: p.yLocal * scale,
                                    transform: 'translate(-50%, -50%)',
                                  }}
                                />
                              )
                            })}
                          </>
                        )
                      })()}

                      {/* Labels */}
                      {showLabels && objWidthPx > 20 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden p-px" style={{ zIndex: 2 }}>
                          <span className="text-[8px] leading-none">{template?.icon || '📦'}</span>
                          <span className="text-[7px] font-black uppercase tracking-wider text-center leading-none text-black/80 truncate max-w-full px-px">
                            {obj.label || template?.label || obj.object_type}
                          </span>
                          {isReservable && (() => {
                            const spot = findSpotForObject(obj)
                            if (!spot) return <span className="text-[7px] bg-emerald-500 text-white px-1 rounded-sm mt-0.5">AVAILABLE</span>
                            const isMine = camper && spot.reservations.some(r => r.camper_id === camper.id)
                            if (isMine) {
                              return <span className="text-[7px] bg-yellow-500 text-black px-1 rounded-sm mt-0.5 font-bold">YOUR SPOT</span>
                            }
                            if (spot.reservations.length >= spot.max_occupants) {
                              const names = spot.campers.map(c => c.playa_name || c.full_name).join(', ')
                              return <span className="text-[7px] bg-red-500 text-white px-1 rounded-sm mt-0.5">{names || 'Full'}</span>
                            }
                            if (spot.reservations.length > 0) {
                              const names = spot.campers.map(c => c.playa_name || c.full_name).join(', ')
                              return <span className="text-[7px] bg-orange-400 text-white px-1 rounded-sm mt-0.5">{names} +{spot.max_occupants - spot.reservations.length}</span>
                            }
                            return <span className="text-[7px] bg-emerald-500 text-white px-1 rounded-sm mt-0.5">AVAILABLE</span>
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Click-away to deselect */}
              <div
                data-canvas="true"
                className="absolute inset-0 -z-10"
                onClick={() => { setSelectedObject(null); setWizardStep(null) }}
              />
            </div>
          </div>
        </div>
        )} {/* End viewMode !== '3d-webgl' */}

        {/* === Zoom Controls === */}
        <div
          className="absolute z-50 flex flex-col items-center gap-2"
          style={{ bottom: 20, right: sidebarOpen ? 360 : 16, transition: 'right 0.3s ease' }}
        >
          {/* Zoom controls */}
          <div className="flex flex-col bg-white/90 rounded-lg border-2 border-gray-300 shadow-lg backdrop-blur-sm overflow-hidden">
            <button
              onClick={() => setScale(prev => Math.min(MAX_SCALE, prev * 1.3))}
              className="w-9 h-9 flex items-center justify-center text-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-200"
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => { setScale(DEFAULT_SCALE); handleResetView() }}
              className="w-9 h-6 flex items-center justify-center text-[8px] font-bold text-gray-500 hover:bg-gray-100 transition-colors border-b border-gray-200"
              title="Reset zoom"
            >
              {Math.round(scale / DEFAULT_SCALE * 100)}%
            </button>
            <button
              onClick={() => setScale(prev => Math.max(MIN_SCALE, prev / 1.3))}
              className="w-9 h-9 flex items-center justify-center text-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
              title="Zoom out"
            >
              −
            </button>
          </div>
        </div>

        {/* Sidebar toggle button */}
        <button
          onClick={() => setSidebarOpen(prev => !prev)}
          className="absolute top-2 right-2 z-50 bg-black text-yellow-400 px-3 py-2 font-black text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] border-2 border-yellow-400"
          style={sidebarOpen ? { right: '348px' } : undefined}
        >
          {sidebarOpen ? '✕ Close' : '☰ Panel'}
        </button>

        {/* Sidebar */}
        <div
          className={cn(
            'lg:max-h-full overflow-y-auto border-l-4 border-black bg-white transition-all duration-300',
            sidebarOpen ? 'w-full lg:w-[340px]' : 'w-0 lg:w-0 overflow-hidden border-l-0'
          )}
        >
          <div className="min-w-[340px] p-4 space-y-4">

          {/* Object Info Panel — always shown when an object is selected */}
          {selectedObject && (
            <Card className="border-blue-500 border-2">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <span>{getTemplateForType(selectedObject.object.object_type)?.icon || '📦'}</span>
                  {selectedObject.object.label}
                </CardTitle>
                <CardDescription>
                  {getTemplateForType(selectedObject.object.object_type)?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <Badge>{selectedObject.object.object_type.replace(/_/g, ' ')}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Size</span>
                  <span className="font-bold">{selectedObject.object.width_ft}×{selectedObject.object.height_ft}ft</span>
                </div>
                {selectedObject.object.properties?.capacity && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Capacity</span>
                    <span className="font-bold">{selectedObject.object.properties.capacity} people</span>
                  </div>
                )}
                {selectedObject.object.properties?.description && (
                  <p className="text-gray-600 text-xs mt-2 p-2 bg-gray-50 border">{selectedObject.object.properties.description}</p>
                )}
                {selectedObject.object.properties?.responsibilities && (
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-500 mb-1">Includes</p>
                    <div className="flex flex-wrap gap-1">
                      {(selectedObject.object.properties.responsibilities as string[]).map((r, i) => (
                        <Badge key={i}>{r}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Link to more details in Resources */}
                <a
                  href="/resources#camp-amenities"
                  className="flex items-center gap-2 mt-3 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-black bg-yellow-400 hover:bg-yellow-300 transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] w-full justify-center"
                >
                  📖 More Details
                </a>

                {/* Reservable tent with no synced spot */}
                {selectedObject.object.properties?.reservable && !selectedObject.spot && (
                  <div className="mt-3 pt-3 border-t">
                    <Alert variant="warning">
                      This tent is reservable but hasn&apos;t been synced to the camp spots list yet. An admin needs to click &quot;Sync Spots&quot; in the Layout Builder.
                    </Alert>
                  </div>
                )}

                {/* Spot details if this is a reservable tent */}
                {selectedObject.spot && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Spot</span>
                      <span className="font-black text-lg">{selectedObject.spot.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Space</span>
                      <span className="font-bold">{selectedObject.spot.spot_width_ft}×{selectedObject.spot.spot_length_ft}ft</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fits tent</span>
                      <span className="font-bold text-xs">
                        {selectedObject.spot.min_tent_width_ft}–{selectedObject.spot.max_tent_width_ft}ft × {selectedObject.spot.min_tent_length_ft}–{selectedObject.spot.max_tent_length_ft}ft
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs mt-1">
                      {selectedObject.spot.has_power && <span className="px-2 py-0.5 bg-yellow-100 border border-yellow-500">⚡ Power</span>}
                      {selectedObject.spot.has_shade && <span className="px-2 py-0.5 bg-blue-100 border border-blue-500">⛱️ Shade</span>}
                      {selectedObject.spot.is_accessible && <span className="px-2 py-0.5 bg-purple-100 border border-purple-500">♿ Accessible</span>}
                    </div>

                    {/* Occupancy info */}
                    {(() => {
                      const spot = selectedObject.spot!
                      const isMine = camper && spot.reservations.some(r => r.camper_id === camper.id)
                      const isFull = spot.reservations.length >= spot.max_occupants
                      const occupantCount = spot.reservations.length

                      return (
                        <>
                          {/* Show all current occupants */}
                          {occupantCount > 0 && (
                            <div className="p-2 bg-gray-50 border text-xs space-y-1">
                              <p className="font-bold text-gray-700">🏕️ Occupants ({occupantCount}/{spot.max_occupants}):</p>
                              {spot.campers.map((c) => (
                                <div key={c.id} className="flex justify-between">
                                  <span>{c.playa_name || c.full_name}</span>
                                  {camper && c.id === camper.id && (
                                    <span className="text-yellow-600 font-bold">← You</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Full spot — not your spot */}
                          {isFull && !isMine && (
                            <div className="p-2 bg-red-50 border border-red-300 text-xs text-center">
                              <p className="font-bold text-red-700">🔒 This tent is full ({occupantCount}/{spot.max_occupants})</p>
                            </div>
                          )}

                          {/* Your spot — release option */}
                          {isMine && camper && (
                            <div className="space-y-2">
                              <div className="p-2 bg-yellow-50 border-2 border-yellow-400 text-center">
                                <p className="font-black">🏕️ This is YOUR spot!</p>
                                {occupantCount > 1 && (
                                  <p className="text-xs text-gray-600 mt-1">Sharing with {spot.campers.filter(c => c.id !== camper.id).map(c => c.playa_name || c.full_name).join(', ')}</p>
                                )}
                              </div>
                              <Button
                                variant="danger"
                                onClick={() => handleReleaseSpot(spot)}
                                loading={actionLoading}
                                className="w-full"
                              >
                                🔓 Release This Spot
                              </Button>
                            </div>
                          )}

                          {/* RESERVE / JOIN button — available if spot has room and it's not already yours */}
                          {!isMine && !isFull && !wizardStep && (
                            <Button
                              onClick={handleStartReserve}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-base py-3"
                            >
                              {occupantCount > 0 ? '🤝 Join This Tent' : '🏕️ Reserve This Spot'}
                            </Button>
                          )}
                        </>
                      )
                    })()}
                  </div>
                )}

                <button
                  onClick={() => { setSelectedObject(null); setWizardStep(null) }}
                  className="text-xs text-gray-500 underline mt-2"
                >
                  Close
                </button>
              </CardContent>
            </Card>
          )}

          {/* ===== RESERVE WIZARD ===== */}

          {/* Step 1: Identify — enter email */}
          {wizardStep === 'identify' && (
            <Card className="border-emerald-500 border-2">
              <CardHeader>
                <CardTitle className="text-sm">Step 1 of 3 — Identify Yourself</CardTitle>
                <CardDescription>Enter the email you registered with</CardDescription>
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
                  <button
                    type="button"
                    onClick={() => setWizardStep(null)}
                    className="text-xs text-gray-500 underline w-full text-center"
                  >
                    Cancel
                  </button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Verify Tent Dimensions */}
          {wizardStep === 'verify-dimensions' && camper && selectedObject?.spot && (
            <Card className="border-emerald-500 border-2">
              <CardHeader>
                <CardTitle className="text-sm">Step 2 of 3 — Verify Your Tent Size</CardTitle>
                <CardDescription>
                  Confirm your tent dimensions fit this spot. Measurements from your registration are pre-filled — update them if they&apos;ve changed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-3">
                  {/* Camper info summary */}
                  <div className="p-2 bg-gray-50 border text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Camper</span>
                      <span className="font-bold">{camper.playa_name || camper.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shelter Type</span>
                      <span className="font-bold capitalize">{camper.shelter_type}</span>
                    </div>
                  </div>

                  {/* Spot constraints */}
                  <div className="p-2 bg-blue-50 border border-blue-200 text-xs">
                    <p className="font-bold text-blue-800 mb-1">📐 This spot accepts tents:</p>
                    <p>Width: <strong>{selectedObject.spot.min_tent_width_ft}–{selectedObject.spot.max_tent_width_ft} ft</strong></p>
                    <p>Length: <strong>{selectedObject.spot.min_tent_length_ft}–{selectedObject.spot.max_tent_length_ft} ft</strong></p>
                  </div>

                  {/* Editable dimensions */}
                  <form onSubmit={handleVerifyDimensions} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Tent Width (ft)"
                        type="number"
                        min="1"
                        step="0.5"
                        value={wizardTentWidth}
                        onChange={e => setWizardTentWidth(e.target.value)}
                        required
                      />
                      <Input
                        label="Tent Length (ft)"
                        type="number"
                        min="1"
                        step="0.5"
                        value={wizardTentLength}
                        onChange={e => setWizardTentLength(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      ✅ Verify &amp; Continue
                    </Button>
                    <button
                      type="button"
                      onClick={() => setWizardStep(null)}
                      className="text-xs text-gray-500 underline w-full text-center"
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Confirm Reservation */}
          {wizardStep === 'confirm' && camper && selectedObject?.spot && (
            <Card className="border-emerald-500 border-2">
              <CardHeader>
                <CardTitle className="text-sm">Step 3 of 3 — Confirm Reservation</CardTitle>
                <CardDescription>
                  Your tent fits! Review the details and confirm.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center p-3 bg-emerald-50 border-2 border-emerald-400">
                  <p className="text-3xl font-black">{selectedObject.spot.label}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedObject.spot.spot_width_ft}×{selectedObject.spot.spot_length_ft}ft spot
                  </p>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Camper</span>
                    <span className="font-bold">{camper.playa_name || camper.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Your Tent</span>
                    <span className="font-bold">{wizardTentWidth}×{wizardTentLength}ft</span>
                  </div>
                </div>
                {myReservation && myReservation.id !== selectedObject.spot.id && (
                  <div className="p-2 bg-yellow-50 border border-yellow-400 text-xs">
                    <p className="font-bold text-yellow-800">⚠️ You currently have spot {myReservation.label}. Reserving this one will release your current spot.</p>
                  </div>
                )}
                {/* Tent sharing notice */}
                {selectedObject.spot.reservations.length > 0 && (
                  <div className="p-2 bg-blue-50 border border-blue-300 text-xs">
                    <p className="font-bold text-blue-800">🤝 Tent Sharing — You&apos;ll be joining:</p>
                    {selectedObject.spot.campers.map(c => (
                      <p key={c.id} className="ml-2">• {c.playa_name || c.full_name}</p>
                    ))}
                    <p className="text-blue-600 mt-1">({selectedObject.spot.reservations.length}/{selectedObject.spot.max_occupants} occupants)</p>
                  </div>
                )}
                <Button
                  onClick={handleConfirmReserve}
                  loading={actionLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-base py-3"
                >
                  {selectedObject.spot.reservations.length > 0 ? '🤝 Confirm & Join Tent' : '🏕️ Confirm Reservation'}
                </Button>
                <button
                  type="button"
                  onClick={() => setWizardStep('verify-dimensions')}
                  className="text-xs text-gray-500 underline w-full text-center"
                >
                  ← Back to dimensions
                </button>
              </CardContent>
            </Card>
          )}

          {/* No selection prompt */}
          {!selectedObject && !wizardStep && (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-3">👆</div>
              <p className="font-bold uppercase text-sm">Click any object on the map</p>
              <p className="text-xs mt-1">See details and reserve available tent spots</p>
            </div>
          )}

          {/* AI Spot Recommendations */}
          {camper && !selectedObject && (
            <Card className="border-2 border-purple-200 mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">🤖 AI Spot Finder</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {aiRecs.length > 0 ? (
                  <>
                    <p className="text-xs text-gray-500 mb-2">Top picks for your {camper.shelter_type} ({camper.shelter_width_ft}×{camper.shelter_length_ft}ft):</p>
                    {aiRecs.map((rec, i) => (
                      <button
                        key={rec.spot_id}
                        onClick={() => {
                          const spot = spots.find(s => s.id === rec.spot_id)
                          if (spot) {
                            // Find the floorplan object linked to this spot
                            const obj = objects.find(o => o.id === spot.floorplan_object_id) ||
                              objects.find(o => {
                                const dx = Math.abs((spot.x_position || 0) - o.x)
                                const dy = Math.abs((spot.y_position || 0) - o.y)
                                return dx < 5 && dy < 5
                              })
                            if (obj) {
                              setSelectedObject({ object: obj, spot })
                              setSidebarOpen(true)
                            }
                          }
                        }}
                        className="w-full text-left p-2 border border-purple-100 rounded hover:bg-purple-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-700">#{i + 1}</span>
                          <span className="font-bold text-sm">{rec.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{rec.reason}</p>
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    {aiRecsLoading ? '⏳ Finding your perfect spot...' : 'Get AI-powered spot suggestions based on your setup.'}
                  </p>
                )}
                <Button
                  onClick={getAiSpotRecommendations}
                  disabled={aiRecsLoading}
                  className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {aiRecsLoading ? '⏳ Analyzing...' : aiRecs.length > 0 ? '🔄 Refresh' : '✨ Find My Best Spots'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">💡 Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-600 space-y-1.5">
              <p>🖱️ <strong>Click + drag</strong> to pan around the map</p>
              <p>🔍 <strong>Find button</strong> to search &amp; jump to any area</p>
              <p>👆 <strong>Click any object</strong> to see details</p>
            </CardContent>
          </Card>

          {/* Stats footer */}
          <div className="text-[10px] text-gray-400 text-center space-y-0.5 pt-2">
            <p>{config.name} — {config.width_ft}×{config.length_ft}ft</p>
            <p>{objects.length} objects • {spots.filter(s => s.reservations.length < s.max_occupants).length}/{spots.length} spots with room</p>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
