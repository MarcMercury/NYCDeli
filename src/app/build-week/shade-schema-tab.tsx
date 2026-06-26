'use client'

/**
 * Shade Schema — construction guide for the shade structure SKELETON.
 *
 * Renders a 2D plan and a 3D model of the pole / strap / connector system for
 * the 30×50 shade structures placed on the Camp Map (Layout Builder). The
 * shade sail/fabric is intentionally NOT drawn — this is the build skeleton
 * only: vertical poles, top perimeter rails, ratchet straps, and the Maker
 * Pipe connectors (corner + tee) and base flanges.
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
interface PostNode {
  /** world feet */
  wx: number
  wy: number
  corner: boolean
  shared: boolean
  owned: boolean
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
    cornerConnectors: number
    teeConnectors: number
    baseFlanges: number
    ratchetStraps: number
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

function buildSchema(objects: FloorplanObjectRow[]): SchemaModel {
  const structs = objects.filter(o => o.object_type === 'shade_structure' && is30x50(o))
  // Sharing flags (collapses poles shared by two adjacent 30×50 structures).
  const postsByObj = computeShadePosts(structs, SPACING_FT)

  const structures: StructureModel[] = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const counts = {
    structures: structs.length,
    polesVertical: 0,
    railSegments: 0,
    cornerConnectors: 0,
    teeConnectors: 0,
    baseFlanges: 0,
    ratchetStraps: 0,
  }

  structs.forEach((o, idx) => {
    const localPosts = postsByObj.get(o.id) ?? []
    const posts: PostNode[] = localPosts.map(p => {
      const isCorner =
        (p.xLocal <= 0.001 || p.xLocal >= o.width_ft - 0.001) &&
        (p.yLocal <= 0.001 || p.yLocal >= o.height_ft - 0.001)
      const w = localToWorld(o, p.xLocal, p.yLocal)
      minX = Math.min(minX, w.x); maxX = Math.max(maxX, w.x)
      minY = Math.min(minY, w.y); maxY = Math.max(maxY, w.y)
      return { wx: w.x, wy: w.y, corner: isCorner, shared: p.shared, owned: p.owned }
    })

    // Perimeter rails: connect consecutive posts along each of the 4 edges.
    const xs = edgeStops(o.width_ft)
    const ys = edgeStops(o.height_ft)
    const rails: RailSeg[] = []
    const addEdge = (pts: Array<{ x: number; y: number }>) => {
      for (let i = 0; i < pts.length - 1; i++) {
        rails.push({ ax: pts[i].x, ay: pts[i].y, bx: pts[i + 1].x, by: pts[i + 1].y })
      }
    }
    addEdge(xs.map(x => localToWorld(o, x, 0)))               // top edge
    addEdge(xs.map(x => localToWorld(o, x, o.height_ft)))      // bottom edge
    addEdge(ys.map(y => localToWorld(o, 0, y)))                // left edge
    addEdge(ys.map(y => localToWorld(o, o.width_ft, y)))       // right edge

    const cornersWorld = [
      localToWorld(o, 0, 0),
      localToWorld(o, o.width_ft, 0),
      localToWorld(o, o.width_ft, o.height_ft),
      localToWorld(o, 0, o.height_ft),
    ]

    // Counts — only count physical (owned) poles once across shared structures.
    posts.forEach(p => {
      if (!p.owned) return
      counts.polesVertical += 1
      counts.baseFlanges += 1
      counts.ratchetStraps += 1
      if (p.corner) counts.cornerConnectors += 1
      else counts.teeConnectors += 1
    })
    counts.railSegments += rails.length

    structures.push({
      id: o.id,
      label: o.label?.trim() || `Structure ${idx + 1}`,
      cornersWorld,
      posts,
      rails,
    })
  })

  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 50; maxY = 50 }

  return {
    structures,
    bounds: { minX, minY, maxX, maxY },
    counts,
  }
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
              {/* straps (outward ticks) + poles */}
              {s.posts.map((p, i) => {
                if (!p.owned) return null
                // outward direction from structure center
                let ox = p.wx - sc.x
                let oy = p.wy - sc.y
                const mag = Math.hypot(ox, oy) || 1
                ox /= mag; oy /= mag
                const strapLen = 8 // ft outward
                return (
                  <g key={i}>
                    <line
                      x1={px(p.wx)} y1={py(p.wy)}
                      x2={px(p.wx + ox * strapLen)} y2={py(p.wy + oy * strapLen)}
                      stroke="#ea580c"
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                    />
                    <circle
                      cx={px(p.wx)} cy={py(p.wy)}
                      r={p.corner ? 6 : 5}
                      fill={p.corner ? '#2563eb' : '#16a34a'}
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

function Connector({ x, z, corner }: { x: number; z: number; corner: boolean }) {
  const hM = POLE_HEIGHT_FT * FT_TO_M
  return (
    <mesh position={[x, hM, z]} castShadow>
      <sphereGeometry args={[0.085, 14, 14]} />
      <meshStandardMaterial color={corner ? '#2563eb' : '#16a34a'} metalness={0.4} roughness={0.4} />
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

function Strap({ x, z, ox, oz }: { x: number; z: number; ox: number; oz: number }) {
  // ratchet strap: from pole top (x, hM, z) to a ground anchor outward
  const hM = POLE_HEIGHT_FT * FT_TO_M
  const reach = POLE_HEIGHT_FT * 0.7 * FT_TO_M
  const ax = x + ox * reach
  const az = z + oz * reach
  const top = new THREE.Vector3(x, hM, z)
  const anchor = new THREE.Vector3(ax, 0, az)
  const dir = new THREE.Vector3().subVectors(anchor, top)
  const len = dir.length()
  const mid = new THREE.Vector3().addVectors(top, anchor).multiplyScalar(0.5)
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
      {/* anchor stake */}
      <mesh position={[ax, 0.05, az]}>
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
              let ox = p.wx - sc.x
              let oz = p.wy - sc.y
              const mag = Math.hypot(ox, oz) || 1
              ox /= mag; oz /= mag
              return (
                <group key={`post-${i}`}>
                  <Pole x={x} z={z} shared={p.shared} />
                  <Connector x={x} z={z} corner={p.corner} />
                  <Strap x={x} z={z} ox={ox} oz={oz} />
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

// ───────────────────────────── Legend ─────────────────────────────
function Legend() {
  const items: Array<{ color: string; label: string }> = [
    { color: '#6b7280', label: 'Pole (1″ EMT, 10ft)' },
    { color: '#4b5563', label: 'Top rail (10ft EMT)' },
    { color: '#2563eb', label: 'Corner connector (90°)' },
    { color: '#16a34a', label: 'Tee connector' },
    { color: '#ea580c', label: 'Ratchet strap / anchor' },
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

      {/* ── Counts strip ── */}
      {hasStructures && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: 'Structures', value: model.counts.structures },
            { label: 'Poles', value: model.counts.polesVertical },
            { label: 'Top Rails', value: model.counts.railSegments },
            { label: 'Corner Conn.', value: model.counts.cornerConnectors },
            { label: 'Tee Conn.', value: model.counts.teeConnectors },
            { label: 'Base Flanges', value: model.counts.baseFlanges },
            { label: 'Ratchet Straps', value: model.counts.ratchetStraps },
          ].map(c => (
            <div key={c.label} className="border-2 border-black bg-white px-3 py-2 text-center">
              <div className="text-xl font-extrabold leading-none">{c.value}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">{c.label}</div>
            </div>
          ))}
        </div>
      )}

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
            Poles sit on the perimeter at every corner plus every {SPACING_FT}ft. Corners use 90° connectors; intermediate
            edge poles use tee connectors. Each pole gets a base flange and one ratchet strap to a ground anchor. Shared
            poles between adjacent structures are counted once.
          </p>
        </div>
      )}
    </div>
  )
}
