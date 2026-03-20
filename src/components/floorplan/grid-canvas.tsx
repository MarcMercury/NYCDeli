'use client'

import { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { FloorplanObjectRow } from '@/types/database'
import { getTemplateForType } from './object-templates'

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
    if (e.target === canvasRef.current) {
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
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden p-0.5">
                <span className="text-[10px]">{template?.icon || '📦'}</span>
                <span
                  className="text-[9px] font-black uppercase tracking-wider text-center leading-tight text-black/80 truncate max-w-full px-0.5"
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

      {/* Compass */}
      <div className="absolute top-2 right-2 bg-white/80 border-2 border-black p-2 text-xs pointer-events-none select-none">
        <div className="text-center font-bold">N</div>
        <div className="flex justify-between">
          <span>W</span>
          <span className="mx-2">⊕</span>
          <span>E</span>
        </div>
        <div className="text-center font-bold">S</div>
      </div>

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
