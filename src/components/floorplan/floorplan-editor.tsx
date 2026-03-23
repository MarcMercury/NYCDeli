'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Badge, Input, Alert } from '@/components/ui'
import { generateId, cn } from '@/lib/utils'
import type { FloorplanConfigRow, FloorplanObjectRow, FloorplanObjectType, UtilityLineRow, UtilityLineType, UtilityLinePoint } from '@/types/database'
import {
  fetchActiveFloorplan,
  fetchFloorplanObjects,
  createFloorplanObject,
  updateFloorplanObject,
  deleteFloorplanObject,
  updateFloorplan,
  createFloorplan,
  fetchUtilityLines,
  createUtilityLine,
  deleteUtilityLine,
} from '@/lib/floorplan'
import { syncSpotsFromFloorplan } from '@/lib/camp-spots'
import { GridCanvas, type DrawingMode } from './grid-canvas'
import { ObjectPalette } from './object-palette'
import { PropertiesPanel } from './properties-panel'
import { getTemplateForType, type ObjectTemplate } from './object-templates'

export function FloorplanEditor() {
  // Floorplan config
  const [config, setConfig] = useState<FloorplanConfigRow | null>(null)
  const [objects, setObjects] = useState<FloorplanObjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Editor state
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [scale, setScale] = useState(2)
  const [showGrid, setShowGrid] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Utility lines
  const [utilityLines, setUtilityLines] = useState<UtilityLineRow[]>([])
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [showUtilityLines, setShowUtilityLines] = useState(true)

  // Dimension editing
  const [editingDimensions, setEditingDimensions] = useState(false)
  const [dimWidth, setDimWidth] = useState(150)
  const [dimLength, setDimLength] = useState(300)
  const [dimGrid, setDimGrid] = useState(10)

  // Border labels
  const [borderNorth, setBorderNorth] = useState('')
  const [borderSouth, setBorderSouth] = useState('')
  const [borderEast, setBorderEast] = useState('')
  const [borderWest, setBorderWest] = useState('')

  const selectedObject = objects.find(o => o.id === selectedObjectId) || null

  // Load floorplan
  const loadFloorplan = useCallback(async () => {
    setLoading(true)
    setError(null)

    let floorplan = await fetchActiveFloorplan()

    // Create default if none exists
    if (!floorplan) {
      floorplan = await createFloorplan({
        name: 'NYC Deli Rats 2026',
        width_ft: 150,
        length_ft: 300,
        grid_size_ft: 10,
        is_active: true,
      })
      if (!floorplan) {
        setError('Failed to create default floorplan')
        setLoading(false)
        return
      }
    }

    setConfig(floorplan)
    setDimWidth(floorplan.width_ft)
    setDimLength(floorplan.length_ft)
    setDimGrid(floorplan.grid_size_ft)
    setBorderNorth(floorplan.border_label_north || '')
    setBorderSouth(floorplan.border_label_south || '')
    setBorderEast(floorplan.border_label_east || '')
    setBorderWest(floorplan.border_label_west || '')

    const objs = await fetchFloorplanObjects(floorplan.id)
    setObjects(objs)

    const lines = await fetchUtilityLines(floorplan.id)
    setUtilityLines(lines)

    setLoading(false)
  }, [])

  useEffect(() => {
    loadFloorplan()
  }, [loadFloorplan])

  // Save dimensions
  async function saveDimensions() {
    if (!config) return
    setSaving(true)
    const updated = await updateFloorplan(config.id, {
      width_ft: dimWidth,
      length_ft: dimLength,
      grid_size_ft: dimGrid,
      border_label_north: borderNorth || null,
      border_label_south: borderSouth || null,
      border_label_east: borderEast || null,
      border_label_west: borderWest || null,
    })
    if (updated) {
      setConfig(updated)
      setEditingDimensions(false)
    }
    setSaving(false)
  }

  // Sync reservable objects → camp_spots table
  async function handleSyncSpots() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await syncSpotsFromFloorplan(objects)
      setSyncResult(`Synced: ${result.created} created, ${result.updated} updated`)
    } catch {
      setError('Failed to sync spots')
    } finally {
      setSyncing(false)
    }
  }

  // Drop new object onto canvas
  async function handleDropNew(objectType: string, x: number, y: number) {
    if (!config) return
    const template = getTemplateForType(objectType as FloorplanObjectType)
    if (!template) return

    const newObj: FloorplanObjectRow = {
      id: generateId(),
      floorplan_id: config.id,
      object_type: objectType as FloorplanObjectType,
      label: template.label,
      x,
      y,
      width_ft: template.defaultWidth,
      height_ft: template.defaultHeight,
      rotation: 0,
      color: template.defaultColor,
      z_index: objects.length,
      is_locked: false,
      parent_id: null,
      properties: template.defaultProperties as FloorplanObjectRow['properties'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Optimistic update
    setObjects(prev => [...prev, newObj])
    setSelectedObjectId(newObj.id)
    setHasUnsavedChanges(true)

    // Persist
    const saved = await createFloorplanObject({
      floorplan_id: config.id,
      object_type: objectType as FloorplanObjectType,
      label: template.label,
      x,
      y,
      width_ft: template.defaultWidth,
      height_ft: template.defaultHeight,
      color: template.defaultColor,
      z_index: objects.length,
      properties: template.defaultProperties as FloorplanObjectRow['properties'],
    })

    if (saved) {
      // Replace temp object with saved one
      setObjects(prev => prev.map(o => (o.id === newObj.id ? saved : o)))
      setSelectedObjectId(saved.id)
      setHasUnsavedChanges(false)
    }
  }

  // Move object on canvas
  function handleMoveObject(id: string, x: number, y: number) {
    setObjects(prev => prev.map(o => (o.id === id ? { ...o, x, y } : o)))
    setHasUnsavedChanges(true)
  }

  // Resize object
  function handleResizeObject(id: string, width: number, height: number) {
    setObjects(prev =>
      prev.map(o => (o.id === id ? { ...o, width_ft: width, height_ft: height } : o))
    )
    setHasUnsavedChanges(true)
  }

  // Update any object property
  function handleUpdateObject(id: string, updates: Partial<FloorplanObjectRow>) {
    setObjects(prev => prev.map(o => (o.id === id ? { ...o, ...updates } : o)))
    setHasUnsavedChanges(true)
  }

  // Delete object
  async function handleDeleteObject(id: string) {
    // Also unparent any children
    setObjects(prev =>
      prev
        .filter(o => o.id !== id)
        .map(o => (o.parent_id === id ? { ...o, parent_id: null } : o))
    )
    setSelectedObjectId(null)
    setHasUnsavedChanges(true)
    await deleteFloorplanObject(id)
  }

  // Duplicate object
  async function handleDuplicateObject(id: string) {
    if (!config) return
    const source = objects.find(o => o.id === id)
    if (!source) return

    const newObj: FloorplanObjectRow = {
      ...source,
      id: generateId(),
      label: `${source.label} (copy)`,
      x: source.x + 10,
      y: source.y + 10,
      is_locked: false,
      parent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setObjects(prev => [...prev, newObj])
    setSelectedObjectId(newObj.id)
    setHasUnsavedChanges(true)

    const saved = await createFloorplanObject({
      floorplan_id: config.id,
      object_type: newObj.object_type,
      label: newObj.label,
      x: newObj.x,
      y: newObj.y,
      width_ft: newObj.width_ft,
      height_ft: newObj.height_ft,
      rotation: newObj.rotation,
      color: newObj.color,
      z_index: newObj.z_index,
      properties: newObj.properties,
    })

    if (saved) {
      setObjects(prev => prev.map(o => (o.id === newObj.id ? saved : o)))
      setSelectedObjectId(saved.id)
      setHasUnsavedChanges(false)
    }
  }

  // Lock/unlock
  function handleLockToggle(id: string) {
    setObjects(prev => prev.map(o => (o.id === id ? { ...o, is_locked: !o.is_locked } : o)))
    setHasUnsavedChanges(true)
  }

  // Z-order
  function handleBringForward(id: string) {
    setObjects(prev => {
      const idx = prev.findIndex(o => o.id === id)
      if (idx < 0) return prev
      const updated = prev.map((o, i) => ({
        ...o,
        z_index: i === idx ? o.z_index + 1 : o.z_index,
      }))
      return updated
    })
    setHasUnsavedChanges(true)
  }

  function handleSendBackward(id: string) {
    setObjects(prev => {
      const idx = prev.findIndex(o => o.id === id)
      if (idx < 0) return prev
      const updated = prev.map((o, i) => ({
        ...o,
        z_index: i === idx ? Math.max(0, o.z_index - 1) : o.z_index,
      }))
      return updated
    })
    setHasUnsavedChanges(true)
  }

  // Set parent
  function handleSetParent(childId: string, parentId: string | null) {
    setObjects(prev => prev.map(o => (o.id === childId ? { ...o, parent_id: parentId } : o)))
    setHasUnsavedChanges(true)
  }

  // Utility line: finish drawing
  async function handleFinishLine(lineType: UtilityLineType, points: UtilityLinePoint[]) {
    if (!config || points.length < 2) return
    setDrawingMode(null)

    const tempLine: UtilityLineRow = {
      id: generateId(),
      floorplan_id: config.id,
      line_type: lineType,
      points,
      label: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setUtilityLines(prev => [...prev, tempLine])

    const saved = await createUtilityLine({
      floorplan_id: config.id,
      line_type: lineType,
      points,
    })

    if (saved) {
      setUtilityLines(prev => prev.map(l => (l.id === tempLine.id ? saved : l)))
    }
  }

  // Delete utility line
  async function handleDeleteLine(id: string) {
    setUtilityLines(prev => prev.filter(l => l.id !== id))
    setSelectedLineId(null)
    await deleteUtilityLine(id)
  }

  // Save all changes
  async function handleSaveAll() {
    setSaving(true)
    const results = await Promise.all(
      objects.map(obj =>
        updateFloorplanObject(obj.id, {
          object_type: obj.object_type,
          label: obj.label,
          x: obj.x,
          y: obj.y,
          width_ft: obj.width_ft,
          height_ft: obj.height_ft,
          rotation: obj.rotation,
          color: obj.color,
          z_index: obj.z_index,
          is_locked: obj.is_locked,
          parent_id: obj.parent_id,
          properties: obj.properties,
        })
      )
    )

    const failures = results.filter(r => r === null)
    if (failures.length > 0) {
      setError(`Failed to save ${failures.length} object(s)`)
    } else {
      setHasUnsavedChanges(false)
    }
    setSaving(false)
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault()
          handleDeleteObject(selectedObjectId)
        }
        if (selectedLineId && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault()
          handleDeleteLine(selectedLineId)
        }
      }
      if (e.key === 'Escape') {
        if (drawingMode) {
          setDrawingMode(null)
        } else {
          setSelectedObjectId(null)
          setSelectedLineId(null)
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSaveAll()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedObjectId, objects])

  // Drag start callback (noop for now, could highlight drop zone)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handlePaletteDragStart(_template: ObjectTemplate) {
    // Could show visual feedback
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <p className="font-bold uppercase tracking-wider">Loading Floorplan Editor...</p>
          <p className="text-sm text-gray-600">Preparing your creative workspace</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-1">
              🗺️ Floorplan Editor
            </h1>
            <p className="text-gray-600 text-sm">
              Design your camp layout — drag objects from the palette onto the grid
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <Badge variant="warning">Unsaved Changes</Badge>
            )}
            {syncResult && (
              <Badge>{syncResult}</Badge>
            )}
            <Button
              variant="secondary"
              onClick={handleSyncSpots}
              loading={syncing}
              disabled={syncing}
            >
              🔄 Sync Spots
            </Button>
            <Button
              onClick={handleSaveAll}
              loading={saving}
              disabled={!hasUnsavedChanges}
            >
              💾 Save Layout
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr_280px] gap-4">
          {/* LEFT: Object Palette */}
          <div className="xl:max-h-[calc(100vh-200px)] xl:overflow-y-auto space-y-4">
            <ObjectPalette onDragStart={handlePaletteDragStart} />

            {/* Utility Lines */}
            <Card>
              <CardHeader>
                <CardTitle>🔌 Utility Lines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Click to start, click to add points, double-click to finish
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setDrawingMode(drawingMode === 'power' ? null : 'power')
                      setSelectedObjectId(null)
                      setSelectedLineId(null)
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 border-2 transition-all select-none',
                      drawingMode === 'power'
                        ? 'border-yellow-500 bg-yellow-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'border-gray-300 bg-white hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    )}
                  >
                    <span className="text-lg">⚡</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Power Line
                    </span>
                    <div className="w-full h-1 bg-yellow-500 rounded-full" />
                  </button>
                  <button
                    onClick={() => {
                      setDrawingMode(drawingMode === 'water' ? null : 'water')
                      setSelectedObjectId(null)
                      setSelectedLineId(null)
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 border-2 transition-all select-none',
                      drawingMode === 'water'
                        ? 'border-blue-500 bg-blue-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'border-gray-300 bg-white hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    )}
                  >
                    <span className="text-lg">💧</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Water Line
                    </span>
                    <div className="w-full h-1 bg-blue-500 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #3B82F6 0px, #3B82F6 8px, transparent 8px, transparent 12px)' }} />
                  </button>
                </div>

                {/* Line visibility toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUtilityLines}
                    onChange={e => setShowUtilityLines(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-xs font-bold uppercase">Show Lines</span>
                </label>

                {/* Line list */}
                {utilityLines.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                      {utilityLines.length} line{utilityLines.length !== 1 ? 's' : ''} placed
                    </p>
                    {utilityLines.map(line => (
                      <div
                        key={line.id}
                        onClick={() => {
                          setSelectedLineId(line.id)
                          setSelectedObjectId(null)
                        }}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 border-2 cursor-pointer text-xs transition-all',
                          selectedLineId === line.id
                            ? 'border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'border-gray-200 hover:border-gray-400'
                        )}
                      >
                        <span>{line.line_type === 'power' ? '⚡' : '💧'}</span>
                        <span className="font-bold uppercase flex-1">
                          {line.label || `${line.line_type} line`}
                        </span>
                        <span className="text-[10px] text-gray-400">{line.points.length}pts</span>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleDeleteLine(line.id)
                          }}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dimension Settings */}
            <Card>
              <CardHeader>
                <CardTitle>📐 Dimensions</CardTitle>
              </CardHeader>
              <CardContent>
                {editingDimensions ? (
                  <div className="space-y-2">
                    <Input
                      label="Width (ft)"
                      type="number"
                      min={50}
                      max={1000}
                      value={dimWidth}
                      onChange={e => setDimWidth(Number(e.target.value))}
                    />
                    <Input
                      label="Length (ft)"
                      type="number"
                      min={50}
                      max={1000}
                      value={dimLength}
                      onChange={e => setDimLength(Number(e.target.value))}
                    />
                    <Input
                      label="Grid Size (ft)"
                      type="number"
                      min={1}
                      max={50}
                      value={dimGrid}
                      onChange={e => setDimGrid(Number(e.target.value))}
                    />
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 pt-2">
                      Border Labels
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="North"
                        value={borderNorth}
                        onChange={e => setBorderNorth(e.target.value)}
                        placeholder="e.g. 3:00 Plaza"
                      />
                      <Input
                        label="South"
                        value={borderSouth}
                        onChange={e => setBorderSouth(e.target.value)}
                        placeholder="e.g. 9:00 Plaza"
                      />
                      <Input
                        label="West"
                        value={borderWest}
                        onChange={e => setBorderWest(e.target.value)}
                        placeholder="e.g. Esplanade"
                      />
                      <Input
                        label="East"
                        value={borderEast}
                        onChange={e => setBorderEast(e.target.value)}
                        placeholder="e.g. Deep Playa"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveDimensions} loading={saving}>
                        Apply
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingDimensions(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Width:</span>
                      <span className="font-bold">{config?.width_ft}ft</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Length:</span>
                      <span className="font-bold">{config?.length_ft}ft</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Grid:</span>
                      <span className="font-bold">{config?.grid_size_ft}ft</span>
                    </div>
                    {(borderNorth || borderSouth || borderEast || borderWest) && (
                      <>
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 pt-1">
                          Borders
                        </p>
                        {borderNorth && (
                          <div className="flex justify-between">
                            <span>North:</span>
                            <span className="font-bold truncate ml-2">{borderNorth}</span>
                          </div>
                        )}
                        {borderSouth && (
                          <div className="flex justify-between">
                            <span>South:</span>
                            <span className="font-bold truncate ml-2">{borderSouth}</span>
                          </div>
                        )}
                        {borderWest && (
                          <div className="flex justify-between">
                            <span>West:</span>
                            <span className="font-bold truncate ml-2">{borderWest}</span>
                          </div>
                        )}
                        {borderEast && (
                          <div className="flex justify-between">
                            <span>East:</span>
                            <span className="font-bold truncate ml-2">{borderEast}</span>
                          </div>
                        )}
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingDimensions(true)}
                      className="w-full mt-2"
                    >
                      Edit Dimensions
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CENTER: Grid Canvas */}
          <div className="overflow-auto">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{config?.name || 'Layout'}</CardTitle>
                  <CardDescription>
                    {config?.width_ft}ft × {config?.length_ft}ft — {objects.length} object{objects.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* View toggles */}
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={e => setShowGrid(e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-[10px] font-bold uppercase">Grid</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={e => setShowLabels(e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-[10px] font-bold uppercase">Labels</span>
                  </label>
                  {/* Zoom */}
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setScale(Math.max(0.5, scale - 0.5))}
                    >
                      −
                    </Button>
                    <span className="text-xs font-bold w-8 text-center">{scale}x</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setScale(Math.min(5, scale + 0.5))}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-auto">
                {config && (
                  <GridCanvas
                    widthFt={config.width_ft}
                    lengthFt={config.length_ft}
                    gridSizeFt={config.grid_size_ft}
                    scale={scale}
                    objects={objects}
                    selectedObjectId={selectedObjectId}
                    onSelectObject={setSelectedObjectId}
                    onMoveObject={handleMoveObject}
                    onResizeObject={handleResizeObject}
                    onDropNew={handleDropNew}
                    showGrid={showGrid}
                    showLabels={showLabels}
                    utilityLines={utilityLines}
                    drawingMode={drawingMode}
                    onFinishLine={handleFinishLine}
                    selectedLineId={selectedLineId}
                    onSelectLine={setSelectedLineId}
                    showUtilityLines={showUtilityLines}
                    borderLabels={{
                      north: borderNorth,
                      south: borderSouth,
                      east: borderEast,
                      west: borderWest,
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Stats bar */}
            <div className="flex flex-wrap gap-3 mt-3 text-xs">
              <div className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1.5">
                <span className="font-bold">Objects:</span> {objects.length}
              </div>
              <div className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1.5">
                <span className="font-bold">Reservable:</span>{' '}
                {objects.filter(o => o.properties?.reservable).length}
              </div>
              <div className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1.5">
                <span className="font-bold">Kitchen Areas:</span>{' '}
                {objects.filter(o =>
                  ['kitchen', 'grill', 'prep_area', 'service_area'].includes(o.object_type)
                ).length}
              </div>
              <div className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1.5">
                <span className="font-bold">Locked:</span>{' '}
                {objects.filter(o => o.is_locked).length}
              </div>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-gray-500">
              <span><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 font-mono">Del</kbd> Delete selected</span>
              <span><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 font-mono">Esc</kbd> Deselect</span>
              <span><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 font-mono">Ctrl+S</kbd> Save layout</span>
            </div>
          </div>

          {/* RIGHT: Properties Panel */}
          <div className="xl:max-h-[calc(100vh-200px)] xl:overflow-y-auto">
            <PropertiesPanel
              selectedObject={selectedObject}
              allObjects={objects}
              onUpdateObject={handleUpdateObject}
              onDeleteObject={handleDeleteObject}
              onDuplicateObject={handleDuplicateObject}
              onLockToggle={handleLockToggle}
              onBringForward={handleBringForward}
              onSendBackward={handleSendBackward}
              onSetParent={handleSetParent}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
