'use client'

import { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { FloorplanObjectRow, UtilityLineRow, UtilityLineType, UtilityLinePoint } from '@/types/database'
import { getTemplateForType } from './object-templates'

export type DrawingMode = null | 'power' | 'water'

const LINE_COLORS: Record<UtilityLineType, string> = {
  power: '#EAB308', // yellow-500
  water: '#3B82F6', // blue-500
}

interface GridCanvasProps {
  widthFt: number
  lengthFt: number
  gridSizeFt: number
  scale: number
  objects: FloorplanObjectRow[]
  selectedObjectId: string | null
  onSelectObject: (id: string | null) => void
  onMoveObject: (id: string, x: number, y: number) => void
  onResizeObject: (id: string, width: number, height: number) => void
  onDropNew: (objectType: string, x: number, y: number) => void
  showGrid: boolean
  showLabels: boolean
  utilityLines: UtilityLineRow[]
  drawingMode: DrawingMode
  onFinishLine: (lineType: UtilityLineType, points: UtilityLinePoint[]) => void
  selectedLineId: string | null
  onSelectLine: (id: string | null) => void
  showUtilityLines: boolean
}

export function GridCanvas({
  widthFt,
  lengthFt,
  gridSizeFt,
  scale,
  objects,
  selectedObjectId,
  onSelectObject,
  onMoveObject,
  onResizeObject,
  onDropNew,
  showGrid,
  showLabels,
  utilityLines,
  drawingMode,
  onFinishLine,
  selectedLineId,
  onSelectLine,
  showUtilityLines,
}: GridCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [dragState, setDragState] = useState<{
    objectId: string
    startX: number
    startY: number
    objStartX: number
    objStartY: number
  } | null>(null)
  const [resizeState, setResizeState] = useState<{
    objectId: string
    startX: number
    startY: number
    objStartW: number
    objStartH: number
  } | null>(null)
  const [dragOverPos, setDragOverPos] = useState<{ x: number; y: number } | null>(null)

  // Line drawing state
  const [drawingPoints, setDrawingPoints] = useState<UtilityLinePoint[]>([])
  const [currentMousePos, setCurrentMousePos] = useState<UtilityLinePoint | null>(null)

  const snapToGrid = useCallback(
    (value: number) => Math.round(value / gridSizeFt) * gridSizeFt,
    [gridSizeFt]
  )

  const toFeetX = useCallback(
    (clientX: number) => {
      if (!canvasRef.current) return 0
      const rect = canvasRef.current.getBoundingClientRect()
      return (clientX - rect.left) / scale
    },
    [scale]
  )

  const toFeetY = useCallback(
    (clientY: number) => {
      if (!canvasRef.current) return 0
      const rect = canvasRef.current.getBoundingClientRect()
      return (clientY - rect.top) / scale
    },
    [scale]
  )

  // Drag existing object
  function handleObjectPointerDown(e: React.PointerEvent, obj: FloorplanObjectRow) {
    if (obj.is_locked) return
    e.stopPropagation()
    e.preventDefault()
    onSelectObject(obj.id)
    setDragState({
      objectId: obj.id,
      startX: e.clientX,
      startY: e.clientY,
      objStartX: obj.x,
      objStartY: obj.y,
    })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragState) {
      const dx = (e.clientX - dragState.startX) / scale
      const dy = (e.clientY - dragState.startY) / scale
      const newX = snapToGrid(Math.max(0, Math.min(dragState.objStartX + dx, widthFt)))
      const newY = snapToGrid(Math.max(0, Math.min(dragState.objStartY + dy, lengthFt)))
      onMoveObject(dragState.objectId, newX, newY)
    }
    if (resizeState) {
      const dx = (e.clientX - resizeState.startX) / scale
      const dy = (e.clientY - resizeState.startY) / scale
      const newW = snapToGrid(Math.max(gridSizeFt, resizeState.objStartW + dx))
      const newH = snapToGrid(Math.max(gridSizeFt, resizeState.objStartH + dy))
      onResizeObject(resizeState.objectId, newW, newH)
    }
  }

  function handlePointerUp() {
    setDragState(null)
    setResizeState(null)
  }

  // Resize handle
  function handleResizePointerDown(e: React.PointerEvent, obj: FloorplanObjectRow) {
    if (obj.is_locked) return
    e.stopPropagation()
    e.preventDefault()
    setResizeState({
      objectId: obj.id,
      startX: e.clientX,
      startY: e.clientY,
      objStartW: obj.width_ft,
      objStartH: obj.height_ft,
    })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  // Drop new object from palette
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    const x = snapToGrid(toFeetX(e.clientX))
    const y = snapToGrid(toFeetY(e.clientY))
    setDragOverPos({ x, y })
  }

  function handleDragLeave() {
    setDragOverPos(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOverPos(null)
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'new-object') {
        const x = snapToGrid(toFeetX(e.clientX))
        const y = snapToGrid(toFeetY(e.clientY))
        onDropNew(data.objectType, x, y)
      }
    } catch {
      // Invalid drag data
    }
  }

  function handleCanvasClick(e: React.MouseEvent) {
    // Line drawing mode: click to add points
    if (drawingMode) {
      const x = snapToGrid(toFeetX(e.clientX))
      const y = snapToGrid(toFeetY(e.clientY))
      setDrawingPoints(prev => [...prev, { x, y }])
      return
    }
    if (e.target === canvasRef.current) {
      onSelectObject(null)
      onSelectLine(null)
    }
  }

  function handleCanvasDoubleClick(e: React.MouseEvent) {
    // Finish line drawing on double-click
    if (drawingMode && drawingPoints.length >= 1) {
      const x = snapToGrid(toFeetX(e.clientX))
      const y = snapToGrid(toFeetY(e.clientY))
      const finalPoints = [...drawingPoints, { x, y }]
      onFinishLine(drawingMode, finalPoints)
      setDrawingPoints([])
      setCurrentMousePos(null)
    }
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    if (drawingMode && drawingPoints.length > 0) {
      const x = snapToGrid(toFeetX(e.clientX))
      const y = snapToGrid(toFeetY(e.clientY))
      setCurrentMousePos({ x, y })
    }
  }

  // Reset drawing when mode changes off
  if (!drawingMode && drawingPoints.length > 0) {
    setDrawingPoints([])
    setCurrentMousePos(null)
  }

  function pointsToSvgPath(pts: UtilityLinePoint[]): string {
    if (pts.length === 0) return ''
    return pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`)
      .join(' ')
  }

  function handleLineClick(e: React.MouseEvent, lineId: string) {
    e.stopPropagation()
    if (!drawingMode) {
      onSelectLine(lineId)
      onSelectObject(null)
    }
  }

  // Sort by z_index for rendering order
  const sortedObjects = [...objects].sort((a, b) => a.z_index - b.z_index)

  return (
    <div
      ref={canvasRef}
      className="relative bg-amber-50 border-4 border-black cursor-crosshair overflow-hidden"
      style={{
        width: widthFt * scale,
        height: lengthFt * scale,
        backgroundImage: showGrid
          ? `linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)`
          : 'none',
        backgroundSize: `${gridSizeFt * scale}px ${gridSizeFt * scale}px`,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
      onDoubleClick={handleCanvasDoubleClick}
      onMouseMove={handleCanvasMouseMove}
    >
      {/* Grid numbers along top */}
      {showGrid &&
        Array.from({ length: Math.floor(widthFt / gridSizeFt) + 1 }, (_, i) => (
          <div
            key={`xt-${i}`}
            className="absolute text-[8px] text-gray-400 font-mono select-none pointer-events-none"
            style={{ left: i * gridSizeFt * scale - 4, top: 2 }}
          >
            {i * gridSizeFt}
          </div>
        ))}
      {/* Grid numbers along left */}
      {showGrid &&
        Array.from({ length: Math.floor(lengthFt / gridSizeFt) + 1 }, (_, i) => (
          i > 0 && (
            <div
              key={`yl-${i}`}
              className="absolute text-[8px] text-gray-400 font-mono select-none pointer-events-none"
              style={{ left: 2, top: i * gridSizeFt * scale - 5 }}
            >
              {i * gridSizeFt}
            </div>
          )
        ))}

      {/* Drop preview ghost */}
      {dragOverPos && (
        <div
          className="absolute border-2 border-dashed border-blue-500 bg-blue-200/30 pointer-events-none"
          style={{
            left: dragOverPos.x * scale,
            top: dragOverPos.y * scale,
            width: 10 * scale,
            height: 10 * scale,
          }}
        />
      )}

      {/* Rendered objects */}
      {sortedObjects.map(obj => {
        const template = getTemplateForType(obj.object_type)
        const isSelected = selectedObjectId === obj.id
        const isDragging = dragState?.objectId === obj.id
        const isResizing = resizeState?.objectId === obj.id
        const hasChildren = objects.some(o => o.parent_id === obj.id)

        return (
          <div
            key={obj.id}
            className={cn(
              'absolute border-2 transition-shadow select-none',
              isSelected
                ? 'ring-2 ring-yellow-400 ring-offset-1 z-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                : 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]',
              obj.is_locked ? 'cursor-not-allowed opacity-75' : 'cursor-move',
              isDragging && 'opacity-80 z-50',
              isResizing && 'z-50'
            )}
            style={{
              left: obj.x * scale,
              top: obj.y * scale,
              width: obj.width_ft * scale,
              height: obj.height_ft * scale,
              backgroundColor: `${obj.color}cc`,
              borderColor: obj.color,
              transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
              zIndex: isSelected ? 50 : obj.z_index,
            }}
            onPointerDown={e => handleObjectPointerDown(e, obj)}
          >
            {/* Label */}
            {showLabels && obj.width_ft * scale > 24 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden p-px">
                <span className="text-[8px] leading-none">{template?.icon || '📦'}</span>
                <span
                  className="text-[7px] font-black uppercase tracking-wider text-center leading-none text-black/80 truncate max-w-full px-px"
                >
                  {obj.label || template?.label || obj.object_type}
                </span>
                {obj.properties?.reservable && (
                  <span className="text-[7px] bg-green-500 text-white px-1 rounded-sm mt-0.5">
                    RESERVABLE
                  </span>
                )}
                {hasChildren && (
                  <span className="text-[7px] bg-purple-500 text-white px-1 rounded-sm mt-0.5">
                    HAS SUB-AREAS
                  </span>
                )}
              </div>
            )}

            {/* Lock indicator */}
            {obj.is_locked && (
              <div className="absolute top-0.5 right-0.5 text-[8px]">🔒</div>
            )}

            {/* Resize handle (bottom-right) */}
            {isSelected && !obj.is_locked && (
              <div
                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-black border border-white cursor-se-resize z-50"
                onPointerDown={e => handleResizePointerDown(e, obj)}
              />
            )}

            {/* Size tooltip when selected */}
            {isSelected && (
              <div className="absolute -bottom-5 left-0 text-[8px] font-mono bg-black text-white px-1 whitespace-nowrap pointer-events-none z-50">
                {obj.width_ft}×{obj.height_ft}ft at ({obj.x},{obj.y})
              </div>
            )}
          </div>
        )
      })}

      {/* Utility Lines SVG Overlay */}
      {showUtilityLines && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={widthFt * scale}
          height={lengthFt * scale}
          style={{ zIndex: 40 }}
        >
          {/* Existing saved lines */}
          {utilityLines.map(line => {
            const color = LINE_COLORS[line.line_type]
            const isSelected = selectedLineId === line.id
            return (
              <g key={line.id}>
                {/* Wider invisible hit area for clicking */}
                <path
                  d={pointsToSvgPath(line.points)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12}
                  className="pointer-events-stroke cursor-pointer"
                  onClick={e => handleLineClick(e, line.id)}
                />
                {/* Visible line */}
                <path
                  d={pointsToSvgPath(line.points)}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelected ? 5 : 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={line.line_type === 'water' ? '8 4' : 'none'}
                  opacity={isSelected ? 1 : 0.8}
                  className="pointer-events-stroke cursor-pointer"
                  onClick={e => handleLineClick(e, line.id)}
                />
                {/* Selection indicators at vertices */}
                {isSelected && line.points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x * scale}
                    cy={pt.y * scale}
                    r={4}
                    fill="white"
                    stroke={color}
                    strokeWidth={2}
                  />
                ))}
                {/* Label at midpoint */}
                {line.label && line.points.length >= 2 && (
                  <text
                    x={(line.points[0].x + line.points[line.points.length - 1].x) / 2 * scale}
                    y={(line.points[0].y + line.points[line.points.length - 1].y) / 2 * scale - 8}
                    textAnchor="middle"
                    className="text-[9px] font-bold uppercase fill-current pointer-events-none"
                    style={{ color }}
                  >
                    {line.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Currently drawing line preview */}
          {drawingMode && drawingPoints.length > 0 && (
            <g>
              <path
                d={pointsToSvgPath(
                  currentMousePos
                    ? [...drawingPoints, currentMousePos]
                    : drawingPoints
                )}
                fill="none"
                stroke={LINE_COLORS[drawingMode]}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={drawingMode === 'water' ? '8 4' : 'none'}
                opacity={0.6}
              />
              {/* Dots at each placed point */}
              {drawingPoints.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x * scale}
                  cy={pt.y * scale}
                  r={5}
                  fill={LINE_COLORS[drawingMode]}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
              {/* Cursor dot */}
              {currentMousePos && (
                <circle
                  cx={currentMousePos.x * scale}
                  cy={currentMousePos.y * scale}
                  r={4}
                  fill="white"
                  stroke={LINE_COLORS[drawingMode]}
                  strokeWidth={2}
                  opacity={0.7}
                />
              )}
            </g>
          )}
        </svg>
      )}

      {/* Drawing mode indicator */}
      {drawingMode && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black z-50 select-none"
          style={{
            backgroundColor: drawingMode === 'power' ? '#FEF08A' : '#BFDBFE',
            color: '#000',
          }}
        >
          Drawing {drawingMode} line — Click to place points, Double-click to finish
        </div>
      )}

      {/* Scale indicator */}
      <div className="absolute bottom-2 left-2 bg-white/80 border-2 border-black px-2 py-1 text-xs font-bold pointer-events-none select-none">
        {gridSizeFt}ft
        <div
          className="h-1 bg-black mt-1"
          style={{ width: gridSizeFt * scale }}
        />
      </div>
    </div>
  )
}
