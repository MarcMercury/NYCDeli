'use client'

/**
 * Shade Calc — Bill of Materials for shade structures pulled from the Layout Builder.
 *
 * Every shade object on the active floorplan becomes a "Panel": a rectangle with
 * poles ONLY along its outside perimeter (corners + optional intermediate edge
 * poles). A 30×50 sail has no internal 10×10 supports — that was wrong.
 *
 * This page is read/calc only: tweak per-panel params (pole height, edge spacing,
 * frame type, walls) and the BOM updates. The layout is the source of truth —
 * use "Reload from Layout" to resync after editing it.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { fetchActiveFloorplan, fetchFloorplanObjects } from '@/lib/floorplan'
import type { FloorplanObjectRow } from '@/types/database'

// ───────────────────────────── Catalog ─────────────────────────────
type Product = { name: string; sku: string; note: string; weight: number }
const PRODUCTS: Record<string, Product> = {
  pole_10ft:    { name: '1" × 10\' EMT Conduit',                          sku: 'EMT-1-10',   note: 'Galvanized. Cut some to 8\' for low-headroom panels.',                        weight: 5.4 },
  corner_3way:  { name: 'Maker Pipe 90° Corner Connector — 1"',           sku: 'MP-90',      note: 'Two horizontal rails meeting at 90° plus the vertical.',                      weight: 0.6 },
  tee_3way:     { name: 'Maker Pipe T Connector — 1"',                    sku: 'MP-T',       note: 'Two collinear horizontals plus the vertical (intermediate edge pole).',       weight: 0.6 },
  base_flange:  { name: 'Maker Pipe Flange Connector — 1"',               sku: 'MP-FLANGE',  note: 'Bolts every vertical pole to its ground anchor.',                              weight: 0.5 },
  lag_bolt:     { name: '1/2" × 18" Hex Lag Bolt + Washer',               sku: 'LAG-12-18',  note: 'Playa-proven length. Pilot 3/8" hole then impact-drive.',                      weight: 0.55 },
  auger_anchor: { name: '15" Auger Ground Anchor',                        sku: 'AUGER-15',   note: 'Screws into soft soil. Reusable.',                                             weight: 1.0 },
  sandbag:      { name: 'Heavy-Duty Sandbag (50 lb filled)',              sku: 'SANDBAG-50', note: 'Ship empty, fill on-site. 2 per pole on concrete.',                            weight: 50 },
  ratchet_strap:{ name: '1" × 15\' Ratchet Tie-Down (500 lb WLL)',        sku: 'RATCH-1-15', note: 'Top-of-pole to anchor — tensions the structure.',                              weight: 1.2 },
  wall_tarp:    { name: "8' × 10' Wall Tarp Panel",                       sku: 'WALL-8x10',  note: 'For windward walls.',                                                          weight: 5 },
  bungee_pack:  { name: 'Ball Bungee Cords — 6" (50-pack)',               sku: 'BUNGEE-50',  note: 'How tarps attach to the frame — one through each grommet.',                    weight: 0.5 },
}

type GroundKey = 'playa' | 'dirt' | 'grass' | 'concrete'
const GROUND_TYPES: Record<GroundKey, { name: string; anchor: keyof typeof PRODUCTS; multiplier: number; note: string }> = {
  playa:    { name: 'Playa / Alkali flat',  anchor: 'lag_bolt',     multiplier: 1, note: 'Long lag bolts in pre-drilled pilot holes — strong hold, back out easy at teardown.' },
  dirt:     { name: 'Compacted dirt',       anchor: 'lag_bolt',     multiplier: 1, note: '1/2"×8" lag bolts in pilot holes.' },
  grass:    { name: 'Grass / soft soil',    anchor: 'auger_anchor', multiplier: 1, note: 'Auger anchors hold soft soil best.' },
  concrete: { name: 'Concrete / paved',     anchor: 'sandbag',      multiplier: 2, note: '2 sandbags per pole (100 lb total) min.' },
}

// ───────────────────────────── Panel model ─────────────────────────────
export type FrameType = 'sail' | 'rail'
export type WallSides = { N: boolean; S: boolean; E: boolean; W: boolean }
export type Panel = {
  id: string
  label: string
  wFt: number                // width (E-W)
  hFt: number                // depth (N-S)
  poleHeight: 8 | 10
  edgeSpacingFt: number      // 0 = corners only; otherwise place an edge pole every N ft along each side
  frameType: FrameType       // sail = fabric tensioned corner-to-corner (no rails); rail = full EMT perimeter
  walls: WallSides           // which sides have wind walls
}

function panelStats(p: Panel) {
  const teesW = p.edgeSpacingFt > 0 ? Math.max(0, Math.round(p.wFt / p.edgeSpacingFt) - 1) : 0
  const teesH = p.edgeSpacingFt > 0 ? Math.max(0, Math.round(p.hFt / p.edgeSpacingFt) - 1) : 0
  const tees = 2 * teesW + 2 * teesH
  const polesTotal = 4 + tees
  const perimFt = 2 * (p.wFt + p.hFt)
  const sqft = p.wFt * p.hFt
  const railSegments = p.frameType === 'rail' ? Math.ceil(perimFt / 10) : 0
  return { polesTotal, corners: 4, tees, teesW, teesH, perimFt, sqft, railSegments }
}

// ───────────────────────────── BOM ─────────────────────────────
type BOMItem = Product & { key: string; qty: number; customNote?: string }
type BOM = {
  items: BOMItem[]
  totalWeight: number
  bungeesNeeded: number
  stats: {
    area: number
    poleTotal: number
    anchors: number
    connectorTotal: number
    panelsCount: number
    wallTarps: number
    crewHours: number
  }
}

function calculateBOM(panels: Panel[], ground: GroundKey): BOM {
  const items: BOMItem[] = []
  const idx = new Map<string, BOMItem>()
  const bump = (key: string, product: Product, qty: number, customNote?: string) => {
    if (qty <= 0) return
    const ex = idx.get(key)
    if (ex) {
      ex.qty += qty
      if (customNote && !ex.customNote) ex.customNote = customNote
    } else {
      const item: BOMItem = { ...product, key, qty, customNote }
      items.push(item)
      idx.set(key, item)
    }
  }
  const pushP = (key: keyof typeof PRODUCTS, qty: number, customNote?: string) =>
    bump(key, PRODUCTS[key], qty, customNote)

  const gd = GROUND_TYPES[ground]
  let polesTotal = 0
  let railsTotal = 0
  let anchorsTotal = 0
  let connectorsTotal = 0
  let areaTotal = 0
  let wallTarpsTotal = 0
  let bungeesNeeded = 0

  panels.forEach(p => {
    const ps = panelStats(p)
    polesTotal += ps.polesTotal
    railsTotal += ps.railSegments
    areaTotal += ps.sqft
    anchorsTotal += ps.polesTotal

    // Verticals
    pushP('pole_10ft', ps.polesTotal,
      p.poleHeight === 8
        ? `${ps.polesTotal} cut to 8′ for panel "${p.label}"`
        : `Verticals for "${p.label}" (${p.wFt}×${p.hFt})`)
    pushP('base_flange', ps.polesTotal)
    pushP('ratchet_strap', ps.polesTotal)
    pushP(gd.anchor, Math.ceil(ps.polesTotal * gd.multiplier))

    // Perimeter rails + connectors (rail frame only)
    if (p.frameType === 'rail') {
      pushP('pole_10ft', ps.railSegments, `Horizontal rails around "${p.label}" (${ps.perimFt} ft perimeter)`)
      pushP('corner_3way', ps.corners)
      pushP('tee_3way', ps.tees)
      connectorsTotal += ps.corners + ps.tees
    }

    // Custom-size sail / tarp — unique line item per (size + frameType)
    const sizeKey = `${p.wFt}x${p.hFt}`
    const isSail = p.frameType === 'sail'
    const tarpKey = isSail ? `tarp_sail_${sizeKey}` : `tarp_custom_${sizeKey}`
    const sailProduct: Product = {
      name: isSail
        ? `Custom Shade Sail — ${p.wFt}′ × ${p.hFt}′`
        : `Custom Reflective Tarp — ${p.wFt}′ × ${p.hFt}′`,
      sku: isSail ? `SAIL-${sizeKey}` : `TARP-CUSTOM-${sizeKey}`,
      note: isSail
        ? `D-rings at each corner${p.edgeSpacingFt > 0 ? ` plus every ${p.edgeSpacingFt} ft along edges` : ''}. Tension corner-to-corner with ratchet straps.`
        : `Reinforced grommets every 18". Bungees to the perimeter rail.`,
      weight: Math.round(ps.sqft * 0.05), // ~0.05 lb/ft² shade fabric
    }
    bump(tarpKey, sailProduct, 1, `for "${p.label}"`)

    // Bungees — sails: 1 per pole; rails: ~1 per 3ft of perimeter
    bungeesNeeded += isSail ? ps.polesTotal : Math.ceil(ps.perimFt / 3)

    // Wind walls — one 8×10 panel per 10ft of that side
    ;(['N', 'S', 'E', 'W'] as const).forEach(side => {
      if (!p.walls[side]) return
      const sideLen = side === 'N' || side === 'S' ? p.wFt : p.hFt
      const wallPanels = Math.ceil(sideLen / 10)
      wallTarpsTotal += wallPanels
      bungeesNeeded += wallPanels * 10
    })
  })

  if (wallTarpsTotal > 0) pushP('wall_tarp', wallTarpsTotal)

  // Bungee packs cover everything
  if (bungeesNeeded > 0) {
    const packs = Math.max(1, Math.ceil(bungeesNeeded / 50))
    pushP('bungee_pack', packs,
      `${bungeesNeeded} bungees needed · ${packs * 50} in ${packs} pack${packs > 1 ? 's' : ''} (${packs * 50 - bungeesNeeded} spare).`)
  }

  const totalWeight = items.reduce((s, i) => s + i.weight * i.qty, 0)
  return {
    items,
    totalWeight: Math.round(totalWeight),
    bungeesNeeded,
    stats: {
      area: areaTotal,
      poleTotal: polesTotal + railsTotal,
      anchors: anchorsTotal,
      connectorTotal: connectorsTotal,
      panelsCount: panels.length,
      wallTarps: wallTarpsTotal,
      crewHours: Math.max(2, Math.ceil(panels.length * 1.5 + areaTotal / 500 + 1.5)),
    },
  }
}

// ─────────────────── Layout → Panels importer ───────────────────
type ImportSummary = { count: number; structures: number; sails: number; totalArea: number }

function objectsToPanels(objects: FloorplanObjectRow[]): { panels: Panel[]; imported: ImportSummary } {
  const shadeObjs = objects.filter(o =>
    o.object_type === 'shade_structure' || o.object_type === 'shade_sail'
  )
  const panels: Panel[] = []
  let structures = 0, sails = 0, totalArea = 0
  shadeObjs.forEach((obj, i) => {
    totalArea += obj.width_ft * obj.height_ft
    const isStructure = obj.object_type === 'shade_structure'
    if (isStructure) structures++
    else sails++
    const w = Math.max(1, Math.round(obj.width_ft))
    const h = Math.max(1, Math.round(obj.height_ft))
    panels.push({
      id: `imported-${obj.id ?? i}`,
      label: `${isStructure ? 'Structure' : 'Sail'} ${isStructure ? structures : sails} (${w}×${h})`,
      wFt: w,
      hFt: h,
      poleHeight: 10,
      edgeSpacingFt: 10,
      frameType: isStructure ? 'rail' : 'sail',
      walls: { N: false, S: false, E: false, W: false },
    })
  })
  return {
    panels,
    imported: { count: shadeObjs.length, structures, sails, totalArea: Math.round(totalArea) },
  }
}

// ─────────────────────────── Component ───────────────────────────
const STORAGE_KEY = 'shade_calc_state_v3'

type Persisted = {
  panels: Panel[]
  ground: GroundKey
}

export default function ShadeCalcTab() {
  const [panels, setPanels] = useState<Panel[]>([])
  const [ground, setGround] = useState<GroundKey>('playa')
  const [floorplanName, setFloorplanName] = useState<string>('')
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const loadFromLayout = useCallback(async () => {
    setLoading(true)
    try {
      const fp = await fetchActiveFloorplan()
      if (!fp) {
        setFloorplanName('')
        setImportSummary({ count: 0, structures: 0, sails: 0, totalArea: 0 })
        setPanels([])
        return
      }
      setFloorplanName(fp.name ?? '')
      const objs = await fetchFloorplanObjects(fp.id)
      const { panels: nextPanels, imported } = objectsToPanels(objs)
      setPanels(nextPanels)
      setImportSummary(imported)
      setLastSync(new Date())
    } catch (e) {
      console.error('[ShadeCalc] load failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Boot: hydrate from localStorage if present, else fetch layout.
  useEffect(() => {
    let cancelled = false
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const s = JSON.parse(raw) as Persisted
        if (Array.isArray(s.panels)) {
          setPanels(s.panels)
          setGround(s.ground ?? 'playa')
          setHydrated(true)
          ;(async () => {
            try {
              const fp = await fetchActiveFloorplan()
              if (cancelled) return
              if (fp) {
                setFloorplanName(fp.name ?? '')
                const objs = await fetchFloorplanObjects(fp.id)
                const { imported } = objectsToPanels(objs)
                if (!cancelled) setImportSummary(imported)
              }
            } catch { /* non-fatal */ }
            if (!cancelled) setLoading(false)
          })()
          return
        }
      }
    } catch { /* fall through */ }
    loadFromLayout().then(() => { if (!cancelled) setHydrated(true) })
    return () => { cancelled = true }
  }, [loadFromLayout])

  // Persist
  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ panels, ground } satisfies Persisted))
    } catch { /* non-fatal */ }
  }, [panels, ground, hydrated])

  const bom = useMemo(() => calculateBOM(panels, ground), [panels, ground])

  // Panel handlers
  const addPanel = () =>
    setPanels(prev => [...prev, {
      id: `panel-${crypto.randomUUID()}`,
      label: `Sail ${prev.length + 1}`,
      wFt: 30,
      hFt: 50,
      poleHeight: 10,
      edgeSpacingFt: 10,
      frameType: 'sail',
      walls: { N: false, S: false, E: false, W: false },
    }])
  const updatePanel = (id: string, patch: Partial<Panel>) =>
    setPanels(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  const removePanel = (id: string) =>
    setPanels(prev => prev.filter(p => p.id !== id))
  const toggleWall = (id: string, side: keyof WallSides) =>
    setPanels(prev => prev.map(p => p.id === id ? { ...p, walls: { ...p.walls, [side]: !p.walls[side] } } : p))

  // Group BOM items for display
  const grouped = useMemo(() => {
    const g: Record<string, BOMItem[]> = { Frame: [], Connectors: [], Anchoring: [], 'Shade & Walls': [], Hardware: [] }
    bom.items.forEach(it => {
      if (it.sku.startsWith('EMT')) g.Frame.push(it)
      else if (it.sku.startsWith('MP-')) g.Connectors.push(it)
      else if (['LAG', 'AUGER', 'SANDBAG', 'RATCH'].some(p => it.sku.startsWith(p))) g.Anchoring.push(it)
      else if (it.sku.startsWith('TARP') || it.sku.startsWith('WALL') || it.sku.startsWith('SAIL')) g['Shade & Walls'].push(it)
      else g.Hardware.push(it)
    })
    return g
  }, [bom])

  return (
    <div className="space-y-3">
      {/* ───── Layout sync banner ───── */}
      <div className="border-2 border-black bg-amber-50 p-3">
        <div className="flex items-start gap-3 flex-wrap">
          <span className="text-2xl">🧮</span>
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-sm font-black uppercase tracking-wider">Shade Calc</h2>
            <p className="text-xs text-gray-700 mt-1">
              Every shade structure and sail from the <strong>Layout Builder</strong> is treated as a panel with
              poles only along its outside perimeter. Tweak pole height, edge spacing, frame type, and wind walls
              per panel — the BOM updates live. Hit <strong>Reload from Layout</strong> after editing the map.
            </p>
            {floorplanName && (
              <p className="text-[11px] text-gray-600 mt-1">
                Layout: <strong>{floorplanName}</strong>
                {importSummary && importSummary.count > 0 && (
                  <> · {importSummary.structures} structure{importSummary.structures === 1 ? '' : 's'}
                    {importSummary.sails > 0 && `, ${importSummary.sails} sail${importSummary.sails === 1 ? '' : 's'}`}
                    {' '}· {importSummary.totalArea.toLocaleString()} ft² total
                  </>
                )}
                {importSummary && importSummary.count === 0 && (
                  <> · <span className="text-amber-700">No shade objects on layout — <a href="/layout" className="underline">add some →</a></span></>
                )}
                {lastSync && <> · synced {lastSync.toLocaleTimeString()}</>}
              </p>
            )}
          </div>
          <button
            onClick={loadFromLayout}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-bold bg-black text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading…' : '↻ Reload from Layout'}
          </button>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
          {/* ───── LEFT: panels editor ───── */}
          <div className="space-y-3">
            {/* Ground + Add Panel strip */}
            <div className="border-2 border-black bg-white p-3 flex flex-wrap gap-3 items-center text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold uppercase tracking-wider text-[10px] text-gray-600">Ground</span>
                <select
                  value={ground}
                  onChange={e => setGround(e.target.value as GroundKey)}
                  className="border border-black px-2 py-1 text-xs font-medium"
                >
                  {Object.entries(GROUND_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="ml-auto flex gap-1.5">
                <button
                  onClick={addPanel}
                  className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white hover:bg-amber-600"
                >
                  + Add Panel
                </button>
              </div>
            </div>

            {/* Panels list */}
            <div className="border-2 border-black bg-white">
              <div className="px-3 py-2 bg-amber-100 border-b-2 border-black flex items-center justify-between">
                <div className="text-[11px] font-black uppercase tracking-wider">
                  Shade Panels — {panels.length}
                </div>
                {panels.length > 0 && (
                  <div className="text-[10px] text-gray-700">
                    {panels.reduce((s, p) => s + p.wFt * p.hFt, 0).toLocaleString()} ft² total
                  </div>
                )}
              </div>
              {panels.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  No shade panels yet.<br />
                  Add shade structures or sails to the <a href="/layout" className="underline font-bold">Layout Builder</a>, then click <strong>↻ Reload from Layout</strong>.<br />
                  Or click <strong>+ Add Panel</strong> above to add one manually.
                </div>
              ) : (
                <div className="divide-y-2 divide-black">
                  {panels.map(p => {
                    const ps = panelStats(p)
                    return (
                      <div key={p.id} className="p-3 space-y-2">
                        {/* Top row: label + delete */}
                        <div className="flex items-center gap-2">
                          <input
                            value={p.label}
                            onChange={e => updatePanel(p.id, { label: e.target.value })}
                            className="flex-1 border border-gray-300 px-2 py-1 text-sm font-bold focus:outline-none focus:border-black"
                          />
                          <span className="text-[11px] text-gray-500 whitespace-nowrap font-mono">
                            {ps.sqft.toLocaleString()} ft² · {ps.polesTotal} poles
                          </span>
                          <button
                            onClick={() => removePanel(p.id)}
                            className="text-red-600 hover:bg-red-50 w-7 h-7 flex items-center justify-center text-lg leading-none border border-red-200"
                            title="Delete panel"
                          >
                            ×
                          </button>
                        </div>
                        {/* Params row */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                          <NumField label="Width (ft)" value={p.wFt} onChange={v => updatePanel(p.id, { wFt: v })} />
                          <NumField label="Depth (ft)" value={p.hFt} onChange={v => updatePanel(p.id, { hFt: v })} />
                          <Field label="Pole Height">
                            <select
                              value={p.poleHeight}
                              onChange={e => updatePanel(p.id, { poleHeight: +e.target.value as 8 | 10 })}
                              className="w-full border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:border-black"
                            >
                              <option value={8}>8′</option>
                              <option value={10}>10′</option>
                            </select>
                          </Field>
                          <Field label="Edge Poles">
                            <select
                              value={p.edgeSpacingFt}
                              onChange={e => updatePanel(p.id, { edgeSpacingFt: +e.target.value })}
                              className="w-full border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:border-black"
                              title="Distance between intermediate edge poles"
                            >
                              <option value={0}>Corners only</option>
                              <option value={10}>Every 10′</option>
                              <option value={15}>Every 15′</option>
                              <option value={20}>Every 20′</option>
                              <option value={25}>Every 25′</option>
                            </select>
                          </Field>
                          <Field label="Frame">
                            <select
                              value={p.frameType}
                              onChange={e => updatePanel(p.id, { frameType: e.target.value as FrameType })}
                              className="w-full border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:border-black"
                              title="Sail = fabric corner-tensioned. Rail = full EMT perimeter."
                            >
                              <option value="sail">Sail (no rails)</option>
                              <option value="rail">Rail (EMT perim)</option>
                            </select>
                          </Field>
                        </div>
                        {/* Walls */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Wind Walls</span>
                          <div className="flex gap-1">
                            {(['N', 'S', 'E', 'W'] as const).map(side => {
                              const on = p.walls[side]
                              const sideLen = side === 'N' || side === 'S' ? p.wFt : p.hFt
                              return (
                                <button
                                  key={side}
                                  onClick={() => toggleWall(p.id, side)}
                                  className={cn(
                                    'px-2 py-1 text-[10px] font-bold border transition-colors',
                                    on
                                      ? 'bg-amber-500 text-white border-amber-700'
                                      : 'bg-white text-gray-600 border-gray-300 hover:bg-amber-50'
                                  )}
                                  title={`${side} wall · ${sideLen} ft`}
                                >
                                  {side} {on && `(${sideLen}′)`}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        {/* Inline breakdown */}
                        <div className="text-[10px] text-gray-500 leading-snug">
                          {ps.polesTotal} poles ({ps.corners} corners
                          {ps.tees > 0 && `, ${ps.tees} edge${ps.tees === 1 ? '' : 's'}: ${ps.teesW * 2} on ${p.wFt}′ sides + ${ps.teesH * 2} on ${p.hFt}′ sides`})
                          {p.frameType === 'rail' && ` · ${ps.railSegments} × 10′ rails for ${ps.perimFt}′ perimeter`}
                          {p.frameType === 'sail' && ` · fabric corner-tensioned, no rails`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border-l-2 border-amber-500 bg-amber-50 p-3 text-[11px] text-gray-700 leading-relaxed">
              <strong className="block text-amber-900 mb-1">Ground: {GROUND_TYPES[ground].name}</strong>
              {GROUND_TYPES[ground].note}
            </div>
          </div>

          {/* ───── RIGHT: stats + parts list ───── */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-px bg-black border-2 border-black">
              <Stat label="Panels" value={bom.stats.panelsCount.toString()} />
              <Stat label="Coverage" value={`${bom.stats.area.toLocaleString()} ft²`} />
              <Stat label="Poles" value={bom.stats.poleTotal.toString()} />
              <Stat label="Anchors" value={bom.stats.anchors.toString()} />
              <Stat label="Connectors" value={bom.stats.connectorTotal.toString()} />
              <Stat label="Wall Panels" value={bom.stats.wallTarps.toString()} />
              <Stat label="Bungees" value={bom.bungeesNeeded.toString()} />
              <Stat label="Build Time" value={`~${bom.stats.crewHours} h`} />
              <Stat label="Total Weight" value={`${bom.totalWeight.toLocaleString()} lb`} wide />
            </div>

            <div className="border-2 border-black bg-white">
              <div className="px-3 py-2 bg-amber-100 border-b-2 border-black text-[11px] font-black uppercase tracking-wider">
                Bill of Materials
              </div>
              <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
                {Object.entries(grouped).map(([group, items]) =>
                  items.length === 0 ? null : (
                    <div key={group}>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        ▸ {group}
                      </div>
                      {items.map(it => (
                        <div key={it.sku} className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold leading-tight">{it.name}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{it.note}</div>
                            {it.customNote && (
                              <div className="text-[10px] text-amber-700 mt-0.5">→ {it.customNote}</div>
                            )}
                          </div>
                          <div className="text-sm font-black text-amber-700 whitespace-nowrap">×{it.qty}</div>
                        </div>
                      ))}
                    </div>
                  )
                )}
                {bom.items.length === 0 && (
                  <div className="text-xs text-gray-500 py-4 text-center">
                    No shade panels yet — reload from layout or add one manually.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────── helpers ───────────────────────
function Stat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn('bg-white p-2', wide && 'col-span-2')}>
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-base font-black text-black mt-0.5">{value}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">{label}</div>
      {children}
    </label>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={1}
        step={1}
        value={value}
        onChange={e => onChange(Math.max(1, +e.target.value || 0))}
        className="w-full border border-gray-300 px-2 py-1 text-xs text-center focus:outline-none focus:border-black"
      />
    </Field>
  )
}
