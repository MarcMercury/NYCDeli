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

function tentEntrance(o: FloorplanObjectRow): string {
  const side = o.properties?.entrance_side
  const count = o.properties?.entrance_count
  const sideTxt = side === 'length' ? 'long side' : side === 'width' ? 'short side' : side === 'both' ? 'long + short' : ''
  if (!side && !count) return '—'
  return `${count ? `${count}× ` : ''}${sideTxt}`.trim()
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, Math.max(1, max - 1)) + '…' : s
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
  const tents: TentRow[] = objects
    .filter(o => o.object_type === 'tent')
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((o, i) => ({
      ...o,
      ref: i + 1,
      gridCell: `${colLetter(o.x / grid)}${Math.floor(o.y / grid) + 1}`,
    }))

  // Crop the view to the shade area (plus tents), padded and clamped to the lot.
  const framed = shades.length > 0 ? shades : tents
  const pad = 8
  let x0 = 0, y0 = 0, x1 = config.width_ft, y1 = config.length_ft
  if (framed.length > 0) {
    x0 = Math.min(...framed.map(o => o.x))
    y0 = Math.min(...framed.map(o => o.y))
    x1 = Math.max(...framed.map(o => o.x + o.width_ft))
    y1 = Math.max(...framed.map(o => o.y + o.height_ft))
    // Include any tents that spill outside the shade footprint
    for (const t of tents) {
      x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y)
      x1 = Math.max(x1, t.x + t.width_ft); y1 = Math.max(y1, t.y + t.height_ft)
    }
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad)
    x1 = Math.min(config.width_ft, x1 + pad); y1 = Math.min(config.length_ft, y1 + pad)
  }
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
            No tents placed on the active layout yet. Generate and place tents in the{' '}
            <a href="/admin/layout-builder" className="underline font-bold">Layout Builder</a> first.
          </div>
        ) : (
          <>
            {/* Schematic */}
            <section>
              <p className="text-xs mb-2">
                Personal tents inside the shaded area, labeled by occupant. Numbers match the roster below.
                Grid squares are {grid}&apos; × {grid}&apos;.
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

                  {/* Tents */}
                  {tents.map(t => {
                    const cx = t.x + t.width_ft / 2
                    const cy = t.y + t.height_ft / 2
                    const nameSize = Math.max(1.6, Math.min(3, Math.min(t.width_ft, t.height_ft) * 0.26))
                    const maxChars = Math.max(3, Math.floor(t.width_ft / (nameSize * 0.62)))
                    const name = truncate(t.label || `Tent ${t.ref}`, maxChars)
                    return (
                      <g key={t.id} transform={t.rotation ? `rotate(${t.rotation} ${cx} ${cy})` : undefined}>
                        <rect x={t.x} y={t.y} width={t.width_ft} height={t.height_ft}
                          fill={t.color || '#60a5fa'} fillOpacity={0.4} stroke="#1e3a8a" strokeWidth={0.5} />
                        <text x={t.x + 1} y={t.y + 3.5} fontSize={2.6} fill="#1e3a8a" fontWeight="bold">{t.ref}</text>
                        <text x={cx} y={cy + nameSize * 0.35} fontSize={nameSize} textAnchor="middle" fill="#111827" fontWeight="bold">
                          {name}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </section>

            {/* Roster */}
            <section className="break-before">
              <h2 className="text-lg font-black uppercase tracking-wider mb-1">Tent Roster</h2>
              <table className="w-full text-xs border-2 border-black border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <Th>#</Th><Th>Occupant(s)</Th><Th>Size (W×L)</Th><Th>Grid</Th><Th>Entrance</Th><Th>Make / Model</Th>
                  </tr>
                </thead>
                <tbody>
                  {tents.map(t => (
                    <tr key={t.id} className="border-t border-black">
                      <Td className="font-bold">{t.ref}</Td>
                      <Td>{t.label || '—'}</Td>
                      <Td>{t.width_ft}&apos; × {t.height_ft}&apos;</Td>
                      <Td>{t.gridCell}</Td>
                      <Td>{tentEntrance(t)}</Td>
                      <Td>{t.properties?.tent_make_model || '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs mt-2 font-bold">{tents.length} tents</p>
            </section>
          </>
        )}

        <footer className="text-[10px] text-gray-500 pt-4 border-t border-gray-300">
          Generated from active floorplan “{config.name}” (v{config.layout_version}). Re-print after any layout change.
        </footer>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="border border-black px-1.5 py-1 text-left font-bold">{children}</th>
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`border border-black px-1.5 py-1 ${className}`}>{children}</td>
}
