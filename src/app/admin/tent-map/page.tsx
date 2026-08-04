'use client'

/**
 * Tent Location Map — a print-optimized view of just the large shaded area with
 * each tent identified by its occupant(s). Cropped to the shade structure(s) so
 * the setup crew can place personal tents by name under the shade.
 */

import { useEffect, useState } from 'react'
import { fetchActiveFloorplan, fetchFloorplanObjects } from '@/lib/floorplan'
import type { FloorplanConfigRow, FloorplanObjectRow } from '@/types/database'

const SHADE_TYPES = new Set(['shade_structure', 'shade_sail'])

function colLetter(n: number): string {
  let s = ''
  let x = Math.floor(n)
  do {
    s = String.fromCharCode(65 + (x % 26)) + s
    x = Math.floor(x / 26) - 1
  } while (x >= 0)
  return s
}

interface Box { x0: number; y0: number; x1: number; y1: number }

function inBox(o: FloorplanObjectRow, b: Box): boolean {
  const cx = o.x + o.width_ft / 2
  const cy = o.y + o.height_ft / 2
  return cx >= b.x0 && cx <= b.x1 && cy >= b.y0 && cy <= b.y1
}

// A short opening segment on a tent edge plus its outward normal (nx, ny).
interface Edge { x1: number; y1: number; x2: number; y2: number; nx: number; ny: number }

// Entrance/opening edge(s) in the tent's local (unrotated) coords, so they
// rotate with the tent group and point in the real on-ground direction.
// Edge selection MUST mirror TentDetail in object-detail-svg.tsx so the
// entrance markers here match exactly what the Layout Builder shows.
type EdgeDir = 'top' | 'bottom' | 'left' | 'right'
function entranceEdges(t: FloorplanObjectRow): Edge[] {
  const side = t.properties?.entrance_side
  if (!side) return []
  const w = t.width_ft, h = t.height_ft
  const frac = 0.6
  const edgeFor = (dir: EdgeDir): Edge => {
    switch (dir) {
      case 'top':
        return { x1: t.x + w / 2 - (w * frac) / 2, y1: t.y, x2: t.x + w / 2 + (w * frac) / 2, y2: t.y, nx: 0, ny: -1 }
      case 'bottom':
        return { x1: t.x + w / 2 - (w * frac) / 2, y1: t.y + h, x2: t.x + w / 2 + (w * frac) / 2, y2: t.y + h, nx: 0, ny: 1 }
      case 'left':
        return { x1: t.x, y1: t.y + h / 2 - (h * frac) / 2, x2: t.x, y2: t.y + h / 2 + (h * frac) / 2, nx: -1, ny: 0 }
      case 'right':
        return { x1: t.x + w, y1: t.y + h / 2 - (h * frac) / 2, x2: t.x + w, y2: t.y + h / 2 + (h * frac) / 2, nx: 1, ny: 0 }
    }
  }

  // Same axis mapping as TentDetail: longer physical dimension is the "length".
  const longIsVertical = h >= w
  const longEdges: EdgeDir[] = longIsVertical ? ['left', 'right'] : ['top', 'bottom']
  const shortEdges: EdgeDir[] = longIsVertical ? ['top', 'bottom'] : ['left', 'right']

  const chosen = new Set<EdgeDir>()
  if (side === 'length') longEdges.forEach(s => chosen.add(s))
  else if (side === 'width') shortEdges.forEach(s => chosen.add(s))
  else if (side === 'both') { longEdges.forEach(s => chosen.add(s)); shortEdges.forEach(s => chosen.add(s)) }

  // Prefer long edges first, then short — identical ordering to TentDetail.
  const ordered = [...longEdges, ...shortEdges].filter(s => chosen.has(s))
  const count = t.properties?.entrance_count
  const cap = typeof count === 'number' && count > 0 ? count : ordered.length
  return ordered.slice(0, cap).map(edgeFor)
}

// Split an occupant label into stacked lines (one word/name per line) so it
// reads cleanly upright. Common separators (space, slash, ampersand, comma).
function wrapLabel(label: string): string[] {
  const words = label.split(/[\s/&,]+/).map(w => w.trim()).filter(Boolean)
  return words.length > 0 ? words : [label]
}

// The horizontal footprint available for upright text depends on how the tent
// is oriented. Tent layouts snap to orthogonal angles, so treat rotations near
// 90°/270° as swapping the width/height that faces horizontal.
function uprightExtent(t: FloorplanObjectRow): { availW: number; availH: number } {
  const rot = ((t.rotation || 0) % 180 + 180) % 180
  const swapped = rot > 45 && rot < 135
  return swapped
    ? { availW: t.height_ft, availH: t.width_ft }
    : { availW: t.width_ft, availH: t.height_ft }
}

interface TentRow extends FloorplanObjectRow {
  ref: number
  gridCell: string
}

export const dynamic = 'force-dynamic'

export default function TentMapPage() {
  const [config, setConfig] = useState<FloorplanConfigRow | null>(null)
  const [objects, setObjects] = useState<FloorplanObjectRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const fp = await fetchActiveFloorplan()
      if (!fp) {
        if (active) setLoading(false)
        return
      }
      const objs = await fetchFloorplanObjects(fp.id)
      if (!active) return
      setConfig(fp)
      setObjects(objs)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-bold uppercase tracking-wider">Building tent map…</p>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-4xl">⛺</p>
        <p className="font-bold uppercase tracking-wider">No active floorplan found</p>
        <a href="/admin/layout-builder" className="underline font-bold">Open the Layout Builder →</a>
      </div>
    )
  }

  const grid = config.grid_size_ft || 10
  const shades = objects.filter(o => SHADE_TYPES.has(o.object_type))

  // The zone is the union footprint of all shade structures — the only area shown.
  const zone: Box | null = shades.length > 0
    ? {
        x0: Math.min(...shades.map(s => s.x)),
        y0: Math.min(...shades.map(s => s.y)),
        x1: Math.max(...shades.map(s => s.x + s.width_ft)),
        y1: Math.max(...shades.map(s => s.y + s.height_ft)),
      }
    : null

  // Only tents whose center falls inside the shade zone are shown here.
  const tents: TentRow[] = objects
    .filter(o => o.object_type === 'tent' && (!zone || inBox(o, zone)))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((o, i) => ({
      ...o,
      ref: i + 1,
      gridCell: `${colLetter(o.x / grid)}${Math.floor(o.y / grid) + 1}`,
    }))

  // Crop tightly to the shade zone (fallback to tents / whole lot), padded + clamped.
  const pad = 4
  let x0 = 0, y0 = 0, x1 = config.width_ft, y1 = config.length_ft
  if (zone) {
    ;({ x0, y0, x1, y1 } = zone)
  } else if (tents.length > 0) {
    x0 = Math.min(...tents.map(o => o.x))
    y0 = Math.min(...tents.map(o => o.y))
    x1 = Math.max(...tents.map(o => o.x + o.width_ft))
    y1 = Math.max(...tents.map(o => o.y + o.height_ft))
  }
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad)
  x1 = Math.min(config.width_ft, x1 + pad); y1 = Math.min(config.length_ft, y1 + pad)
  const viewW = x1 - x0
  const viewH = y1 - y0
  const M = 14

  // Grid line positions inside the crop
  const vLines: number[] = []
  for (let gx = Math.ceil(x0 / grid) * grid; gx <= x1; gx += grid) vLines.push(gx)
  const hLines: number[] = []
  for (let gy = Math.ceil(y0 / grid) * grid; gy <= y1; gy += grid) hLines.push(gy)

  return (
    <div className="tentmap-root bg-white text-black min-h-screen">
      <style>{`
        @page { size: portrait; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          .tentmap-root { padding: 0 !important; }
          .break-before { break-before: page; }
          html, body { background: #fff !important; }
        }
      `}</style>

      {/* Toolbar (screen only) */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 bg-black text-white px-4 py-3">
        <div className="flex items-center gap-3">
          <a href="/admin/layout-builder" className="text-sm font-bold underline">← Layout Builder</a>
          <a href="/admin/staking-plan" className="text-sm font-bold underline">Staking Plan</a>
          <span className="text-sm opacity-70">Tent Location Map</span>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-white text-black font-black uppercase tracking-wider text-sm px-4 py-1.5 border-2 border-white hover:bg-yellow-300"
        >
          🖨️ Print / Save PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="border-2 border-black p-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider leading-tight">Tent Location Map</h1>
            <p className="text-sm font-bold">{config.camp_name || config.name}</p>
          </div>
          <div className="text-right text-xs leading-5">
            <div><span className="font-bold">Tents:</span> {tents.length}</div>
            <div><span className="font-bold">Shade area:</span> {shades.length} structure{shades.length === 1 ? '' : 's'}</div>
            <div><span className="font-bold">Grid:</span> {grid}&apos; squares</div>
            <div><span className="font-bold">Printed:</span> {new Date().toLocaleDateString()}</div>
          </div>
        </header>

        {tents.length === 0 ? (
          <div className="border-2 border-black p-6 text-center text-sm">
            No tents placed inside the shade zone on the active layout yet. Generate and place tents in the{' '}
            <a href="/admin/layout-builder" className="underline font-bold">Layout Builder</a> first.
          </div>
        ) : (
          <section>
            <p className="text-xs mb-2">
              Personal tents inside the shaded area, labeled by occupant. The{' '}
              <span className="text-red-600 font-bold">red ▸ marker</span> shows each tent&apos;s entrance /
              opening direction. Grid squares are {grid}&apos; × {grid}&apos;.
            </p>
            <div className="border-2 border-black p-2">
              <svg
                viewBox={`${x0 - M} ${y0 - M} ${viewW + 2 * M} ${viewH + 2 * M}`}
                width="100%"
                style={{ height: 'auto', maxHeight: '920px' }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Grid */}
                {vLines.map(gx => (
                  <line key={`v${gx}`} x1={gx} y1={y0} x2={gx} y2={y1} stroke="#e5e7eb" strokeWidth={0.4} />
                ))}
                {hLines.map(gy => (
                  <line key={`h${gy}`} x1={x0} y1={gy} x2={x1} y2={gy} stroke="#e5e7eb" strokeWidth={0.4} />
                ))}
                {/* Grid coordinate labels */}
                {vLines.map(gx => (
                  <text key={`vl${gx}`} x={gx + grid / 2} y={y0 - 4} fontSize={4} textAnchor="middle" fill="#9ca3af" fontWeight="bold">
                    {colLetter(gx / grid)}
                  </text>
                ))}
                {hLines.map(gy => (
                  <text key={`hl${gy}`} x={x0 - 5} y={gy + grid / 2 + 1.5} fontSize={4} textAnchor="middle" fill="#9ca3af" fontWeight="bold">
                    {gy / grid + 1}
                  </text>
                ))}

                {/* Shade areas */}
                {shades.map(s => (
                  <g key={s.id}>
                    <rect x={s.x} y={s.y} width={s.width_ft} height={s.height_ft}
                      fill="#f59e0b" fillOpacity={0.12} stroke="#b45309" strokeWidth={0.8} strokeDasharray="3 2" />
                    <text x={s.x + s.width_ft / 2} y={s.y + 4} fontSize={3.5} textAnchor="middle" fill="#92400e" fontWeight="bold">
                      SHADE {s.width_ft}×{s.height_ft}
                    </text>
                  </g>
                ))}

                {/* Tents with entrance-direction markers (rotate with the tent) */}
                {tents.map(t => {
                  const cx = t.x + t.width_ft / 2
                  const cy = t.y + t.height_ft / 2
                  const edges = entranceEdges(t)
                  return (
                    <g key={t.id} transform={t.rotation ? `rotate(${t.rotation} ${cx} ${cy})` : undefined}>
                      <rect x={t.x} y={t.y} width={t.width_ft} height={t.height_ft}
                        fill={t.color || '#60a5fa'} fillOpacity={0.4} stroke="#1e3a8a" strokeWidth={0.5} />
                      {edges.map((e, i) => {
                        const mx = (e.x1 + e.x2) / 2, my = (e.y1 + e.y2) / 2
                        const a = Math.max(1.2, Math.min(t.width_ft, t.height_ft) * 0.2)
                        const tip = { x: mx + e.nx * a, y: my + e.ny * a }
                        const px = -e.ny, py = e.nx, b = a * 0.55
                        return (
                          <g key={i}>
                            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#dc2626" strokeWidth={1.1} strokeLinecap="round" />
                            <polygon points={`${mx + px * b},${my + py * b} ${tip.x},${tip.y} ${mx - px * b},${my - py * b}`} fill="#dc2626" />
                          </g>
                        )
                      })}
                      <text x={t.x + 1} y={t.y + 3.5} fontSize={2.6} fill="#1e3a8a" fontWeight="bold">{t.ref}</text>
                    </g>
                  )
                })}

                {/* Occupant names — always upright, sized to fit, drawn on top */}
                {tents.map(t => {
                  const cx = t.x + t.width_ft / 2
                  const cy = t.y + t.height_ft / 2
                  const lines = wrapLabel(t.label || `Tent ${t.ref}`)
                  const maxLen = Math.max(...lines.map(l => l.length))
                  const { availW, availH } = uprightExtent(t)
                  // Fit both across (char width ≈ 0.60·font) and down (line height 1.15·font).
                  const fsW = (availW * 0.92) / (maxLen * 0.6)
                  const fsH = (availH * 0.9) / (lines.length * 1.15)
                  const fs = Math.max(1.8, Math.min(6, fsW, fsH))
                  const lineH = fs * 1.15
                  const y0text = cy - (lines.length * lineH) / 2 + fs * 0.85
                  return (
                    <g key={t.id}>
                      {lines.map((ln, i) => (
                        <text
                          key={i}
                          x={cx}
                          y={y0text + i * lineH}
                          fontSize={fs}
                          textAnchor="middle"
                          fill="#111827"
                          fontWeight="bold"
                          stroke="#ffffff"
                          strokeWidth={fs * 0.16}
                          paintOrder="stroke"
                          strokeLinejoin="round"
                        >
                          {ln}
                        </text>
                      ))}
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-[11px] mt-2">
              <span className="flex items-center gap-1"><span className="text-red-600 font-bold">▸</span> Entrance / opening direction</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border border-blue-900 bg-blue-400/40" /> Tent (numbered by occupant)</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border border-dashed border-amber-700" /> Shade structure</span>
            </div>
            <p className="text-xs mt-2 font-bold">{tents.length} tents in shade zone</p>
          </section>
        )}

        <footer className="text-[10px] text-gray-500 pt-4 border-t border-gray-300">
          Generated from active floorplan “{config.name}” (v{config.layout_version}). Re-print after any layout change.
        </footer>
      </div>
    </div>
  )
}
