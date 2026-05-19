'use client'

/**
 * Shade Calc — simplified CampShade-style calculator wired to the camp layout.
 *
 * Auto-loads every `shade_structure` and `shade_sail` placed on the active
 * floorplan, snaps them to a 10 ft × 10 ft grid, and calculates the bill of
 * materials (poles, connectors, anchors, tarps, walls, bungees) needed to
 * actually build them.  All edits are local — the source of truth stays the
 * layout builder.  Hit "Reload from Layout" to resync.
 *
 * No e-commerce: this surface tracks *what* we need to build, not where to buy.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { fetchActiveFloorplan, fetchFloorplanObjects } from '@/lib/floorplan'
import type { FloorplanObjectRow } from '@/types/database'

const MAX_R = 25  // 250 ft N–S
const MAX_C = 25  // 250 ft E–W
const CELL_FT = 10

// ───────────────────────────── Catalog ─────────────────────────────
// Stripped of price/vendor/URL — only the data needed to count parts.
type Product = { name: string; sku: string; note: string; weight: number }
const PRODUCTS: Record<string, Product> = {
  pole_10ft:    { name: '1" × 10\' EMT Conduit',                          sku: 'EMT-1-10',   note: 'Galvanized. Cut some to 8\' for low-headroom cells.',                       weight: 5.4 },
  corner_3way:  { name: 'Maker Pipe 90° Corner Connector — 1"',           sku: 'MP-90',      note: 'Two horizontal rails meeting at 90° plus the vertical.',                    weight: 0.6 },
  tee_3way:     { name: 'Maker Pipe T Connector — 1"',                    sku: 'MP-T',       note: 'Two collinear horizontals plus the vertical.',                              weight: 0.6 },
  tee_4way:     { name: 'Maker Pipe 4-Way Connector — 1"',                sku: 'MP-4W',      note: 'Three horizontal rails plus the vertical.',                                 weight: 0.7 },
  cross_5way:   { name: 'Maker Pipe 5-Way Connector — 1"',                sku: 'MP-5W',      note: 'Four horizontal rails plus the vertical.',                                  weight: 0.85 },
  base_flange:  { name: 'Maker Pipe Flange Connector — 1"',               sku: 'MP-FLANGE',  note: 'Bolts every vertical pole to its ground anchor.',                            weight: 0.5 },
  lag_bolt:     { name: '1/2" × 18" Hex Lag Bolt + Washer',               sku: 'LAG-12-18',  note: 'Playa-proven length. Pilot 3/8" hole then impact-drive.',                    weight: 0.55 },
  auger_anchor: { name: '15" Auger Ground Anchor',                        sku: 'AUGER-15',   note: 'Screws into soft soil. Reusable.',                                           weight: 1.0 },
  sandbag:      { name: 'Heavy-Duty Sandbag (50 lb filled)',              sku: 'SANDBAG-50', note: 'Ship empty, fill on-site. 2 per pole on concrete.',                          weight: 50 },
  ratchet_strap:{ name: '1" × 15\' Ratchet Tie-Down (500 lb WLL)',        sku: 'RATCH-1-15', note: 'Top-of-pole to anchor — tensions the structure.',                            weight: 1.2 },
  tarp_10x10:   { name: "10' × 10' Reflective Shade Tarp",                sku: 'TARP-10x10', note: 'Silver reflective, grommets every 18".',                                     weight: 4 },
  tarp_10x20:   { name: "10' × 20' Reflective Shade Tarp",                sku: 'TARP-10x20', note: 'Silver reflective, grommets every 18".',                                     weight: 8 },
  tarp_20x20:   { name: "20' × 20' Aluminum/Reflective Tarp",             sku: 'TARP-20x20', note: 'Heavy-duty aluminet with reinforced grommets.',                              weight: 14 },
  wall_tarp:    { name: "8' × 10' Wall Tarp Panel",                       sku: 'WALL-8x10',  note: 'For windward walls.',                                                        weight: 5 },
  bungee_pack:  { name: 'Ball Bungee Cords — 6" (50-pack)',               sku: 'BUNGEE-50',  note: 'How tarps attach to the frame — one through each grommet.',                  weight: 0.5 },
}

type GroundKey = 'playa' | 'dirt' | 'grass' | 'concrete'
const GROUND_TYPES: Record<GroundKey, { name: string; anchor: keyof typeof PRODUCTS; multiplier: number; note: string }> = {
  playa:    { name: 'Playa / Alkali flat',  anchor: 'lag_bolt',     multiplier: 1, note: 'Long lag bolts in pre-drilled pilot holes — strong hold, back out easy at teardown.' },
  dirt:     { name: 'Compacted dirt',       anchor: 'lag_bolt',     multiplier: 1, note: '1/2"×8" lag bolts in pilot holes.' },
  grass:    { name: 'Grass / soft soil',    anchor: 'auger_anchor', multiplier: 1, note: 'Auger anchors hold soft soil best.' },
  concrete: { name: 'Concrete / paved',     anchor: 'sandbag',      multiplier: 2, note: '2 sandbags per pole (100 lb total) min.' },
}

// ───────────────────────────── Geometry ─────────────────────────────
type Cell = { active: boolean; height: 8 | 10 }
type CellGrid = Cell[][]
type WallSegments = Record<string, boolean>

const emptyCells = (): CellGrid =>
  Array.from({ length: MAX_R }, () =>
    Array.from({ length: MAX_C }, () => ({ active: false, height: 10 as const }))
  )

function getBounds(cells: CellGrid) {
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity, count = 0
  for (let r = 0; r < MAX_R; r++) for (let c = 0; c < MAX_C; c++) {
    if (cells[r][c].active) {
      minR = Math.min(minR, r); maxR = Math.max(maxR, r)
      minC = Math.min(minC, c); maxC = Math.max(maxC, c)
      count++
    }
  }
  if (count === 0) return null
  return { minR, maxR, minC, maxC, rows: maxR - minR + 1, cols: maxC - minC + 1, count }
}

type Intersection = { r: number; c: number; h: number; rails: { N: boolean; S: boolean; W: boolean; E: boolean }; railCount: number; perim: boolean; conn: 'corner_3way' | 'tee_3way' | 'tee_4way' | 'cross_5way' }

function getIntersections(cells: CellGrid): Intersection[] {
  const out: Intersection[] = []
  for (let r = 0; r <= MAX_R; r++) for (let c = 0; c <= MAX_C; c++) {
    const nw = r > 0 && c > 0       && cells[r-1][c-1].active
    const ne = r > 0 && c < MAX_C   && cells[r-1][c].active
    const sw = r < MAX_R && c > 0   && cells[r][c-1].active
    const se = r < MAX_R && c < MAX_C && cells[r][c].active
    if (!(nw || ne || sw || se)) continue
    const rN = (nw || ne) && r > 0
    const rS = (sw || se) && r < MAX_R
    const rW = (nw || sw) && c > 0
    const rE = (ne || se) && c < MAX_C
    const railCount = [rN, rS, rW, rE].filter(Boolean).length
    let h = 0
    if (nw) h = Math.max(h, cells[r-1][c-1].height)
    if (ne) h = Math.max(h, cells[r-1][c].height)
    if (sw) h = Math.max(h, cells[r][c-1].height)
    if (se) h = Math.max(h, cells[r][c].height)
    const perim = !(nw && ne && sw && se)
    let conn: Intersection['conn']
    if (railCount === 4) conn = 'cross_5way'
    else if (railCount === 3) conn = 'tee_4way'
    else if (railCount === 2) {
      const corner = (rN && rE) || (rN && rW) || (rS && rE) || (rS && rW)
      conn = corner ? 'corner_3way' : 'tee_3way'
    } else conn = 'corner_3way'
    out.push({ r, c, h, rails: { N: rN, S: rS, W: rW, E: rE }, railCount, perim, conn })
  }
  return out
}

type Rail = { r1: number; c1: number; r2: number; c2: number; axis: 'EW' | 'NS'; h: number; perim: boolean }

function getRails(cells: CellGrid): Rail[] {
  const rails: Rail[] = []
  for (let r = 0; r <= MAX_R; r++) for (let c = 0; c < MAX_C; c++) {
    const cN = r > 0 && cells[r-1][c].active
    const cS = r < MAX_R && cells[r][c].active
    if (cN || cS) {
      let h: number
      if (cN && cS) h = Math.min(cells[r-1][c].height, cells[r][c].height)
      else if (cN) h = cells[r-1][c].height
      else h = cells[r][c].height
      rails.push({ r1: r, c1: c, r2: r, c2: c + 1, axis: 'EW', h, perim: !(cN && cS) })
    }
  }
  for (let r = 0; r < MAX_R; r++) for (let c = 0; c <= MAX_C; c++) {
    const cW = c > 0 && cells[r][c-1].active
    const cE = c < MAX_C && cells[r][c].active
    if (cW || cE) {
      let h: number
      if (cW && cE) h = Math.min(cells[r][c-1].height, cells[r][c].height)
      else if (cW) h = cells[r][c-1].height
      else h = cells[r][c].height
      rails.push({ r1: r, c1: c, r2: r + 1, c2: c, axis: 'NS', h, perim: !(cW && cE) })
    }
  }
  return rails
}

type Tarp = { size: '10x10' | '10x20' | '20x20'; row: number; col: number; w: number; h: number; height: number }

function packTarps(cells: CellGrid, strategy: 'auto' | 'all_small'): Tarp[] {
  const grid = cells.map(row => row.map(c => !c.active))
  const tarps: Tarp[] = []
  for (let r = 0; r < MAX_R; r++) for (let c = 0; c < MAX_C; c++) {
    if (grid[r][c]) continue
    if (strategy === 'all_small') {
      tarps.push({ size: '10x10', row: r, col: c, w: 1, h: 1, height: cells[r][c].height })
      grid[r][c] = true
      continue
    }
    const can20 =
      r + 1 < MAX_R && c + 1 < MAX_C &&
      !grid[r][c+1] && !grid[r+1][c] && !grid[r+1][c+1] &&
      cells[r][c].height === cells[r][c+1].height &&
      cells[r][c].height === cells[r+1][c].height &&
      cells[r][c].height === cells[r+1][c+1].height
    if (can20) {
      tarps.push({ size: '20x20', row: r, col: c, w: 2, h: 2, height: cells[r][c].height })
      grid[r][c] = grid[r][c+1] = grid[r+1][c] = grid[r+1][c+1] = true
    } else if (c + 1 < MAX_C && !grid[r][c+1] && cells[r][c].height === cells[r][c+1].height) {
      tarps.push({ size: '10x20', row: r, col: c, w: 2, h: 1, height: cells[r][c].height })
      grid[r][c] = grid[r][c+1] = true
    } else if (r + 1 < MAX_R && !grid[r+1][c] && cells[r][c].height === cells[r+1][c].height) {
      tarps.push({ size: '10x20', row: r, col: c, w: 1, h: 2, height: cells[r][c].height })
      grid[r+1][c] = grid[r][c] = true
    } else {
      tarps.push({ size: '10x10', row: r, col: c, w: 1, h: 1, height: cells[r][c].height })
      grid[r][c] = true
    }
  }
  return tarps
}

const railKey = (rail: Pick<Rail, 'axis' | 'r1' | 'c1'>) => `${rail.axis}-${rail.r1}-${rail.c1}`

function getPerimeterRailsByDir(cells: CellGrid) {
  const rails = getRails(cells)
  const out: Record<'N' | 'S' | 'E' | 'W', (Rail & { dir: 'N' | 'S' | 'E' | 'W'; key: string })[]> = { N: [], S: [], E: [], W: [] }
  rails.forEach(rail => {
    if (!rail.perim) return
    let dir: 'N' | 'S' | 'E' | 'W' | null = null
    if (rail.axis === 'EW') {
      const cN = rail.r1 > 0 && cells[rail.r1 - 1][rail.c1].active
      const cS = rail.r1 < MAX_R && cells[rail.r1][rail.c1].active
      if (cS && !cN) dir = 'N'
      else if (cN && !cS) dir = 'S'
    } else {
      const cW = rail.c1 > 0 && cells[rail.r1][rail.c1 - 1].active
      const cE = rail.c1 < MAX_C && cells[rail.r1][rail.c1].active
      if (cE && !cW) dir = 'W'
      else if (cW && !cE) dir = 'E'
    }
    if (dir) out[dir].push({ ...rail, dir, key: railKey(rail) })
  })
  out.N.sort((a, b) => a.c1 - b.c1)
  out.S.sort((a, b) => a.c1 - b.c1)
  out.W.sort((a, b) => a.r1 - b.r1)
  out.E.sort((a, b) => a.r1 - b.r1)
  return out
}

// ─────────────────────── Custom Panels (shade sails / big rectangles) ───────────────────────
// Panels are arbitrary-sized rectangles (e.g. 30×50) with poles only along the perimeter —
// NOT at every 10ft intersection like the cell grid. This matches how shade sails actually
// build out: corner posts + optional intermediate edge posts, no internal supports.
export type FrameType = 'sail' | 'rail'
export type Panel = {
  id: string
  label: string
  wFt: number
  hFt: number
  poleHeight: 8 | 10
  edgeSpacingFt: number   // 0 = corners only; otherwise place an edge pole every N ft
  frameType: FrameType    // sail = corner-tensioned fabric, rail = full EMT perimeter
}

function panelPoleCount(p: Panel): { total: number; corners: 4; teesW: number; teesH: number; tees: number } {
  const teesW = p.edgeSpacingFt > 0 ? Math.max(0, Math.round(p.wFt / p.edgeSpacingFt) - 1) : 0
  const teesH = p.edgeSpacingFt > 0 ? Math.max(0, Math.round(p.hFt / p.edgeSpacingFt) - 1) : 0
  const tees = 2 * teesW + 2 * teesH
  return { total: 4 + tees, corners: 4, teesW, teesH, tees }
}

function panelStats(p: Panel) {
  const { total, corners, tees } = panelPoleCount(p)
  const perimFt = 2 * (p.wFt + p.hFt)
  const sqft = p.wFt * p.hFt
  const railSegments = p.frameType === 'rail' ? Math.ceil(perimFt / 10) : 0
  return { polesTotal: total, corners, tees, perimFt, sqft, railSegments }
}

type BOMItem = Product & { key: string; qty: number; customNote?: string }
type BOM = {
  items: BOMItem[]
  totalWeight: number
  inters: Intersection[]
  rails: Rail[]
  tarps: Tarp[]
  bounds: ReturnType<typeof getBounds>
  bungeesNeeded: number
  panelsTotalArea: number
  stats: { cells: number; area: number; poleTotal: number; anchors: number; crewHours: number; connectorTotal: number; panelsCount: number }
}

function calculateBOM(cells: CellGrid, wallSegments: WallSegments, panels: Panel[], ground: GroundKey, tarpStrategy: 'auto' | 'all_small'): BOM {
  const inters = getIntersections(cells)
  const rails = getRails(cells)
  const tarps = packTarps(cells, tarpStrategy)
  const bounds = getBounds(cells)
  let cCorner = 0, cTee3 = 0, cTee4 = 0, cCross = 0
  inters.forEach(i => {
    if (i.conn === 'corner_3way') cCorner++
    else if (i.conn === 'tee_3way') cTee3++
    else if (i.conn === 'tee_4way') cTee4++
    else cCross++
  })
  const polesVertical = inters.length
  const stock10ft = polesVertical + rails.length
  const at8 = inters.filter(i => i.h === 8).length
  const perimInters = inters.filter(i => i.perim).length
  const gd = GROUND_TYPES[ground]
  const anchorQty = Math.ceil(perimInters * gd.multiplier)
  const tarpCount = { '10x10': 0, '10x20': 0, '20x20': 0 }
  tarps.forEach(t => tarpCount[t.size]++)
  const wallTarps = Object.values(wallSegments).filter(Boolean).length
  const bungeesNeeded =
    tarps.reduce((s, t) => s + (t.size === '20x20' ? 36 : t.size === '10x20' ? 22 : 14), 0) +
    wallTarps * 10

  const items: BOMItem[] = []
  const itemIndex = new Map<string, BOMItem>()
  const bump = (key: string, product: Product, qty: number, customNote?: string) => {
    if (qty <= 0) return
    const ex = itemIndex.get(key)
    if (ex) {
      ex.qty += qty
      if (customNote && !ex.customNote) ex.customNote = customNote
    } else {
      const item: BOMItem = { ...product, key, qty, customNote }
      items.push(item)
      itemIndex.set(key, item)
    }
  }
  const pushP = (key: keyof typeof PRODUCTS, qty: number, customNote?: string) =>
    bump(key, PRODUCTS[key], qty, customNote)

  pushP('pole_10ft',   stock10ft, at8 > 0 ? `Cut ${at8} of these to 8' for low-headroom cells.` : undefined)
  pushP('corner_3way', cCorner)
  pushP('tee_3way',    cTee3)
  pushP('tee_4way',    cTee4)
  pushP('cross_5way',  cCross)
  pushP('base_flange', polesVertical)
  pushP(gd.anchor,     anchorQty)
  pushP('ratchet_strap', perimInters)
  pushP('tarp_10x10',  tarpCount['10x10'])
  pushP('tarp_10x20',  tarpCount['10x20'])
  pushP('tarp_20x20',  tarpCount['20x20'])
  pushP('wall_tarp',   wallTarps)

  // ── Merge in Custom Panels ──
  let panelPolesTotal = 0
  let panelAnchorsTotal = 0
  let panelConnectorsTotal = 0
  let panelsArea = 0
  let panelBungees = 0
  panels.forEach(p => {
    const ps = panelStats(p)
    panelPolesTotal += ps.polesTotal
    panelsArea += ps.sqft
    // Verticals
    pushP('pole_10ft', ps.polesTotal, p.poleHeight === 8
      ? `${ps.polesTotal} cut to 8′ for panel "${p.label}"`
      : `For panel "${p.label}" (${p.wFt}×${p.hFt})`)
    pushP('base_flange', ps.polesTotal)
    pushP('ratchet_strap', ps.polesTotal)
    const pAnchor = Math.ceil(ps.polesTotal * gd.multiplier)
    pushP(gd.anchor, pAnchor)
    panelAnchorsTotal += ps.polesTotal
    // Perimeter rails (only for 'rail' frame type)
    if (p.frameType === 'rail') {
      pushP('pole_10ft', ps.railSegments, `Horizontal rails around panel "${p.label}"`)
      pushP('corner_3way', ps.corners)
      pushP('tee_3way', ps.tees)
      panelConnectorsTotal += ps.corners + ps.tees
    } else if (ps.tees > 0) {
      // Sail with intermediate edge poles — still need flanges, no rails/connectors
      // (sail attaches via D-rings at each pole)
    }
    // Custom-sized tarp / sail — unique line item per size
    const sizeKey = `${p.wFt}x${p.hFt}`
    const tarpKey = p.frameType === 'sail' ? `tarp_sail_${sizeKey}` : `tarp_custom_${sizeKey}`
    const sailFabric: Product = {
      name: p.frameType === 'sail'
        ? `Custom Shade Sail — ${p.wFt}′ × ${p.hFt}′`
        : `Custom Reflective Tarp — ${p.wFt}′ × ${p.hFt}′`,
      sku: p.frameType === 'sail' ? `SAIL-${sizeKey}` : `TARP-CUSTOM-${sizeKey}`,
      note: p.frameType === 'sail'
        ? `D-rings at each corner${p.edgeSpacingFt > 0 ? ` + every ${p.edgeSpacingFt} ft along edges` : ''}. Tension with ratchet straps.`
        : `Reinforced grommets every 18". Bungees to perimeter rail.`,
      weight: Math.round(ps.sqft * 0.05),
    }
    bump(tarpKey, sailFabric, 1, `for "${p.label}"`)
    // Bungees: sails ~ 1 per pole; rails ~ perim/3 ft
    panelBungees += p.frameType === 'sail' ? ps.polesTotal : Math.ceil(ps.perimFt / 3)
  })

  const totalBungees = bungeesNeeded + panelBungees
  const totalBungeePacks = totalBungees > 0 ? Math.max(1, Math.ceil(totalBungees / 50)) : 0
  pushP('bungee_pack', totalBungeePacks,
    totalBungees > 0
      ? `${totalBungees} bungees needed · ${totalBungeePacks * 50} in ${totalBungeePacks} pack${totalBungeePacks > 1 ? 's' : ''} (${totalBungeePacks * 50 - totalBungees} spare).`
      : undefined)

  const totalWeight = items.reduce((s, i) => s + i.weight * i.qty, 0)
  const totalCells = bounds?.count ?? 0
  return {
    items,
    totalWeight: Math.round(totalWeight),
    inters, rails, tarps, bounds,
    bungeesNeeded: totalBungees,
    panelsTotalArea: panelsArea,
    stats: {
      cells: totalCells,
      area: totalCells * 100 + panelsArea,
      poleTotal: stock10ft + panelPolesTotal + panels.reduce((s, p) => s + (p.frameType === 'rail' ? panelStats(p).railSegments : 0), 0),
      anchors: perimInters + panelAnchorsTotal,
      crewHours: Math.max(2, Math.ceil(totalCells * 0.5 + panels.length * 1.5 + 1.5)),
      connectorTotal: cCorner + cTee3 + cTee4 + cCross + panelConnectorsTotal,
      panelsCount: panels.length,
    },
  }
}

// ─────────────────────── Layout → cells + panels importer ───────────────────────
/**
 * Pulls every shade object off the active floorplan and splits it two ways:
 *  • shade_structure → cell grid (orthogonal 10ft frame with internal poles)
 *  • shade_sail      → custom Panel (perimeter poles only, fabric tensioned corner-to-corner)
 *
 * Translates the bounding box of all shade objects to the grid origin so the
 * calculator's 10×10 axis lines up with the smallest x/y on the map.
 */
function objectsToImport(objects: FloorplanObjectRow[]): {
  cells: CellGrid
  panels: Panel[]
  imported: { count: number; structures: number; sails: number; totalArea: number; bbox: { wFt: number; hFt: number } | null }
} {
  const shadeObjs = objects.filter(o =>
    o.object_type === 'shade_structure' || o.object_type === 'shade_sail'
  )
  const cells = emptyCells()
  const panels: Panel[] = []
  if (shadeObjs.length === 0) {
    return { cells, panels, imported: { count: 0, structures: 0, sails: 0, totalArea: 0, bbox: null } }
  }
  const minX = Math.min(...shadeObjs.map(o => o.x))
  const minY = Math.min(...shadeObjs.map(o => o.y))
  let structures = 0, sails = 0, totalArea = 0
  let maxX = -Infinity, maxY = -Infinity
  shadeObjs.forEach((obj, idx) => {
    totalArea += obj.width_ft * obj.height_ft
    maxX = Math.max(maxX, obj.x + obj.width_ft)
    maxY = Math.max(maxY, obj.y + obj.height_ft)
    if (obj.object_type === 'shade_sail') {
      sails++
      panels.push({
        id: `imported-${obj.id ?? idx}`,
        label: `Sail ${sails} (${obj.width_ft}×${obj.height_ft})`,
        wFt: Math.round(obj.width_ft),
        hFt: Math.round(obj.height_ft),
        poleHeight: 10,
        edgeSpacingFt: 10,
        frameType: 'sail',
      })
      return
    }
    structures++
    const left   = obj.x - minX
    const top    = obj.y - minY
    const right  = left + obj.width_ft
    const bottom = top  + obj.height_ft
    const c0 = Math.max(0, Math.floor(left / CELL_FT))
    const r0 = Math.max(0, Math.floor(top / CELL_FT))
    const c1 = Math.min(MAX_C - 1, Math.ceil(right / CELL_FT) - 1)
    const r1 = Math.min(MAX_R - 1, Math.ceil(bottom / CELL_FT) - 1)
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        cells[r][c] = { active: true, height: 10 }
      }
    }
  })
  return {
    cells,
    panels,
    imported: {
      count: shadeObjs.length,
      structures,
      sails,
      totalArea: Math.round(totalArea),
      bbox: { wFt: Math.round(maxX - minX), hFt: Math.round(maxY - minY) },
    },
  }
}

// ───────────────────────────── Component ─────────────────────────────
const STORAGE_KEY = 'shade_calc_state_v2'

export default function ShadeCalcTab() {
  const [cells, setCells] = useState<CellGrid>(() => emptyCells())
  const [panels, setPanels] = useState<Panel[]>([])
  const [wallSegments, setWallSegments] = useState<WallSegments>({})
  const [ground, setGround] = useState<GroundKey>('playa')
  const [tarpStrategy, setTarpStrategy] = useState<'auto' | 'all_small'>('auto')
  const [defaultHeight, setDefaultHeight] = useState<8 | 10>(10)
  const [floorplanName, setFloorplanName] = useState<string>('')
  const [importSummary, setImportSummary] = useState<{ count: number; structures: number; sails: number; totalArea: number; bbox: { wFt: number; hFt: number } | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [painting, setPainting] = useState<'on' | 'off' | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Pull shade objects off the active floorplan and rebuild the cell grid.
  const loadFromLayout = useCallback(async () => {
    setLoading(true)
    try {
      const fp = await fetchActiveFloorplan()
      if (!fp) {
        setFloorplanName('')
        setImportSummary({ count: 0, structures: 0, sails: 0, totalArea: 0, bbox: null })
        return
      }
      setFloorplanName(fp.name ?? '')
      const objs = await fetchFloorplanObjects(fp.id)
      const { cells: nextCells, panels: nextPanels, imported } = objectsToImport(objs)
      setCells(nextCells)
      setPanels(nextPanels)
      setWallSegments({})  // walls don't survive a resync — they're user intent on top of layout
      setImportSummary(imported)
      setLastSync(new Date())
    } catch (e) {
      console.error('[ShadeCalc] load failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Boot: hydrate from localStorage if present, else import from layout.
  useEffect(() => {
    let cancelled = false
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const s = JSON.parse(raw) as {
          cells: CellGrid; wallSegments: WallSegments; ground: GroundKey
          tarpStrategy: 'auto' | 'all_small'; defaultHeight: 8 | 10
          panels?: Panel[]
        }
        if (s.cells?.length === MAX_R) {
          setCells(s.cells)
          setPanels(Array.isArray(s.panels) ? s.panels : [])
          setWallSegments(s.wallSegments ?? {})
          setGround(s.ground ?? 'playa')
          setTarpStrategy(s.tarpStrategy ?? 'auto')
          setDefaultHeight(s.defaultHeight ?? 10)
          setHydrated(true)
          // Still fetch floorplan metadata so the "Reload from Layout" panel works
          ;(async () => {
            try {
              const fp = await fetchActiveFloorplan()
              if (cancelled) return
              if (fp) {
                setFloorplanName(fp.name ?? '')
                const objs = await fetchFloorplanObjects(fp.id)
                const { imported } = objectsToImport(objs)
                if (!cancelled) setImportSummary(imported)
              }
            } catch { /* non-fatal */ }
            if (!cancelled) setLoading(false)
          })()
          return
        }
      }
    } catch { /* fall through to layout import */ }
    loadFromLayout().then(() => { if (!cancelled) setHydrated(true) })
    return () => { cancelled = true }
  }, [loadFromLayout])

  // Persist edits.
  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        cells, panels, wallSegments, ground, tarpStrategy, defaultHeight,
      }))
    } catch { /* quota — non-fatal */ }
  }, [cells, panels, wallSegments, ground, tarpStrategy, defaultHeight, hydrated])

  // Drag-paint cells.
  useEffect(() => {
    const stop = () => setPainting(null)
    window.addEventListener('mouseup', stop)
    return () => window.removeEventListener('mouseup', stop)
  }, [])

  const bom = useMemo(
    () => calculateBOM(cells, wallSegments, panels, ground, tarpStrategy),
    [cells, wallSegments, panels, ground, tarpStrategy]
  )
  const bounds = bom.bounds
  const perimByDir = useMemo(() => getPerimeterRailsByDir(cells), [cells])

  const toggleCell = (r: number, c: number, mode: 'cycle' | 'on' | 'off') => {
    setCells(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })))
      const cell = next[r][c]
      if (mode === 'cycle') {
        if (!cell.active) { cell.active = true; cell.height = defaultHeight }
        else if (cell.height === defaultHeight) cell.height = defaultHeight === 10 ? 8 : 10
        else cell.active = false
      } else if (mode === 'on') {
        cell.active = true; cell.height = defaultHeight
      } else cell.active = false
      return next
    })
  }

  const onCellDown = (r: number, c: number, e: React.MouseEvent) => {
    e.preventDefault()
    setPainting(cells[r][c].active ? 'off' : 'on')
    toggleCell(r, c, 'cycle')
  }
  const onCellEnter = (r: number, c: number) => {
    if (painting) toggleCell(r, c, painting)
  }

  const setSideAll = (dir: 'N' | 'S' | 'E' | 'W', on: boolean) =>
    setWallSegments(s => {
      const next = { ...s }
      perimByDir[dir].forEach(r => { if (on) next[r.key] = true; else delete next[r.key] })
      return next
    })

  const toggleSegment = (key: string) =>
    setWallSegments(s => {
      const n = { ...s }
      if (n[key]) delete n[key]
      else n[key] = true
      return n
    })

  const clearAll = () => setCells(emptyCells())
  const flipHeights = () =>
    setCells(prev => prev.map(row => row.map(c => c.active ? { ...c, height: c.height === 10 ? 8 : 10 } : c)))

  // Panel handlers
  const addPanel = () =>
    setPanels(prev => [...prev, {
      id: `panel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: `Sail ${prev.length + 1}`,
      wFt: 30, hFt: 50, poleHeight: 10, edgeSpacingFt: 10, frameType: 'sail',
    }])
  const updatePanel = (id: string, patch: Partial<Panel>) =>
    setPanels(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  const removePanel = (id: string) =>
    setPanels(prev => prev.filter(p => p.id !== id))

  // Group items for display.
  const grouped = useMemo(() => {
    const g: Record<string, BOMItem[]> = { Frame: [], Connectors: [], Anchoring: [], 'Shade & Walls': [], Hardware: [] }
    bom.items.forEach(it => {
      if (it.sku.startsWith('EMT')) g.Frame.push(it)
      else if (it.sku.startsWith('MP-')) g.Connectors.push(it)
      else if (['LAG','AUGER','SANDBAG','RATCH'].some(p => it.sku.startsWith(p))) g.Anchoring.push(it)
      else if (it.sku.startsWith('TARP') || it.sku.startsWith('WALL') || it.sku.startsWith('SAIL')) g['Shade & Walls'].push(it)
      else g.Hardware.push(it)
    })
    return g
  }, [bom])

  const wallCount = Object.values(wallSegments).filter(Boolean).length

  // Only render the active sub-grid for editing (auto-sizes to the layout) — but
  // always show a 2-cell pad around it so users can expand outward.
  const view = useMemo(() => {
    const pad = 2
    if (!bounds) {
      // Default empty: 6×6 in the middle
      const cx = Math.floor(MAX_C / 2) - 3
      const cy = Math.floor(MAX_R / 2) - 3
      return { minR: cy, maxR: cy + 5, minC: cx, maxC: cx + 5 }
    }
    return {
      minR: Math.max(0, bounds.minR - pad),
      maxR: Math.min(MAX_R - 1, bounds.maxR + pad),
      minC: Math.max(0, bounds.minC - pad),
      maxC: Math.min(MAX_C - 1, bounds.maxC + pad),
    }
  }, [bounds])

  return (
    <div className="space-y-3">
      {/* ───── Layout sync banner ───── */}
      <div className="border-2 border-black bg-amber-50 p-3">
        <div className="flex items-start gap-3 flex-wrap">
          <span className="text-2xl">🧮</span>
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-sm font-black uppercase tracking-wider">Shade Calc</h2>
            <p className="text-xs text-gray-700 mt-1">
              Auto-imports every shade structure from the <strong>Layout Builder</strong> and calculates the exact poles,
              connectors, anchors, tarps, and bungees needed to build them. Click cells to add/remove sections,
              cycle pole heights, and toggle wind walls. All edits are local — re-syncing pulls a fresh copy from the layout.
            </p>
            {floorplanName && (
              <p className="text-[11px] text-gray-600 mt-1">
                Layout: <strong>{floorplanName}</strong>
                {importSummary && importSummary.count > 0 && (
                  <> · {importSummary.structures} shade structure{importSummary.structures === 1 ? '' : 's'}
                    {importSummary.sails > 0 && `, ${importSummary.sails} shade sail${importSummary.sails === 1 ? '' : 's'}`}
                    {' '}· {importSummary.totalArea.toLocaleString()} ft² total
                    {importSummary.bbox && ` · ${importSummary.bbox.wFt}×${importSummary.bbox.hFt} ft bbox`}
                  </>
                )}
                {importSummary && importSummary.count === 0 && (
                  <> · <span className="text-amber-700">No shade objects on layout yet — <a href="/layout" className="underline">add some →</a></span></>
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
          {/* ───── LEFT: editor ───── */}
          <div className="space-y-3">
            {/* Controls strip */}
            <div className="border-2 border-black bg-white p-3 flex flex-wrap gap-3 items-center text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold uppercase tracking-wider text-[10px] text-gray-600">Pole height</span>
                <div className="flex border border-black">
                  {[8, 10].map(h => (
                    <button
                      key={h}
                      onClick={() => {
                        setDefaultHeight(h as 8 | 10)
                        setCells(prev => prev.map(row => row.map(c => c.active ? { ...c, height: h as 8 | 10 } : c)))
                      }}
                      className={cn(
                        'px-2 py-1 font-bold transition-colors',
                        defaultHeight === h ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                      )}
                    >
                      {h}′
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold uppercase tracking-wider text-[10px] text-gray-600">Tarps</span>
                <div className="flex border border-black">
                  {(['auto', 'all_small'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setTarpStrategy(s)}
                      className={cn(
                        'px-2 py-1 font-bold transition-colors',
                        tarpStrategy === s ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                      )}
                      title={s === 'auto' ? 'Smart: fewest tarps using 20×20s' : 'All 10×10: easier to source / replace'}
                    >
                      {s === 'auto' ? 'Smart' : 'All 10×10'}
                    </button>
                  ))}
                </div>
              </div>
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
                <button onClick={flipHeights} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-gray-400 text-gray-700 hover:bg-gray-100">Flip Heights</button>
                <button onClick={clearAll} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-red-400 text-red-700 hover:bg-red-50">Clear</button>
              </div>
            </div>

            {/* Custom Panels — arbitrary-sized rectangles (e.g. 30×50 sails) */}
            <div className="border-2 border-black bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                  Custom Panels — {panels.length} section{panels.length === 1 ? '' : 's'}
                  {panels.length > 0 && (
                    <span className="text-gray-400 ml-2">
                      · {panels.reduce((s, p) => s + p.wFt * p.hFt, 0).toLocaleString()} ft² total
                    </span>
                  )}
                </div>
                <button
                  onClick={addPanel}
                  className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white hover:bg-amber-600"
                >
                  + Add Panel
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mb-2 leading-snug">
                Use Panels for shade sails or any big rectangle where poles only go <em>around the outside</em> —
                no internal 10ft grid. Set edge spacing to <strong>0</strong> for corners only, or <strong>10ft</strong>/<strong>20ft</strong> for intermediate posts.
              </p>
              {panels.length > 0 && (
                <div className="space-y-1.5">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_60px_60px_70px_80px_70px_80px_28px] gap-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-500 px-1">
                    <div>Label</div>
                    <div>W (ft)</div>
                    <div>H (ft)</div>
                    <div>Pole H</div>
                    <div>Edge Poles</div>
                    <div>Frame</div>
                    <div>Coverage</div>
                    <div></div>
                  </div>
                  {panels.map(p => {
                    const ps = panelStats(p)
                    return (
                      <div key={p.id} className="grid grid-cols-[1fr_60px_60px_70px_80px_70px_80px_28px] gap-1.5 items-center text-xs">
                        <input
                          value={p.label}
                          onChange={e => updatePanel(p.id, { label: e.target.value })}
                          className="border border-gray-300 px-1.5 py-1 text-xs font-medium focus:outline-none focus:border-black"
                        />
                        <input
                          type="number" min={1} step={1} value={p.wFt}
                          onChange={e => updatePanel(p.id, { wFt: Math.max(1, +e.target.value || 0) })}
                          className="border border-gray-300 px-1.5 py-1 text-xs text-center focus:outline-none focus:border-black"
                        />
                        <input
                          type="number" min={1} step={1} value={p.hFt}
                          onChange={e => updatePanel(p.id, { hFt: Math.max(1, +e.target.value || 0) })}
                          className="border border-gray-300 px-1.5 py-1 text-xs text-center focus:outline-none focus:border-black"
                        />
                        <select
                          value={p.poleHeight}
                          onChange={e => updatePanel(p.id, { poleHeight: +e.target.value as 8 | 10 })}
                          className="border border-gray-300 px-1 py-1 text-xs focus:outline-none focus:border-black"
                        >
                          <option value={8}>8′</option>
                          <option value={10}>10′</option>
                        </select>
                        <select
                          value={p.edgeSpacingFt}
                          onChange={e => updatePanel(p.id, { edgeSpacingFt: +e.target.value })}
                          className="border border-gray-300 px-1 py-1 text-xs focus:outline-none focus:border-black"
                          title="Distance between poles along each side"
                        >
                          <option value={0}>Corners</option>
                          <option value={10}>Every 10′</option>
                          <option value={15}>Every 15′</option>
                          <option value={20}>Every 20′</option>
                          <option value={25}>Every 25′</option>
                        </select>
                        <select
                          value={p.frameType}
                          onChange={e => updatePanel(p.id, { frameType: e.target.value as FrameType })}
                          className="border border-gray-300 px-1 py-1 text-xs focus:outline-none focus:border-black"
                          title="Sail = fabric tensioned corner-to-corner. Rail = full EMT perimeter."
                        >
                          <option value="sail">Sail</option>
                          <option value="rail">Rail</option>
                        </select>
                        <div className="text-[10px] text-gray-600 text-center">
                          {ps.sqft.toLocaleString()} ft²<br />
                          <span className="text-gray-400">{ps.polesTotal} poles</span>
                        </div>
                        <button
                          onClick={() => removePanel(p.id)}
                          className="text-red-600 hover:bg-red-50 text-base leading-none w-6 h-6 flex items-center justify-center"
                          title="Delete panel"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              {panels.length === 0 && (
                <div className="text-[11px] text-gray-400 py-3 text-center border border-dashed border-gray-300">
                  No custom panels yet. Click <strong>+ Add Panel</strong> for a 30×50 sail, or add shade sails to the Layout Builder.
                </div>
              )}
            </div>

            {/* Cell Grid */}
            <div className="border-2 border-black bg-white p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-2">
                Camp Layout — each cell = 10×10 ft · {bounds ? `${bounds.cols * 10}×${bounds.rows * 10} ft · ${bounds.count} cells` : 'empty'}
              </div>
              <div
                className="grid gap-px bg-gray-300 p-1 select-none"
                style={{
                  gridTemplateColumns: `repeat(${view.maxC - view.minC + 1}, minmax(0, 1fr))`,
                  maxWidth: `${(view.maxC - view.minC + 1) * 36}px`,
                }}
              >
                {Array.from({ length: view.maxR - view.minR + 1 }).map((_, ri) =>
                  Array.from({ length: view.maxC - view.minC + 1 }).map((_, ci) => {
                    const r = view.minR + ri
                    const c = view.minC + ci
                    const cell = cells[r][c]
                    return (
                      <div
                        key={`${r}-${c}`}
                        onMouseDown={e => onCellDown(r, c, e)}
                        onMouseEnter={() => onCellEnter(r, c)}
                        className={cn(
                          'aspect-square cursor-pointer flex items-center justify-center text-[9px] font-bold transition-colors',
                          cell.active
                            ? cell.height === 8 ? 'bg-amber-200 text-black' : 'bg-amber-500 text-white'
                            : 'bg-white hover:bg-amber-50'
                        )}
                        title={cell.active ? `${cell.height}ft cell · click to cycle` : 'empty · click to add'}
                      >
                        {cell.active ? `${cell.height}′` : ''}
                      </div>
                    )
                  })
                )}
              </div>
              <div className="text-[10px] text-gray-500 mt-2">
                Click to cycle (empty → {defaultHeight}′ → {defaultHeight === 10 ? '8′' : '10′'} → empty) · drag to paint.
              </div>
            </div>

            {/* Wind walls */}
            <div className="border-2 border-black bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                  Wind Walls — {wallCount} {wallCount === 1 ? 'panel' : 'panels'}
                </div>
                <div className="text-[10px] text-gray-500">Each pill = one 10 ft panel</div>
              </div>
              {(['N','S','E','W'] as const).map(dir => {
                const rails = perimByDir[dir]
                if (rails.length === 0) return null
                const allOn = rails.every(r => wallSegments[r.key])
                const label = { N: 'NORTH', S: 'SOUTH', E: 'EAST', W: 'WEST' }[dir]
                return (
                  <div key={dir} className="mb-2 last:mb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-gray-700">{label} · {rails.length * 10} ft</span>
                      <button onClick={() => setSideAll(dir, !allOn)} className="text-[10px] font-bold text-amber-700 hover:text-amber-900">
                        {allOn ? '− ALL' : '+ ALL'}
                      </button>
                    </div>
                    <div className="flex gap-0.5">
                      {rails.map(r => (
                        <button
                          key={r.key}
                          onClick={() => toggleSegment(r.key)}
                          className={cn(
                            'flex-1 min-w-[20px] h-6 border transition-colors',
                            wallSegments[r.key]
                              ? 'bg-amber-500 border-amber-700'
                              : 'bg-gray-50 border-gray-300 hover:bg-amber-50'
                          )}
                          title="10 ft wall panel"
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
              {Object.values(perimByDir).every(rs => rs.length === 0) && (
                <div className="text-[11px] text-gray-500">Add cells above to see wall panel options.</div>
              )}
            </div>
          </div>

          {/* ───── RIGHT: stats + parts list ───── */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-px bg-black border-2 border-black">
              <Stat label="Poles" value={bom.stats.poleTotal.toString()} />
              <Stat label="Anchors" value={bom.stats.anchors.toString()} />
              <Stat label="Coverage" value={`${bom.stats.area.toLocaleString()} ft²`} />
              <Stat label="Bungees" value={bom.bungeesNeeded.toString()} />
              <Stat label="Connectors" value={bom.stats.connectorTotal.toString()} />
              <Stat label="Tarps" value={bom.tarps.length.toString()} />
              <Stat label="Total Weight" value={`${bom.totalWeight.toLocaleString()} lb`} />
              <Stat label="Build Time" value={`~${bom.stats.crewHours} h`} />
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
                    No shade structures yet — add cells on the left or reload from the layout.
                  </div>
                )}
              </div>
            </div>

            <div className="border-l-2 border-amber-500 bg-amber-50 p-3 text-[11px] text-gray-700 leading-relaxed">
              <strong className="block text-amber-900 mb-1">Ground: {GROUND_TYPES[ground].name}</strong>
              {GROUND_TYPES[ground].note}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-2">
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-base font-black text-black mt-0.5">{value}</div>
    </div>
  )
}
