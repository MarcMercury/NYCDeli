'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import type { TentNeed } from '@/lib/tent-needs'

interface PendingTentsPaletteProps {
  tents: TentNeed[]
  onRemove: (tentId: string) => void
  onClear: () => void
}

export function PendingTentsPalette({ tents, onRemove, onClear }: PendingTentsPaletteProps) {
  const [collapsed, setCollapsed] = useState(false)

  function handleDragStart(e: React.DragEvent, tent: TentNeed) {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'pending-tent',
        tentId: tent.id,
        label: tent.label,
        width: tent.width,
        height: tent.height,
        entranceCount: tent.entranceCount,
        openingSide: tent.openingSide,
        tentMakeModel: tent.tentMakeModel,
        isPrivileged: tent.isPrivileged,
      }),
    )
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <Card className="border-2 border-black">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setCollapsed(c => !c)}>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>⛺ TENTS {tents.length > 0 && (
            <span className="ml-1 text-xs font-normal text-gray-500">({tents.length} awaiting placement)</span>
          )}</span>
          <span className="text-gray-400 text-xs">{collapsed ? '▶' : '▼'}</span>
        </CardTitle>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-2">
          {tents.length === 0 ? (
            <p className="text-[10px] text-gray-500 uppercase tracking-wider text-center py-2">
              Press Generate Tents to populate
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Drag onto map
                </p>
                <button
                  onClick={onClear}
                  className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider"
                  title="Clear all pending tents"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {tents.map(tent => (
                  <div
                    key={tent.id}
                    draggable
                    onDragStart={e => handleDragStart(e, tent)}
                    className="flex items-center gap-2 p-2 border-2 border-gray-300 bg-white cursor-grab hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:cursor-grabbing transition-all select-none"
                    title={`${tent.label} — ${tent.width}×${tent.height}${tent.isRV ? ' (RV)' : ''}${tent.entranceCount ? ` · ${tent.entranceCount}-side entrance` : ''}${tent.openingSide ? ` · ${tent.openingSide === 'length' ? 'long' : tent.openingSide === 'width' ? 'short' : 'short+long'} side` : ''}${tent.tentMakeModel ? ` · ${tent.tentMakeModel}` : ''}`}
                  >
                    <span className="text-base">{tent.isRV ? '🚐' : '⛺'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider truncate">
                        {tent.label}
                        {tent.isPrivileged && (
                          <span className="ml-1 text-[8px] font-bold text-green-600" title="Builder / Admin">★</span>
                        )}
                      </div>
                      <div className="text-[9px] text-gray-500 font-bold">
                        W {tent.width} × L {tent.height} ft
                        {tent.entranceCount ? ` · ${tent.entranceCount}-side` : ''}
                        {tent.openingSide ? ` · ${tent.openingSide === 'length' ? 'long' : tent.openingSide === 'width' ? 'short' : 'short+long'}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        onRemove(tent.id)
                      }}
                      className="text-red-500 hover:text-red-700 font-bold text-xs px-1"
                      title="Remove from list"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
