'use client'

/**
 * Site Staking & Flagging Plan — a print-optimized build document generated
 * from the active floorplan. Gives the field crew a scaled grid schematic, a
 * corner-offset coordinate table to stake every object from a single datum
 * corner, a large-item delivery/flagging checklist, and step-by-step field
 * instructions for measuring the lot, laying a grid, and flagging placements.
 */

import { useEffect, useState } from 'react'
import {
  fetchActiveFloorplan,
  fetchFloorplanObjects,
  fetchUtilityLines,
  updateFloorplan,
} from '@/lib/floorplan'
import { OBJECT_TEMPLATES } from '@/components/floorplan/object-templates'
import type { FloorplanConfigRow, FloorplanObjectRow, UtilityLineRow } from '@/types/database'

// ── Object type lookup (label / color) ────────────────────────────────────
const TEMPLATE_BY_TYPE = new Map(OBJECT_TEMPLATES.map(t => [t.type, t]))

function typeLabel(type: string): string {
  return TEMPLATE_BY_TYPE.get(type as never)?.label
    ?? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
function typeColor(type: string, fallback: string): string {
  return fallback || TEMPLATE_BY_TYPE.get(type as never)?.defaultColor || '#cbd5e1'
}

// Painted zones / annotations — surveyed as areas, not delivered objects.
const ZONE_TYPES = new Set([
  'fire_lane', 'road', 'path_of_travel', 'neighbor_zone', 'fence',
  'distance_marker', 'sign', 'custom',
])

// Excluded from the staking plan entirely (like tents & roads).
const EXCLUDED_TYPES = new Set(['tent', 'road', 'shade_structure', 'shade_sail'])

// Located on the plan but never corner-flagged, even when large.
const NEVER_FLAG_TYPES = new Set(['bike_parking', 'storage', 'swamp_cooler'])

// Types that always arrive by truck/trailer and must be corner-flagged first.
const DELIVERY_TYPES = new Set([
  'refrigerated_truck', 'pc_container', 'shower_container',
  'greywater_tank', 'generator', 'rv', 'art_car',
  'water_station', 'fuel_storage', 'propane_storage',
])

function isLargeDelivered(o: FloorplanObjectRow): boolean {
  if (ZONE_TYPES.has(o.object_type) || NEVER_FLAG_TYPES.has(o.object_type)) return false
  const area = o.width_ft * o.height_ft
  return DELIVERY_TYPES.has(o.object_type) || area >= 200 || o.width_ft >= 20 || o.height_ft >= 20
}

// Bijective base-26 column letters: 0->A, 25->Z, 26->AA …
function colLetter(n: number): string {
  let s = ''
  let x = Math.floor(n)
  do {
    s = String.fromCharCode(65 + (x % 26)) + s
    x = Math.floor(x / 26) - 1
  } while (x >= 0)
  return s
}

const LINE_COLORS: Record<string, string> = { power: '#CA8A04', water: '#2563EB' }

type Corner = 'NW' | 'NE' | 'SW' | 'SE'
const DIR_LABEL: Record<string, string> = { north: 'North', south: 'South', east: 'East', west: 'West' }

function entranceDir(o: FloorplanObjectRow): string | null {
  const d = o.properties?.door_direction
  return d ? (DIR_LABEL[d] ?? d) : null
}

// Four staked corners in feet from the SW datum, rotated about the object's
// center. e = feet east of the west edge, n = feet north of the south edge.
function cornersOf(o: FloorplanObjectRow, lotLength: number): Record<Corner, { e: number; n: number }> {
  const cx = o.x + o.width_ft / 2
  const cy = o.y + o.height_ft / 2
  const rad = ((o.rotation || 0) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const raw: Record<Corner, [number, number]> = {
    NW: [o.x, o.y],
    NE: [o.x + o.width_ft, o.y],
    SW: [o.x, o.y + o.height_ft],
    SE: [o.x + o.width_ft, o.y + o.height_ft],
  }
  const out = {} as Record<Corner, { e: number; n: number }>
  ;(Object.keys(raw) as Corner[]).forEach(k => {
    const [px, py] = raw[k]
    const dx = px - cx
    const dy = py - cy
    out[k] = {
      e: Math.round(cx + dx * cos - dy * sin),
      n: Math.round(lotLength - (cy + dx * sin + dy * cos)),
    }
  })
  return out
}

// Which two corners sit on the entrance edge, for highlighting.
function cornerOnEntrance(k: Corner, door: string | undefined): boolean {
  switch (door) {
    case 'north': return k === 'NW' || k === 'NE'
    case 'south': return k === 'SW' || k === 'SE'
    case 'east': return k === 'NE' || k === 'SE'
    case 'west': return k === 'NW' || k === 'SW'
    default: return false
  }
}

interface Placed extends FloorplanObjectRow {
  ref: number
  flagged: boolean
  gridCell: string
}

export const dynamic = 'force-dynamic'

export default function StakingPlanPage() {
  const [config, setConfig] = useState<FloorplanConfigRow | null>(null)
  const [objects, setObjects] = useState<FloorplanObjectRow[]>([])
  const [lines, setLines] = useState<UtilityLineRow[]>([])
  const [loading, setLoading] = useState(true)
  // Which object ids are included on the plan. null = not yet initialised.
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null)
  // Last selection persisted to the floorplan; null = nothing saved yet.
  const [savedIds, setSavedIds] = useState<string[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const fp = await fetchActiveFloorplan()
      if (!fp) {
        if (active) setLoading(false)
        return
      }
      const [objs, uls] = await Promise.all([
        fetchFloorplanObjects(fp.id),
        fetchUtilityLines(fp.id),
      ])
      if (!active) return
      setConfig(fp)
      setObjects(objs)
      setLines(uls)
      const stakeableIds = objs.filter(o => !EXCLUDED_TYPES.has(o.object_type)).map(o => o.id)
      const saved = fp.staking_plan_selection
      if (saved) {
        // Drop ids for objects that no longer exist on the layout.
        const kept = saved.filter(id => stakeableIds.includes(id))
        setSelectedIds(new Set(kept))
        setSavedIds(kept)
      } else {
        // Default selection: every stakeable (non-excluded) object.
        setSelectedIds(new Set(stakeableIds))
      }
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-bold uppercase tracking-wider">Building staking plan…</p>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-4xl">📐</p>
        <p className="font-bold uppercase tracking-wider">No active floorplan found</p>
        <a href="/admin/layout-builder" className="underline font-bold">Open the Layout Builder →</a>
      </div>
    )
  }

  const W = config.width_ft
  const L = config.length_ft
  const grid = config.grid_size_ft || 10

  // Every stakeable object (tents & roads excluded), in top-to-bottom,
  // left-to-right reading order. This is the pool for the selection panel.
  const stakeable = [...objects]
    .filter(o => !EXCLUDED_TYPES.has(o.object_type))
    .sort((a, b) => a.y - b.y || a.x - b.x)

  const sel = selectedIds ?? new Set(stakeable.map(o => o.id))
  const selectAll = () => setSelectedIds(new Set(stakeable.map(o => o.id)))
  const selectNone = () => setSelectedIds(new Set())
  const selectLargeOnly = () => setSelectedIds(new Set(stakeable.filter(isLargeDelivered).map(o => o.id)))
  const toggleOne = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev ?? stakeable.map(o => o.id))
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const dirty =
    savedIds === null || savedIds.length !== sel.size || savedIds.some(id => !sel.has(id))

  const savePlan = async () => {
    setSaving(true)
    setSaveError(null)
    const ids = stakeable.filter(o => sel.has(o.id)).map(o => o.id)
    const updated = await updateFloorplan(config.id, { staking_plan_selection: ids })
    if (updated) setSavedIds(ids)
    else setSaveError('Could not save — check your connection and try again.')
    setSaving(false)
  }

  const revertPlan = () => setSelectedIds(new Set(savedIds ?? stakeable.map(o => o.id)))

  // Selected objects, renumbered 1..n in reading order so refs match the sheet.
  const placed: Placed[] = stakeable
    .filter(o => sel.has(o.id))
    .map((o, i) => ({
      ...o,
      ref: i + 1,
      flagged: isLargeDelivered(o),
      // Grid cell of the object's SW corner — column A→ from the west edge,
      // row 1↑ from the south edge, so A1 is the SW corner of the lot.
      gridCell: `${colLetter(o.x / grid)}${Math.floor((L - o.y - o.height_ft) / grid) + 1}`,
    }))

  // 4-corner detail for every selected object, largest footprint first.
  const cornerPlan = [...placed].sort((a, b) => b.width_ft * b.height_ft - a.width_ft * a.height_ft)

  const stakeCount = placed.length * 4 + 4 // 4 corners per object + 4 lot corners

  // ── SVG geometry (units = feet) ──────────────────────────────────────────
  const M = 26 // margin for axis labels
  const cols = Math.ceil(W / grid)
  const rows = Math.ceil(L / grid)
  const frontage = config.frontage_sides || []

  return (
    <div className="staking-root bg-white text-black min-h-screen">
      <style>{`
        @page { size: portrait; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          .staking-root { padding: 0 !important; }
          .break-before { break-before: page; }
          html, body { background: #fff !important; }
        }
      `}</style>

      {/* Toolbar (screen only) */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 bg-black text-white px-4 py-3">
        <div className="flex items-center gap-3">
          <a href="/admin/layout-builder" className="text-sm font-bold underline">← Layout Builder</a>
          <a href="/admin/tent-map" className="text-sm font-bold underline">Tent Map</a>
          <span className="text-sm opacity-70">Site Staking &amp; Flagging Plan</span>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-white text-black font-black uppercase tracking-wider text-sm px-4 py-1.5 border-2 border-white hover:bg-yellow-300"
        >
          🖨️ Print / Save PDF
        </button>
      </div>

      {/* ── Object selection panel (screen only) ── */}
      <div className="no-print max-w-4xl mx-auto px-6 pt-6">
        <div className="border-2 border-black">
          <div className="flex items-center justify-between gap-3 bg-gray-100 px-3 py-2 border-b-2 border-black flex-wrap">
            <button
              onClick={() => setPickerOpen(o => !o)}
              className="flex items-center gap-2 font-black uppercase tracking-wider text-sm"
              aria-expanded={pickerOpen}
            >
              <span className="inline-block w-3 text-xs">{pickerOpen ? '▾' : '▸'}</span>
              Include on plan · {placed.length}/{stakeable.length} objects
            </button>
            <div className="flex items-center gap-2 text-xs">
              <button onClick={selectAll} className="font-bold underline">All</button>
              <button onClick={selectNone} className="font-bold underline">None</button>
              <button onClick={selectLargeOnly} className="font-bold underline">Large / delivered only</button>
              {dirty && savedIds !== null && (
                <button onClick={revertPlan} className="font-bold underline">Revert</button>
              )}
              <button
                onClick={savePlan}
                disabled={saving || !dirty}
                className="font-black uppercase tracking-wider px-3 py-1 border-2 border-black bg-black text-white disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-300"
              >
                {saving ? 'Saving…' : dirty ? 'Save plan' : '✓ Saved'}
              </button>
            </div>
          </div>
          {saveError && (
            <p className="px-3 pt-2 text-[11px] font-bold text-red-600">{saveError}</p>
          )}
          {dirty && savedIds !== null && !saveError && (
            <p className="px-3 pt-2 text-[11px] font-bold text-yellow-700">
              Unsaved changes — click Save plan to keep this selection.
            </p>
          )}
          {pickerOpen && (
            <>
              <p className="px-3 pt-2 text-[11px] text-gray-600">
                Tick the objects you want measured on the printable plan. The schematic, corner table, and
                coordinate table update automatically. Tents are on the separate Tent Location Map.
              </p>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 max-h-72 overflow-auto">
                {stakeable.length === 0 && (
                  <p className="col-span-full text-sm text-gray-500">No stakeable objects in this layout.</p>
                )}
                {stakeable.map(o => {
                  const checked = sel.has(o.id)
                  return (
                    <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(o.id)}
                        className="w-4 h-4 accent-black"
                      />
                      <span className={checked ? '' : 'text-gray-400'}>
                        {o.label || typeLabel(o.object_type)}
                        {isLargeDelivered(o) && <span className="text-red-600 font-bold"> ▲</span>}
                        <span className="text-gray-400 text-[11px]"> · {typeLabel(o.object_type)}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* ── Document header ── */}
        <header className="border-2 border-black p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wider leading-tight">
                Site Staking &amp; Flagging Plan
              </h1>
              <p className="text-sm font-bold">{config.camp_name || config.name}</p>
            </div>
            <div className="text-right text-xs leading-5">
              <div><span className="font-bold">Lot:</span> {W}&apos; (E–W) × {L}&apos; (N–S)</div>
              <div><span className="font-bold">Grid:</span> {grid}&apos; squares</div>
              <div><span className="font-bold">Layout v:</span> {config.layout_version}</div>
              <div><span className="font-bold">Printed:</span> {new Date().toLocaleDateString()}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <FieldBox label="Lead / Surveyor" />
            <FieldBox label="BRC Address" />
            <FieldBox label="Datum corner ID" />
            <FieldBox label="Date staked" />
          </div>
        </header>

        {/* ── Schematic ── */}
        <section>
          <SectionTitle n={1} title="Grid Schematic" />
          <p className="text-xs mb-2">
            Datum <strong>★</strong> is the <strong>south-west (bottom-left) corner</strong> of the lot and reads
            <strong> 0 × 0</strong>. Grid square <strong>A1</strong> sits on that datum — columns run
            <strong> A→ east</strong> and rows run <strong>1↑ north</strong>. Every corner is measured from the datum as
            <strong> North × East</strong> — <strong>North first</strong> (feet up from the south edge),
            <strong> then East</strong> (feet in from the west edge). Example: an object whose south-west corner is
            2&apos; north and 5&apos; east reads <strong>2 × 5</strong>. Squares are {grid}&apos; × {grid}&apos;.
            Items marked <span className="text-red-600 font-bold">▲</span> are large / delivered — corner-flag these
            before anything else lands. <strong>Individual tents are not shown here</strong> — see the separate{' '}
            <a href="/admin/tent-map" className="underline font-bold">Tent Location Map</a>.
          </p>
          <div className="border-2 border-black p-2">
            <svg
              viewBox={`${-M} ${-M} ${W + 2 * M} ${L + 2 * M}`}
              width="100%"
              style={{ height: 'auto', maxHeight: '900px' }}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grid lines */}
              {Array.from({ length: cols + 1 }, (_, c) => (
                <line key={`v${c}`} x1={c * grid} y1={0} x2={c * grid} y2={L}
                  stroke="#d1d5db" strokeWidth={0.4} />
              ))}
              {Array.from({ length: rows + 1 }, (_, r) => (
                <line key={`h${r}`} x1={0} y1={r * grid} x2={W} y2={r * grid}
                  stroke="#d1d5db" strokeWidth={0.4} />
              ))}

              {/* Column letters (bottom, A→ east) + row numbers (left, 1↑ north) */}
              {Array.from({ length: cols }, (_, c) => (
                <text key={`cl${c}`} x={c * grid + grid / 2} y={L + 9}
                  fontSize={6} textAnchor="middle" fill="#6b7280" fontWeight="bold">
                  {colLetter(c)}
                </text>
              ))}
              {Array.from({ length: rows }, (_, r) => (
                <text key={`rl${r}`} x={-8} y={r * grid + grid / 2 + 2}
                  fontSize={6} textAnchor="middle" fill="#6b7280" fontWeight="bold">
                  {rows - r}
                </text>
              ))}

              {/* Lot boundary */}
              <rect x={0} y={0} width={W} height={L} fill="none" stroke="#000" strokeWidth={1.4} />

              {/* Frontage highlight */}
              {frontage.includes('north') && <line x1={0} y1={0} x2={W} y2={0} stroke="#dc2626" strokeWidth={2.5} />}
              {frontage.includes('south') && <line x1={0} y1={L} x2={W} y2={L} stroke="#dc2626" strokeWidth={2.5} />}
              {frontage.includes('west') && <line x1={0} y1={0} x2={0} y2={L} stroke="#dc2626" strokeWidth={2.5} />}
              {frontage.includes('east') && <line x1={W} y1={0} x2={W} y2={L} stroke="#dc2626" strokeWidth={2.5} />}

              {/* Border labels */}
              <text x={W / 2} y={-15} fontSize={7} textAnchor="middle" fontWeight="bold">
                {config.border_label_north || 'NORTH'} {frontage.includes('north') ? '(FRONTAGE)' : ''}
              </text>
              <text x={W / 2} y={L + 20} fontSize={7} textAnchor="middle" fontWeight="bold">
                {config.border_label_south || 'SOUTH'} {frontage.includes('south') ? '(FRONTAGE)' : ''}
              </text>
              <text x={-14} y={L / 2} fontSize={7} textAnchor="middle" fontWeight="bold"
                transform={`rotate(-90 ${-14} ${L / 2})`}>
                {config.border_label_west || 'WEST'} {frontage.includes('west') ? '(FRONTAGE)' : ''}
              </text>
              <text x={W + 16} y={L / 2} fontSize={7} textAnchor="middle" fontWeight="bold"
                transform={`rotate(90 ${W + 16} ${L / 2})`}>
                {config.border_label_east || 'EAST'} {frontage.includes('east') ? '(FRONTAGE)' : ''}
              </text>

              {/* Dimension labels */}
              <text x={W / 2} y={L - 3} fontSize={5} textAnchor="middle" fill="#374151">{W}&apos; wide</text>
              <text x={3} y={L / 2} fontSize={5} textAnchor="start" fill="#374151">{L}&apos; deep</text>

              {/* Utility lines */}
              {lines.map(ln => (
                <polyline key={ln.id}
                  points={ln.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={LINE_COLORS[ln.line_type] || '#000'}
                  strokeWidth={1.2}
                  strokeDasharray={ln.line_type === 'water' ? '3 2' : undefined}
                />
              ))}

              {/* Objects */}
              {placed.map(o => {
                const cx = o.x + o.width_ft / 2
                const cy = o.y + o.height_ft / 2
                const fontSize = Math.max(3, Math.min(7, Math.min(o.width_ft, o.height_ft) * 0.5))
                return (
                  <g key={o.id} transform={o.rotation ? `rotate(${o.rotation} ${cx} ${cy})` : undefined}>
                    <rect
                      x={o.x} y={o.y} width={o.width_ft} height={o.height_ft}
                      fill={typeColor(o.object_type, o.color)}
                      fillOpacity={0.35}
                      stroke={o.flagged ? '#dc2626' : '#111827'}
                      strokeWidth={o.flagged ? 1.4 : 0.6}
                      strokeDasharray={o.flagged ? '2 1.5' : undefined}
                    />
                    <text x={cx} y={cy + fontSize * 0.35} fontSize={fontSize}
                      textAnchor="middle" fontWeight="bold" fill="#111827">
                      {o.ref}
                    </text>
                  </g>
                )
              })}

              {/* Datum marker — SW corner */}
              <g>
                <circle cx={0} cy={L} r={4} fill="#facc15" stroke="#000" strokeWidth={0.8} />
                <text x={0} y={L + 2.2} fontSize={5} textAnchor="middle" fontWeight="bold">★</text>
                <text x={6} y={L - 5} fontSize={5} fontWeight="bold">DATUM SW (0,0)</text>
              </g>
            </svg>
          </div>
        </section>

        {/* ── Corner measurement plan for every selected object ── */}
        <section className="break-before">
          <SectionTitle n={2} title="4-Corner Measurement Plan" />
          <p className="text-xs mb-3">
            One block per selected object, largest footprint first. Every corner is written as
            <strong> North × East</strong> measured from the south-west datum (0 × 0):
            <strong> North</strong> = feet up from the south edge, <strong>East</strong> = feet in from the west edge.
            Mark the <strong>SW (bottom-left) corner first</strong>, then measure the object&apos;s length north and
            width east to set the other three. Items marked <span className="text-red-600 font-bold">▲</span> are
            large / delivered — flag all four corners <strong>before</strong> the truck / trailer arrives. The{' '}
            <span className="text-red-600 font-bold">red corners</span> are on the entrance side.
          </p>
          {cornerPlan.length === 0 ? (
            <p className="text-sm text-gray-500 border-2 border-dashed border-gray-400 p-4">
              No objects selected. Use the selection panel above to choose what to measure.
            </p>
          ) : (
            <div className="space-y-4">
              {cornerPlan.map(o => (
                <ItemFlagBlock key={o.id} o={o} lotLength={L} />
              ))}
            </div>
          )}
        </section>

        {/* ── Full staking coordinate table ── */}
        <section className="break-before">
          <SectionTitle n={3} title="Staking Coordinate Table (tents excluded)" />
          <p className="text-xs mb-2">
            Each object&apos;s <strong>SW (bottom-left) corner</strong>, written as
            <strong> North × East</strong> from the south-west datum. <strong>N ↑</strong> = feet up from the south
            edge, <strong> E →</strong> = feet in from the west edge. Mark the SW corner, then measure the length
            north and the width east to set the remaining three corners. Individual tents are on the separate Tent
            Location Map.
          </p>
          <table className="w-full text-xs border-2 border-black border-collapse">
            <thead>
              <tr className="bg-black text-white">
                <Th>#</Th><Th>Label</Th><Th>Type</Th><Th>Size N–S × E–W</Th>
                <Th>N ↑ (north)</Th><Th>E → (east)</Th><Th>Rot</Th><Th>Grid</Th><Th>Flag</Th>
              </tr>
            </thead>
            <tbody>
              {placed.map(o => (
                <tr key={o.id} className={`border-t border-black ${o.flagged ? 'bg-red-50' : ''}`}>
                  <Td className="font-bold">{o.ref}</Td>
                  <Td>{o.label || typeLabel(o.object_type)}</Td>
                  <Td>{typeLabel(o.object_type)}</Td>
                  <Td>{o.height_ft}&apos; × {o.width_ft}&apos;</Td>
                  <Td className="font-bold">{L - o.y - o.height_ft}&apos;</Td>
                  <Td className="font-bold">{o.x}&apos;</Td>
                  <Td>{o.rotation ? `${o.rotation}°` : '—'}</Td>
                  <Td>{o.gridCell}</Td>
                  <Td className="text-center">{o.flagged ? '▲' : ''}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs mt-2 font-bold">
            {placed.length} objects · ~{stakeCount} stakes / flags needed (4 per object + 4 lot corners)
          </p>
        </section>

        {/* ── Field instructions ── */}
        <section className="break-before">
          <SectionTitle n={4} title="Field Procedure" />
          <ol className="text-sm space-y-2 list-decimal pl-5">
            <li>
              <strong>Establish the datum corner.</strong> Identify the real south-west (bottom-left) corner of the
              lot (marked ★ on the schematic). Drive a rebar stake — this is
              point <strong>0 × 0</strong>. Record its BRC address in the header box.
            </li>
            <li>
              <strong>Run the two baselines.</strong> From the datum, pull a {W}&apos; tape east along the south
              edge and a {L}&apos; tape north up the west edge. Stake the other two lot
              corners and verify the diagonals are equal (square the rectangle).
            </li>
            <li>
              <strong>Lay the grid.</strong> Mark {grid}&apos; increments along both baselines and run string
              lines to create the {cols} × {rows} grid. Label columns A→ east and rows 1↑ north so square
              <strong> A1</strong> is the datum corner, matching this plan.
            </li>
            <li>
              <strong>Set each object from its SW corner.</strong> Work the Section&nbsp;2 corner plan, largest
              first. For each object read <strong>North × East</strong>: measure that many feet
              <strong> north</strong> from the south baseline, then that many feet <strong>east</strong> from the west
              baseline, and flag the SW corner. From there measure the object&apos;s length north and width east to flag
              the other three corners. Mark the <span className="text-red-600 font-bold">entrance side</span> so the crew
              drops delivered items facing the right way — set those <span className="text-red-600 font-bold">▲</span>
              items before trucks arrive.
            </li>
            <li>
              <strong>Mark fire lanes &amp; paths of travel.</strong> Chalk or flag the boundaries of any
              fire lane, road, and path-of-travel zones — keep them clear of all placements.
            </li>
            <li>
              <strong>Verify &amp; photograph.</strong> Walk the grid against this sheet, confirm clearances,
              then photograph the flagged lot for the record before build begins.
            </li>
          </ol>
          <div className="mt-4 border-2 border-black p-3 text-xs">
            <p className="font-bold uppercase mb-1">Kit checklist</p>
            <p>
              ☐ 300&apos;+ tape ☐ Rebar &amp; lot-corner stakes ☐ ~{stakeCount} pin flags ☐ Mason string
              ☐ Marking chalk/paint ☐ Sledge ☐ This plan (laminated) ☐ Camera
            </p>
          </div>
        </section>

        <footer className="text-[10px] text-gray-500 pt-4 border-t border-gray-300">
          Generated from active floorplan &ldquo;{config.name}&rdquo; (v{config.layout_version}). Re-print
          after any layout change.
        </footer>
      </div>
    </div>
  )
}

// ── Small presentational helpers ───────────────────────────────────────────
function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="text-lg font-black uppercase tracking-wider mb-1 flex items-center gap-2">
      <span className="bg-black text-white w-6 h-6 inline-flex items-center justify-center text-sm">{n}</span>
      {title}
    </h2>
  )
}

function FieldBox({ label }: { label: string }) {
  return (
    <div className="border border-black px-2 py-1">
      <div className="text-[9px] font-bold uppercase text-gray-500">{label}</div>
      <div className="h-4" />
    </div>
  )
}

// One item's four-corner flag layout, drawn to mirror its real footprint.
function ItemFlagBlock({ o, lotLength }: { o: Placed; lotLength: number }) {
  const c = cornersOf(o, lotLength)
  const dir = entranceDir(o)
  const door = o.properties?.door_direction
  const name = o.label || typeLabel(o.object_type)
  return (
    <div className="border-2 border-black break-inside-avoid">
      <div className="flex items-center justify-between bg-black text-white px-3 py-1.5">
        <div className="font-black uppercase text-sm">#{o.ref} · {name}</div>
        <div className="text-xs">
          {o.height_ft}&apos; × {o.width_ft}&apos; (N–S × E–W) · grid {o.gridCell}{o.rotation ? ` · rotated ${o.rotation}°` : ''}
        </div>
      </div>
      <div className="px-3 py-1 text-xs border-b border-black flex items-center justify-between gap-4">
        <span>
          <strong>Entrance faces:</strong>{' '}
          {dir ? <span className="text-red-600 font-bold">{dir}</span> : <span>__________ (confirm on site)</span>}
        </span>
        <span className="text-gray-500">Corners flagged ☐ &nbsp; Item placed ☐</span>
      </div>
      <div className="grid grid-cols-2">
        {(['SW', 'SE', 'NW', 'NE'] as const).map(k => (
          <FlagCell key={k} corner={k} pt={c[k]} name={name} entrance={cornerOnEntrance(k, door)} />
        ))}
      </div>
    </div>
  )
}

function FlagCell({
  corner,
  pt,
  name,
  entrance,
}: {
  corner: Corner
  pt: { e: number; n: number }
  name: string
  entrance: boolean
}) {
  return (
    <div className={`p-2 border border-black ${entrance ? 'border-2 border-red-600 bg-red-50' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="font-black text-sm">{corner} corner</span>
        {entrance && <span className="text-red-600 font-bold text-[10px]">◄ ENTRANCE</span>}
      </div>
      <div className="text-lg font-black leading-tight">{pt.n}&apos; × {pt.e}&apos;</div>
      <div className="text-[10px] text-gray-600">N {pt.n}&apos; north · E {pt.e}&apos; east</div>
      <div className="text-[10px] text-gray-600">Write on flag: “{name} — {corner}”</div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="border border-black px-1.5 py-1 text-left font-bold">{children}</th>
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`border border-black px-1.5 py-1 ${className}`}>{children}</td>
}
