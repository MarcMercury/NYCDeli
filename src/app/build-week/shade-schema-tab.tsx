'use client'

/**
 * Shade Schema — construction guide for the shade structure SKELETON.
 *
 * Renders a 2D plan and a 3D model of the pole / strap / connector system for
 * the 30×50 shade structures placed on the Camp Map (Layout Builder). The
 * shade sail/fabric is intentionally NOT drawn — this is the build skeleton
 * only: vertical poles, top perimeter rails, ratchet straps, and the Maker
 * Pipe connectors (2/3/4/5-way, sized by how many pipes meet) and base flanges.
 *
 * Source of truth is the active floorplan. Only `shade_structure` objects whose
 * footprint is 30×50 (either orientation) are included — every other shade
 * element is ignored. Use "Reload from Layout" to resync after editing the map.
 */

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Grid, Html } from '@react-three/drei'
import * as THREE from 'three'
import { cn } from '@/lib/utils'
import { fetchActiveFloorplan, fetchFloorplanObjects } from '@/lib/floorplan'
import { computeShadePosts } from '@/lib/shade-posts'
import type { FloorplanObjectRow } from '@/types/database'

// ───────────────────────────── Constants ─────────────────────────────
const SPACING_FT = 10
const POLE_HEIGHT_FT = 10
const FT_TO_M = 0.3048
const SIZE_TOLERANCE_FT = 1.5

/** A 30×50 structure in either orientation. */
function is30x50(o: FloorplanObjectRow): boolean {
  const w = o.width_ft
  const h = o.height_ft
  const near = (a: number, b: number) => Math.abs(a - b) <= SIZE_TOLERANCE_FT
  return (
    (near(w, 30) && near(h, 50)) ||
    (near(w, 50) && near(h, 30))
  )
}

// ───────────────────────────── Geometry model ─────────────────────────────
/**
 * A strap segment runs from the TOP of a pole down to a ground target.
 *  • ground = true  → the strap ties into a ground anchor (needs a lag bolt).
 *  • ground = false → the strap ties to the base plate of the next pole
 *                     (pyramid leg between two verticals — no extra anchor).
 */
interface StrapSeg {
  toX: number
  toY: number
  ground: boolean
}

interface PostNode {
  /** world feet */
  wx: number
  wy: number
  corner: boolean
  shared: boolean
  owned: boolean
  /** pipes meeting at the top connector incl. the vertical: 2..5 way */
  connectorWay: number
  /** straps anchoring this pole (1 normally, 4 at a wall junction = pyramid) */
  straps: StrapSeg[]
  /** world-space unit vector pointing out from the wall (for angled straps) */
  outX: number
  outY: number
}

interface RailSeg {
  ax: number
  ay: number
  bx: number
  by: number
}

interface StructureModel {
  id: string
  label: string
  cornersWorld: Array<{ x: number; y: number }>
  posts: PostNode[]
  rails: RailSeg[]
}

interface SchemaModel {
  structures: StructureModel[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  counts: {
    structures: number
    polesVertical: number
    railSegments: number
    way2: number
    way3: number
    way4: number
    way5: number
    baseFlanges: number
    straps: number
    groundAnchors: number
  }
}

function localToWorld(o: FloorplanObjectRow, lx: number, ly: number) {
  const cx = o.x + o.width_ft / 2
  const cy = o.y + o.height_ft / 2
  const dx = lx - o.width_ft / 2
  const dy = ly - o.height_ft / 2
  const rad = ((o.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
}

function edgeStops(len: number): number[] {
  const arr: number[] = [0]
  for (let v = SPACING_FT; v < len - 0.001; v += SPACING_FT) arr.push(v)
  arr.push(len)
  return arr
}

/**
 * True when a world point sits clearly inside the given structure's footprint
 * (used to detect when a ground-strap leg would aim into the camp interior
 * rather than out to open exterior ground). `inset` keeps perimeter poles from
 * counting as "inside" their own structure.
 */
function pointInStructure(o: FloorplanObjectRow, wx: number, wy: number, inset: number): boolean {
  const cx = o.x + o.width_ft / 2
  const cy = o.y + o.height_ft / 2
  const rad = ((o.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dxw = wx - cx
  const dyw = wy - cy
  const lx = dxw * cos + dyw * sin + o.width_ft / 2
  const ly = -dxw * sin + dyw * cos + o.height_ft / 2
  return lx > inset && lx < o.width_ft - inset && ly > inset && ly < o.height_ft - inset
}

function buildSchema(objects: FloorplanObjectRow[]): SchemaModel {
  const structs = objects.filter(o => o.object_type === 'shade_structure' && is30x50(o))
  // Sharing flags (collapses poles shared by two adjacent 30×50 structures).
  const postsByObj = computeShadePosts(structs, SPACING_FT)

  const keyOf = (x: number, y: number) => `${Math.round(x / 0.5)}_${Math.round(y / 0.5)}`

  // Direction set per physical pole — used to classify junctions. Each rail
  // contributes its bearing (rounded) at both endpoints; the number of distinct
  // bearings = the junction degree (2 = corner/inline, 3 = tee, 4 = cross).
  const ROUND_DEG = 15
  const dirByKey = new Map<string, Set<number>>()
  const addDir = (k: string, ax: number, ay: number, bx: number, by: number) => {
    const deg = (((Math.round((Math.atan2(by - ay, bx - ax) * 180) / Math.PI / ROUND_DEG) * ROUND_DEG) % 360) + 360) % 360
    let set = dirByKey.get(k)
    if (!set) { set = new Set(); dirByKey.set(k, set) }
    set.add(deg)
  }

  // Adjacent poles (the other end of each rail) per pole — used to aim the
  // pyramid straps at neighbouring pole base plates.
  const neighborsByKey = new Map<string, Map<string, { x: number; y: number }>>()
  const addNeighbor = (k: string, nx: number, ny: number) => {
    let m = neighborsByKey.get(k)
    if (!m) { m = new Map(); neighborsByKey.set(k, m) }
    m.set(`${Math.round(nx / 0.5)}_${Math.round(ny / 0.5)}`, { x: nx, y: ny })
  }

  // ── Pass 1: build rails + per-structure post records (with edge order) ──
  type PostTmp = {
    lx: number; ly: number; wx: number; wy: number
    corner: boolean; shared: boolean; owned: boolean
    inlineOrder: number | null
    outX: number; outY: number
    normalsWorld: Array<{ x: number; y: number }>
  }
  type StructTmp = {
    id: string; label: string; ownerCenter: { x: number; y: number }
    cornersWorld: Array<{ x: number; y: number }>
    rails: RailSeg[]; recs: PostTmp[]
  }

  const structsTmp: StructTmp[] = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  structs.forEach((o, idx) => {
    const sharedLookup = new Map<string, { shared: boolean; owned: boolean }>()
    ;(postsByObj.get(o.id) ?? []).forEach(p => {
      sharedLookup.set(`${p.xLocal.toFixed(2)}_${p.yLocal.toFixed(2)}`, { shared: p.shared, owned: p.owned })
    })

    const xs = edgeStops(o.width_ft)
    const ys = edgeStops(o.height_ft)

    // Rails (perimeter) + direction accumulation.
    const rails: RailSeg[] = []
    const addEdge = (pts: Array<{ x: number; y: number }>) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1]
        rails.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y })
        addDir(keyOf(a.x, a.y), a.x, a.y, b.x, b.y)
        addDir(keyOf(b.x, b.y), b.x, b.y, a.x, a.y)
        addNeighbor(keyOf(a.x, a.y), b.x, b.y)
        addNeighbor(keyOf(b.x, b.y), a.x, a.y)
      }
    }
    addEdge(xs.map(x => localToWorld(o, x, 0)))               // top edge
    addEdge(xs.map(x => localToWorld(o, x, o.height_ft)))     // bottom edge
    addEdge(ys.map(y => localToWorld(o, 0, y)))               // left edge
    addEdge(ys.map(y => localToWorld(o, o.width_ft, y)))      // right edge

    // Posts with per-edge inline ordering (corners get inlineOrder = null).
    const recMap = new Map<string, PostTmp>()
    const addPost = (lx: number, ly: number, inlineOrder: number | null) => {
      const lk = `${lx.toFixed(2)}_${ly.toFixed(2)}`
      const existing = recMap.get(lk)
      if (existing) {
        if (inlineOrder != null && existing.inlineOrder == null) existing.inlineOrder = inlineOrder
        return
      }
      const isCorner =
        (lx <= 0.001 || lx >= o.width_ft - 0.001) &&
        (ly <= 0.001 || ly >= o.height_ft - 0.001)
      const w = localToWorld(o, lx, ly)
      const sm = sharedLookup.get(lk) ?? { shared: false, owned: true }

      // Outward direction = sum of the wall normals of the edge(s) this pole
      // sits on, in the structure's LOCAL frame, then rotated to world.
      //  • tee / inline edge pole → one normal → strap straight out (90° to wall)
      //  • corner → two normals → 45° bisector of the two horizontal pipes
      let nx = 0, ny = 0
      if (lx <= 0.001) nx -= 1
      if (lx >= o.width_ft - 0.001) nx += 1
      if (ly <= 0.001) ny -= 1
      if (ly >= o.height_ft - 0.001) ny += 1
      const nMag = Math.hypot(nx, ny) || 1
      nx /= nMag; ny /= nMag
      const rad = ((o.rotation ?? 0) * Math.PI) / 180
      const cos = Math.cos(rad), sin = Math.sin(rad)
      const outX = nx * cos - ny * sin
      const outY = nx * sin + ny * cos

      // The individual outward wall normals (one per edge this pole sits on),
      // rotated to world. Corners get two — used to place a strap along each
      // exterior wall direction rather than a single diagonal.
      const normalsWorld: Array<{ x: number; y: number }> = []
      const pushNormal = (lnx: number, lny: number) =>
        normalsWorld.push({ x: lnx * cos - lny * sin, y: lnx * sin + lny * cos })
      if (lx <= 0.001) pushNormal(-1, 0)
      if (lx >= o.width_ft - 0.001) pushNormal(1, 0)
      if (ly <= 0.001) pushNormal(0, -1)
      if (ly >= o.height_ft - 0.001) pushNormal(0, 1)

      minX = Math.min(minX, w.x); maxX = Math.max(maxX, w.x)
      minY = Math.min(minY, w.y); maxY = Math.max(maxY, w.y)
      recMap.set(lk, { lx, ly, wx: w.x, wy: w.y, corner: isCorner, shared: sm.shared, owned: sm.owned, inlineOrder, outX, outY, normalsWorld })
    }
    const inlineIdx = (i: number, len: number) => (i > 0 && i < len - 1 ? i - 1 : null)
    xs.forEach((x, i) => addPost(x, 0, inlineIdx(i, xs.length)))
    xs.forEach((x, i) => addPost(x, o.height_ft, inlineIdx(i, xs.length)))
    ys.forEach((y, j) => addPost(0, y, inlineIdx(j, ys.length)))
    ys.forEach((y, j) => addPost(o.width_ft, y, inlineIdx(j, ys.length)))

    structsTmp.push({
      id: o.id,
      label: o.label?.trim() || `Structure ${idx + 1}`,
      ownerCenter: { x: o.x + o.width_ft / 2, y: o.y + o.height_ft / 2 },
      cornersWorld: [
        localToWorld(o, 0, 0),
        localToWorld(o, o.width_ft, 0),
        localToWorld(o, o.width_ft, o.height_ft),
        localToWorld(o, 0, o.height_ft),
      ],
      rails,
      recs: [...recMap.values()],
    })
  })

  // ── Pass 2: classify each owned pole's connector + straps ──
  const counts = {
    structures: structs.length,
    polesVertical: 0,
    railSegments: 0,
    way2: 0,
    way3: 0,
    way4: 0,
    way5: 0,
    baseFlanges: 0,
    straps: 0,
    groundAnchors: 0,
  }

  const STRAP_REACH_FT = POLE_HEIGHT_FT * 0.7

  const structures: StructureModel[] = structsTmp.map(st => {
    const posts: PostNode[] = st.recs.map(p => {
      const key = keyOf(p.wx, p.wy)
      const hDeg = dirByKey.get(key)?.size ?? 0 // distinct horizontal rail directions
      const connectorWay = hDeg + 1 // + the vertical pole
      const isJunction = hDeg >= 3 // inner wall meets perimeter (or interior cross)

      const straps: StrapSeg[] = []
      if (p.owned) {
        if (isJunction) {
          // PYRAMID: a strap toward every neighbouring pole base, plus a strap
          // straight to the ground on any open (exterior) side. 4 legs total.
          const neighbors = [...(neighborsByKey.get(key)?.values() ?? [])]
          let sx = 0, sy = 0
          neighbors.forEach(n => {
            straps.push({ toX: n.x, toY: n.y, ground: false })
            const dx = n.x - p.wx, dy = n.y - p.wy
            const m = Math.hypot(dx, dy) || 1
            sx += dx / m; sy += dy / m
          })
          // Open sides: the missing cardinal direction → strap into the ground,
          // but ONLY when that direction faces true exterior. Interior junctions
          // (where structures meet inside the camp) get no ground tie-down — the
          // pyramid legs to neighbouring pole bases are enough.
          if (neighbors.length < 4) {
            let ex = -sx, ey = -sy
            const m = Math.hypot(ex, ey)
            if (m > 0.01) {
              ex /= m; ey /= m
              const tX = p.wx + ex * STRAP_REACH_FT
              const tY = p.wy + ey * STRAP_REACH_FT
              const interior = structs.some(o => pointInStructure(o, tX, tY, 1))
              if (!interior) straps.push({ toX: tX, toY: tY, ground: true })
            }
          }
        } else if (p.corner) {
          // Exterior corner: one angled tie-down along EACH of the two outward
          // wall directions (2 straps), skipping any that would aim into the
          // open interior of a structure.
          p.normalsWorld.forEach(n => {
            const tX = p.wx + n.x * STRAP_REACH_FT
            const tY = p.wy + n.y * STRAP_REACH_FT
            if (!structs.some(o => pointInStructure(o, tX, tY, 1))) {
              straps.push({ toX: tX, toY: tY, ground: true })
            }
          })
        } else if (p.shared) {
          // Interior inline pole (middle of a shared edge): straight down, wrapped.
          straps.push({ toX: p.wx, toY: p.wy, ground: true })
        } else if (p.inlineOrder != null && p.inlineOrder % 2 === 0) {
          // Plain outer-perimeter pole: angled tie-down on every other pole —
          // perimeter only (skip if it would aim into the camp interior).
          const tX = p.wx + p.outX * STRAP_REACH_FT
          const tY = p.wy + p.outY * STRAP_REACH_FT
          if (!structs.some(o => pointInStructure(o, tX, tY, 1))) {
            straps.push({ toX: tX, toY: tY, ground: true })
          }
        }

        counts.polesVertical += 1
        counts.baseFlanges += 1
        if (connectorWay <= 2) counts.way2 += 1
        else if (connectorWay === 3) counts.way3 += 1
        else if (connectorWay === 4) counts.way4 += 1
        else counts.way5 += 1
        counts.straps += straps.length
        counts.groundAnchors += straps.filter(s => s.ground).length
      }

      return {
        wx: p.wx, wy: p.wy, corner: p.corner, shared: p.shared, owned: p.owned,
        connectorWay, straps, outX: p.outX, outY: p.outY,
      }
    })

    counts.railSegments += st.rails.length

    return { id: st.id, label: st.label, cornersWorld: st.cornersWorld, posts, rails: st.rails }
  })

  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 50; maxY = 50 }

  return {
    structures,
    bounds: { minX, minY, maxX, maxY },
    counts,
  }
}

// Connector colour by "way" (number of pipes meeting incl. the vertical).
function wayColor(way: number): string {
  if (way <= 2) return '#64748b' // slate — 2-way
  if (way === 3) return '#2563eb' // blue — 3-way (corner / inline)
  if (way === 4) return '#16a34a' // green — 4-way (wall junction)
  return '#9333ea' // purple — 5-way (interior cross)
}

// ───────────────────────────── 2D Plan (SVG) ─────────────────────────────
function SchemaPlan2D({ model }: { model: SchemaModel }) {
  const PAD = 24
  const { minX, minY, maxX, maxY } = model.bounds
  const wFt = Math.max(1, maxX - minX)
  const hFt = Math.max(1, maxY - minY)
  // Scale to fit a 920-wide viewport while keeping aspect.
  const scale = Math.min(920 / wFt, 640 / hFt)
  const svgW = wFt * scale + PAD * 2
  const svgH = hFt * scale + PAD * 2
  const px = (x: number) => (x - minX) * scale + PAD
  const py = (y: number) => (y - minY) * scale + PAD

  return (
    <div className="overflow-auto border-2 border-black bg-white">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="block"
        style={{ minWidth: svgW }}
      >
        {/* faint grid */}
        <defs>
          <pattern id="schemaGrid" width={SPACING_FT * scale} height={SPACING_FT * scale} patternUnits="userSpaceOnUse">
            <path
              d={`M ${SPACING_FT * scale} 0 L 0 0 0 ${SPACING_FT * scale}`}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect x={0} y={0} width={svgW} height={svgH} fill="url(#schemaGrid)" />

        {model.structures.map(s => {
          // structure center for outward strap direction
          const sc = {
            x: s.cornersWorld.reduce((a, c) => a + c.x, 0) / 4,
            y: s.cornersWorld.reduce((a, c) => a + c.y, 0) / 4,
          }
          return (
            <g key={s.id}>
              {/* footprint outline */}
              <polygon
                points={s.cornersWorld.map(c => `${px(c.x)},${py(c.y)}`).join(' ')}
                fill="rgba(250,204,21,0.06)"
                stroke="none"
              />
              {/* rails */}
              {s.rails.map((r, i) => (
                <line
                  key={i}
                  x1={px(r.ax)} y1={py(r.ay)}
                  x2={px(r.bx)} y2={py(r.by)}
                  stroke="#374151"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              ))}
              {/* straps + poles */}
              {s.posts.map((p, i) => {
                if (!p.owned) return null
                return (
                  <g key={i}>
                    {/* straps (pyramid legs / angled / vertical) */}
                    {p.straps.map((st, j) => {
                      const isVertical = Math.hypot(st.toX - p.wx, st.toY - p.wy) < 0.5
                      if (isVertical) {
                        // straight-down wrapped strap reads as a ring in plan
                        return (
                          <circle
                            key={j}
                            cx={px(p.wx)} cy={py(p.wy)}
                            r={9}
                            fill="none"
                            stroke="#ea580c"
                            strokeWidth={1.5}
                            strokeDasharray="3 2"
                          />
                        )
                      }
                      return (
                        <g key={j}>
                          <line
                            x1={px(p.wx)} y1={py(p.wy)}
                            x2={px(st.toX)} y2={py(st.toY)}
                            stroke="#ea580c"
                            strokeWidth={1.5}
                            strokeDasharray={st.ground ? '4 2' : undefined}
                          />
                          {st.ground && (
                            <circle cx={px(st.toX)} cy={py(st.toY)} r={2} fill="#111827" />
                          )}
                        </g>
                      )
                    })}
                    {/* pole, coloured by connector way */}
                    <circle
                      cx={px(p.wx)} cy={py(p.wy)}
                      r={p.connectorWay >= 4 ? 6 : 5}
                      fill={wayColor(p.connectorWay)}
                      stroke={p.shared ? '#d97706' : '#ffffff'}
                      strokeWidth={p.shared ? 3 : 1.5}
                    />
                  </g>
                )
              })}
              {/* label */}
              <text
                x={px(sc.x)} y={py(sc.y)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={700}
                fill="#111827"
                style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                {s.label}
              </text>
              <text
                x={px(sc.x)} y={py(sc.y) + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                30 × 50 ft · {POLE_HEIGHT_FT}ft poles
              </text>
            </g>
          )
        })}

        {/* North arrow */}
        <g transform={`translate(${svgW - 36}, 34)`}>
          <line x1={0} y1={16} x2={0} y2={-12} stroke="#111827" strokeWidth={2} />
          <polygon points="0,-16 -5,-6 5,-6" fill="#111827" />
          <text x={0} y={30} textAnchor="middle" fontSize={10} fontWeight={700} fill="#111827">N</text>
        </g>
      </svg>
    </div>
  )
}

// ───────────────────────────── 3D Skeleton ─────────────────────────────
function Pole({ x, z, shared }: { x: number; z: number; shared: boolean }) {
  const hM = POLE_HEIGHT_FT * FT_TO_M
  const r = 0.045
  return (
    <group position={[x, 0, z]}>
      {/* vertical pole */}
      <mesh position={[0, hM / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, hM, 10]} />
        <meshStandardMaterial color={shared ? '#d97706' : '#6b7280'} metalness={0.9} roughness={0.25} />
      </mesh>
      {/* base flange */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[r * 2.4, r * 2.4, 0.04, 12]} />
        <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  )
}

function Connector({ x, z, way }: { x: number; z: number; way: number }) {
  const hM = POLE_HEIGHT_FT * FT_TO_M
  // bigger node for higher-way junctions so they read clearly in the guide
  const r = way >= 5 ? 0.12 : way === 4 ? 0.105 : 0.085
  return (
    <mesh position={[x, hM, z]} castShadow>
      <sphereGeometry args={[r, 14, 14]} />
      <meshStandardMaterial color={wayColor(way)} metalness={0.4} roughness={0.4} />
    </mesh>
  )
}

function Rail({ a, b }: { a: [number, number]; b: [number, number] }) {
  const hM = POLE_HEIGHT_FT * FT_TO_M
  const ax = a[0], az = a[1], bx = b[0], bz = b[1]
  const dx = bx - ax, dz = bz - az
  const len = Math.hypot(dx, dz)
  const midX = (ax + bx) / 2
  const midZ = (az + bz) / 2
  const angle = Math.atan2(dz, dx)
  return (
    <mesh position={[midX, hM, midZ]} rotation={[0, -angle, 0]} castShadow>
      <boxGeometry args={[len, 0.05, 0.05]} />
      <meshStandardMaterial color="#4b5563" metalness={0.85} roughness={0.3} />
    </mesh>
  )
}

function StrapLeg3D({ x, z, tx, tz, ground }: { x: number; z: number; tx: number; tz: number; ground: boolean }) {
  // ratchet strap from the pole top down to a ground target — either a ground
  // anchor (exterior) or the base plate of a neighbouring pole (pyramid leg).
  const hM = POLE_HEIGHT_FT * FT_TO_M
  const top = new THREE.Vector3(x, hM, z)
  const target = new THREE.Vector3(tx, 0, tz)
  const dir = new THREE.Vector3().subVectors(target, top)
  const len = dir.length()
  const mid = new THREE.Vector3().addVectors(top, target).multiplyScalar(0.5)
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  )
  return (
    <group>
      <mesh position={mid.toArray()} quaternion={quat}>
        <cylinderGeometry args={[0.015, 0.015, len, 6]} />
        <meshStandardMaterial color="#ea580c" metalness={0.1} roughness={0.8} />
      </mesh>
      {ground && (
        <mesh position={[tx, 0.05, tz]}>
          <cylinderGeometry args={[0.03, 0.03, 0.1, 6]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      )}
    </group>
  )
}

function VerticalStrap({ x, z }: { x: number; z: number }) {
  // strap straight down, wrapped around the pole, to an anchor at its base.
  const hM = POLE_HEIGHT_FT * FT_TO_M
  const r = 0.045
  const off = r + 0.02
  return (
    <group position={[x, 0, z]}>
      {/* vertical strap run hugging the pole */}
      <mesh position={[off, hM / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, hM, 6]} />
        <meshStandardMaterial color="#ea580c" metalness={0.1} roughness={0.8} />
      </mesh>
      {/* wrap bands around the pole near top, middle, bottom */}
      {[0.85, 0.5, 0.15].map((f, i) => (
        <mesh key={i} position={[0, hM * f, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[off, 0.01, 6, 16]} />
          <meshStandardMaterial color="#ea580c" metalness={0.1} roughness={0.8} />
        </mesh>
      ))}
      {/* ground anchor stake at the base */}
      <mesh position={[off, 0.05, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.1, 6]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </group>
  )
}

function Schema3DScene({ model }: { model: SchemaModel }) {
  const { minX, minY, maxX, maxY } = model.bounds
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  // world feet → centered meters; floorplan y → three z
  const toM = (wx: number, wy: number): [number, number] => [
    (wx - cx) * FT_TO_M,
    (wy - cy) * FT_TO_M,
  ]

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[10, 18, 8]} intensity={1.1} castShadow />
      <directionalLight position={[-10, 12, -8]} intensity={0.4} />

      <Grid
        args={[80, 80]}
        cellSize={SPACING_FT * FT_TO_M}
        cellColor="#d1d5db"
        sectionSize={SPACING_FT * FT_TO_M * 5}
        sectionColor="#9ca3af"
        fadeDistance={60}
        fadeStrength={1}
        infiniteGrid
        position={[0, 0, 0]}
      />

      {model.structures.map(s => {
        const sc = {
          x: s.cornersWorld.reduce((a, c) => a + c.x, 0) / 4,
          y: s.cornersWorld.reduce((a, c) => a + c.y, 0) / 4,
        }
        const labelPos = toM(sc.x, sc.y)
        return (
          <group key={s.id}>
            {/* rails */}
            {s.rails.map((r, i) => (
              <Rail key={`rail-${i}`} a={toM(r.ax, r.ay)} b={toM(r.bx, r.by)} />
            ))}
            {/* poles + connectors + straps */}
            {s.posts.map((p, i) => {
              if (!p.owned) return null
              const [x, z] = toM(p.wx, p.wy)
              return (
                <group key={`post-${i}`}>
                  <Pole x={x} z={z} shared={p.shared} />
                  <Connector x={x} z={z} way={p.connectorWay} />
                  {p.straps.map((st, j) => {
                    const isVertical = Math.hypot(st.toX - p.wx, st.toY - p.wy) < 0.5
                    if (isVertical) return <VerticalStrap key={j} x={x} z={z} />
                    const [tx, tz] = toM(st.toX, st.toY)
                    return <StrapLeg3D key={j} x={x} z={z} tx={tx} tz={tz} ground={st.ground} />
                  })}
                </group>
              )
            })}
            {/* floating label */}
            <Text
              position={[labelPos[0], POLE_HEIGHT_FT * FT_TO_M + 0.6, labelPos[1]]}
              fontSize={0.6}
              color="#111827"
              anchorX="center"
              anchorY="middle"
            >
              {s.label}
            </Text>
          </group>
        )
      })}
    </>
  )
}

function Schema3D({ model }: { model: SchemaModel }) {
  const { minX, minY, maxX, maxY } = model.bounds
  const spanFt = Math.max(maxX - minX, maxY - minY, 30)
  const camDist = spanFt * FT_TO_M * 1.4
  return (
    <div className="border-2 border-black bg-gradient-to-b from-sky-50 to-gray-100" style={{ height: 560 }}>
      <Canvas shadows camera={{ position: [camDist * 0.8, camDist * 0.8, camDist], fov: 45 }}>
        <Suspense
          fallback={
            <Html center>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Loading…</span>
            </Html>
          }
        >
          <Schema3DScene model={model} />
          <OrbitControls
            makeDefault
            enableDamping
            minPolarAngle={0.1}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, POLE_HEIGHT_FT * FT_TO_M * 0.5, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}

// ───────────────────────────── Inventory Needs ─────────────────────────────
/**
 * Item names/SKUs are taken from the Shade Calculator catalog, but the
 * quantities come from THIS schema model (the placed 30×50 structures), not the
 * calculator's own math.
 */
const SCHEMA_PRODUCTS = {
  emt:    { name: '1" × 10\' EMT Conduit',                    sku: 'EMT-1-10' },
  way2:   { name: 'Maker Pipe 2-Way Connector — 1"',         sku: 'MP-2W' },
  way3:   { name: 'Maker Pipe 3-Way Connector — 1"',         sku: 'MP-3W' },
  way4:   { name: 'Maker Pipe 4-Way Connector — 1"',         sku: 'MP-4W' },
  way5:   { name: 'Maker Pipe 5-Way Connector — 1"',         sku: 'MP-5W' },
  flange: { name: 'Maker Pipe Flange Connector — 1"',        sku: 'MP-FLANGE' },
  strap:  { name: '1" × 15\' Ratchet Tie-Down (500 lb WLL)', sku: 'RATCH-1-15' },
  anchor: { name: '1/2" × 18" Hex Lag Bolt Ground Anchor',   sku: 'LAG-12-18' },
} as const

type NeedItem = { name: string; sku: string; label?: string; qty: number }
type NeedGroup = { group: string; items: NeedItem[] }

function buildNeeds(c: SchemaModel['counts']): NeedGroup[] {
  const groups: NeedGroup[] = [
    {
      group: 'Frame · EMT',
      items: [
        { ...SCHEMA_PRODUCTS.emt, label: 'verticals', qty: c.polesVertical },
        { ...SCHEMA_PRODUCTS.emt, label: 'top rails', qty: c.railSegments },
      ],
    },
    {
      group: 'Connectors',
      items: [
        { ...SCHEMA_PRODUCTS.way2, label: 'wall end', qty: c.way2 },
        { ...SCHEMA_PRODUCTS.way3, label: 'corner / inline', qty: c.way3 },
        { ...SCHEMA_PRODUCTS.way4, label: 'wall junction', qty: c.way4 },
        { ...SCHEMA_PRODUCTS.way5, label: 'interior cross', qty: c.way5 },
        { ...SCHEMA_PRODUCTS.flange, label: 'pole base', qty: c.baseFlanges },
      ],
    },
    {
      group: 'Straps & Anchoring',
      items: [
        { ...SCHEMA_PRODUCTS.strap, label: 'incl. 4-leg pyramids at junctions', qty: c.straps },
        { ...SCHEMA_PRODUCTS.anchor, label: 'ground tie-downs only', qty: c.groundAnchors },
      ],
    },
  ]
  return groups
    .map(g => ({ ...g, items: g.items.filter(i => i.qty > 0) }))
    .filter(g => g.items.length > 0)
}

function NeedsList({ model }: { model: SchemaModel }) {
  const groups = buildNeeds(model.counts)
  const emtTotal = model.counts.polesVertical + model.counts.railSegments
  const straps = model.counts.straps
  return (
    <div className="border-2 border-black bg-white">
      <div className="flex items-center justify-between border-b-2 border-black px-3 py-1.5">
        <span className="text-xs font-bold uppercase tracking-wider">Inventory Needs</span>
        <span className="text-[11px] text-gray-500">
          {model.counts.structures} structure{model.counts.structures !== 1 ? 's' : ''} · {emtTotal} EMT sticks · {straps} straps
        </span>
      </div>
      <div>
        {groups.map(g => (
          <div key={g.group}>
            <div className="bg-gray-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
              {g.group}
            </div>
            {g.items.map((it, i) => (
              <div
                key={`${it.sku}-${i}`}
                className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-1 text-[11px] last:border-b-0"
              >
                <span className="truncate text-gray-800">
                  {it.name}
                  {it.label ? <span className="text-gray-400"> · {it.label}</span> : null}
                  <span className="text-gray-300"> · {it.sku}</span>
                </span>
                <span className="shrink-0 font-bold tabular-nums">{it.qty}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────────── Legend ─────────────────────────────
function Legend() {
  const items: Array<{ color: string; label: string }> = [
    { color: '#6b7280', label: 'Pole (1″ EMT, 10ft)' },
    { color: '#4b5563', label: 'Top rail (10ft EMT)' },
    { color: '#64748b', label: '2-way connector' },
    { color: '#2563eb', label: '3-way connector (corner / inline)' },
    { color: '#16a34a', label: '4-way connector (wall junction)' },
    { color: '#9333ea', label: '5-way connector (interior cross)' },
    { color: '#ea580c', label: 'Ratchet strap / pyramid leg / anchor' },
    { color: '#d97706', label: 'Shared pole (two structures)' },
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-gray-700">
      {items.map(it => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border border-black" style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

// ───────────────────────────── Component ─────────────────────────────
type ViewMode = '3d' | '2d'

export default function ShadeSchemaTab() {
  const [objects, setObjects] = useState<FloorplanObjectRow[]>([])
  const [floorplanName, setFloorplanName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('3d')
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const fp = await fetchActiveFloorplan()
      if (!fp) {
        setFloorplanName('')
        setObjects([])
        return
      }
      setFloorplanName(fp.name ?? '')
      const objs = await fetchFloorplanObjects(fp.id)
      setObjects(objs)
      setLastSync(new Date())
    } catch (e) {
      console.error('[ShadeSchema] load failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const model = useMemo(() => buildSchema(objects), [objects])
  const hasStructures = model.counts.structures > 0

  return (
    <div className="space-y-4">
      {/* ── Header / controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-white px-4 py-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider">Shade Schema — Build Skeleton</h3>
          <p className="text-xs text-gray-500">
            {floorplanName ? <>Layout: <span className="font-semibold">{floorplanName}</span> · </> : null}
            30×50 structures only · poles, straps &amp; connectors (no sail)
            {lastSync ? <> · synced {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</> : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex border-2 border-black">
            {(['3d', '2d'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                  view === v ? 'bg-yellow-400 text-black' : 'bg-white text-gray-600 hover:bg-gray-100'
                )}
              >
                {v === '3d' ? '3D' : '2D Plan'}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-gray-100 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Reload from Layout'}
          </button>
        </div>
      </div>

      {/* ── Inventory needs (compact list) ── */}
      {hasStructures && <NeedsList model={model} />}

      {/* ── Render area ── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center border-2 border-black bg-white text-sm text-gray-400">
          Loading layout…
        </div>
      ) : !hasStructures ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-400 bg-white text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-gray-500">No 30×50 structures found</p>
          <p className="max-w-md text-xs text-gray-400">
            Add one or more 30ft × 50ft <span className="font-semibold">shade structure</span> objects to the Camp Map
            (Layout Builder), then click “Reload from Layout”. Other shade elements are intentionally excluded.
          </p>
        </div>
      ) : view === '3d' ? (
        <Schema3D model={model} />
      ) : (
        <SchemaPlan2D model={model} />
      )}

      {/* ── Legend ── */}
      {hasStructures && (
        <div className="border-2 border-black bg-white px-4 py-3">
          <Legend />
          <p className="mt-2 text-[11px] text-gray-500">
            Poles sit on the perimeter at every corner plus every {SPACING_FT}ft, each on a base flange.{' '}
            <strong>Connectors</strong> are sized by how many pipes meet: dead-ends are 2-way, corners and inline edge
            poles are 3-way, wall junctions (where an inner wall meets the perimeter) are 4-way, and interior crosses are
            5-way. <strong>Strap rule:</strong> wall junctions get a 4-leg <em>pyramid</em> — straps running to each
            neighbouring pole base plus one ground anchor on the open side; interior poles (where two sections meet
            end-to-end) get a strap straight down wrapped around the pole; remaining perimeter poles get an angled
            ground tie-down on every other pole, always including the corners. Only ground-facing straps need a lag-bolt
            anchor. Shared poles between adjacent structures are counted once.
          </p>
        </div>
      )}
    </div>
  )
}
