'use client'

import React, { useRef, useEffect, useMemo, useContext, createContext, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html, ContactShadows, Text, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { FloorplanConfigRow, FloorplanObjectRow, RoofShape } from '@/types/database'
import { computeShadePosts, type ShadePost } from '@/lib/shade-posts'

// ─── Color Helpers ─────────────────────────────────────────────
function hexToThreeColor(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

function getDefaultElevation(type: string): number {
  const heights: Record<string, number> = {
    shade_structure: 12, tent: 7, kitchen: 10, bar: 10, stage: 8,
    shade_sail: 12,
    common_area: 10, refrigerated_truck: 10, shower_container: 9,
    pc_container: 9, rv: 10, vehicle: 5, generator: 4, porta_potty: 8,
    water_station: 3, first_aid: 8, storage: 6, prep_area: 8,
    service_area: 8, fuel_storage: 3, propane_storage: 3,
    fire_extinguisher: 2, fire_pit: 1, grill: 4, flame_effect: 3,
    fence: 6, sign: 5, entrance: 8, bike_parking: 3, table: 3,
    stairs_ladder: 10,
    fire_lane: 0, road: 0, path_of_travel: 0, distance_marker: 0, neighbor_zone: 0,
  }
  return heights[type] ?? 5
}

function getObjectElevation(obj: FloorplanObjectRow): number {
  if (typeof obj.properties?.elevation_ft === 'number') return obj.properties.elevation_ft
  return getDefaultElevation(obj.object_type)
}

type V3 = [number, number, number]

// Dense scenes drop the micro-detail (guy lines, stakes, seams) so draw calls
// stay bounded on big camps and low-end GPUs.
const HighDetailContext = createContext(true)
const useHighDetail = () => useContext(HighDetailContext)

// ─── Shared procedural textures ────────────────────────────────
// Everything below is generated once in the browser on first 3D open. No image
// downloads, no added bundle weight — surface detail is effectively free at
// load time and the resulting textures are shared by every material.

function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

let _fabricTex: THREE.Texture | null = null
function getFabricTexture(): THREE.Texture | undefined {
  if (typeof document === 'undefined') return undefined
  if (_fabricTex) return _fabricTex
  const S = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(S, S)
  const rnd = makeRng(9137)
  for (let i = 0; i < S * S; i++) {
    const x = i % S
    const y = (i / S) | 0
    // Over-under weave plus fibre noise → micro roughness variation.
    const weave = ((x >> 1) & 1) === ((y >> 1) & 1) ? 14 : -14
    const v = Math.max(0, Math.min(255, 176 + weave + (rnd() - 0.5) * 30))
    const o = i * 4
    img.data[o] = img.data[o + 1] = img.data[o + 2] = v
    img.data[o + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(10, 10)
  _fabricTex = tex
  return tex
}

let _playaTex: THREE.Texture | null = null
function getPlayaTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null
  if (_playaTex) return _playaTex
  const S = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!
  const rnd = makeRng(20260814)

  ctx.fillStyle = '#e0cfa6'
  ctx.fillRect(0, 0, S, S)

  // Draw every feature nine times (3×3 offsets) so the tile repeats seamlessly.
  const tiled = (draw: () => void) => {
    for (let ox = -S; ox <= S; ox += S) {
      for (let oy = -S; oy <= S; oy += S) {
        ctx.save()
        ctx.translate(ox, oy)
        draw()
        ctx.restore()
      }
    }
  }

  // Tonal mottling — compacted vs. loose dust. Kept faint: the playa is a pale
  // flat sheet, and heavy blotching reads as clouds painted on the ground.
  for (let i = 0; i < 70; i++) {
    const x = rnd() * S
    const y = rnd() * S
    const r = 60 + rnd() * 150
    const light = rnd() > 0.5
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, light ? 'rgba(255,247,225,0.11)' : 'rgba(148,126,90,0.09)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    tiled(() => {
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  // Cracked-playa polygon network: link each seed to its nearest neighbours.
  const pts: Array<[number, number]> = []
  for (let i = 0; i < 220; i++) pts.push([rnd() * S, rnd() * S])
  ctx.lineCap = 'round'
  for (const p of pts) {
    const near = pts
      .filter(q => q !== p)
      .map(q => ({ q, d: Math.hypot(q[0] - p[0], q[1] - p[1]) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
    for (const { q, d } of near) {
      if (d > S * 0.11) continue
      const cx = (p[0] + q[0]) / 2 + (rnd() - 0.5) * 16
      const cy = (p[1] + q[1]) / 2 + (rnd() - 0.5) * 16
      tiled(() => {
        ctx.strokeStyle = 'rgba(116,96,66,0.34)'
        ctx.lineWidth = 2.2
        ctx.beginPath()
        ctx.moveTo(p[0], p[1])
        ctx.quadraticCurveTo(cx, cy, q[0], q[1])
        ctx.stroke()
        // Sun-lit lip on one side of the crack gives it depth.
        ctx.strokeStyle = 'rgba(255,250,236,0.20)'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(p[0] + 2.4, p[1] + 2.4)
        ctx.quadraticCurveTo(cx + 2.4, cy + 2.4, q[0] + 2.4, q[1] + 2.4)
        ctx.stroke()
      })
    }
  }

  // Fine grit.
  const img = ctx.getImageData(0, 0, S, S)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 20
    d[i] = Math.max(0, Math.min(255, d[i] + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  _playaTex = tex
  return tex
}

// Bike and vehicle ruts. Deliberately *not* tiled — ruts drawn into the
// repeating playa tile turn into an obvious lattice — so this is one
// single-use decal laid over the camp, faded out at its own edges.
let _trackTex: THREE.Texture | null = null
function getTrackTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null
  if (_trackTex) return _trackTex
  const S = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!
  const rnd = makeRng(31771)

  ctx.lineCap = 'round'
  const stroke = (pts: number[], w: number, a: number) => {
    ctx.strokeStyle = `rgba(243,235,213,${a})`
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(pts[0], pts[1])
    ctx.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7])
    ctx.stroke()
  }

  for (let i = 0; i < 10; i++) {
    // Enter and leave through different edges so nothing dead-ends mid-frame.
    const edge = (rnd() * 4) | 0
    const t0 = rnd() * S
    const t1 = rnd() * S
    const a: [number, number] = edge === 0 ? [t0, 0] : edge === 1 ? [S, t0] : edge === 2 ? [t0, S] : [0, t0]
    const b: [number, number] = edge === 0 ? [t1, S] : edge === 1 ? [0, t1] : edge === 2 ? [t1, 0] : [S, t1]
    const c1: [number, number] = [a[0] + (rnd() - 0.5) * S * 0.8, a[1] + (rnd() - 0.5) * S * 0.8]
    const c2: [number, number] = [b[0] + (rnd() - 0.5) * S * 0.8, b[1] + (rnd() - 0.5) * S * 0.8]
    const path = [a[0], a[1], c1[0], c1[1], c2[0], c2[1], b[0], b[1]]
    stroke(path, 15, 0.06)
    stroke(path, 5, 0.11)
    if (rnd() > 0.55) {
      // Second rut, one axle width over.
      const off = 14 + rnd() * 10
      stroke(path.map((v, k) => (k % 2 === 0 ? v + off : v - off)), 5, 0.1)
    }
  }

  // Feather the decal so its square boundary never shows on the playa.
  ctx.globalCompositeOperation = 'destination-out'
  const fade = ctx.createRadialGradient(S / 2, S / 2, S * 0.28, S / 2, S / 2, S * 0.5)
  fade.addColorStop(0, 'rgba(0,0,0,0)')
  fade.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = fade
  ctx.fillRect(0, 0, S, S)
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  _trackTex = tex
  return tex
}

// Equirectangular sky, used both as the IBL source — this is what stops metal,
// mylar and fabric from shading flat/blocky — and as the visible dome. `dim`
// scales its energy so the image-based ambient doesn't wash out the direct sun.
// Sun azimuth here matches the directional light so highlights and cast shadows
// agree with where the sun visibly sits.
const SUN_U = 0.59
const SUN_V = 0.2

// Same angle the sun is painted at, so highlights and cast shadows line up with
// the visible sun instead of contradicting it.
const SUN_DIR = new THREE.Vector3(
  -Math.cos(SUN_U * Math.PI * 2) * Math.sin(SUN_V * Math.PI),
  Math.cos(SUN_V * Math.PI),
  Math.sin(SUN_U * Math.PI * 2) * Math.sin(SUN_V * Math.PI)
).normalize()

function makeSkyTexture(dim: number, W = 256, H = 128): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0.0, '#2f6fb0')
  grad.addColorStop(0.3, '#6ba3d6')
  grad.addColorStop(0.47, '#cfe2ee')
  grad.addColorStop(0.5, '#efe3c6')
  grad.addColorStop(0.56, '#ddc99c')
  grad.addColorStop(1.0, '#b09b6f')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Thin high cirrus — breaks up the banded gradient and shows up faintly in
  // the reflections of anything shiny.
  const rnd = makeRng(51224)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 26; i++) {
    const cy = H * (0.06 + rnd() * 0.3)
    const cx = rnd() * W
    const rx = W * (0.05 + rnd() * 0.13)
    const ry = H * (0.006 + rnd() * 0.018)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx)
    g.addColorStop(0, `rgba(255,255,255,${0.10 + rnd() * 0.14})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, ry / rx)
    ctx.beginPath()
    ctx.arc(0, 0, rx, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()

  const sx = W * SUN_U
  const sy = H * SUN_V
  const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.55)
  sun.addColorStop(0, 'rgba(255,253,240,1)')
  sun.addColorStop(0.12, 'rgba(255,240,205,0.8)')
  sun.addColorStop(1, 'rgba(255,232,190,0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, W, H)

  // Dust suspended near the deck — the horizon is never a clean line out there.
  const haze = ctx.createLinearGradient(0, H * 0.4, 0, H * 0.56)
  haze.addColorStop(0, 'rgba(226,213,180,0)')
  haze.addColorStop(1, 'rgba(226,213,180,0.6)')
  ctx.fillStyle = haze
  ctx.fillRect(0, H * 0.4, W, H * 0.17)

  if (dim < 1) {
    ctx.fillStyle = `rgba(0,0,0,${1 - dim})`
    ctx.fillRect(0, 0, W, H)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Full-brightness sky for the visible dome (the IBL copy is dimmed, so the two
// can't be shared).
let _skyDomeTex: THREE.Texture | null = null
function getSkyDomeTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null
  if (!_skyDomeTex) _skyDomeTex = makeSkyTexture(1, 1024, 512)
  return _skyDomeTex
}

// Two silhouetted ranges on a seamless strip. Frequencies are whole numbers so
// the ridge line wraps without a seam, and the bases fade into the dust so the
// mountains sit *in* the haze rather than being pasted on top of it.
let _mountainTex: THREE.Texture | null = null
function getMountainTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null
  if (_mountainTex) return _mountainTex
  const W = 2048
  const H = 256
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const rnd = makeRng(80416)

  const ranges = [
    { base: 0.15, amp: 0.34, freqs: [2, 4, 7, 13, 23], top: 'rgba(139,149,171,0.78)', bot: 'rgba(200,192,172,0.10)' },
    { base: 0.09, amp: 0.44, freqs: [1, 3, 5, 11, 19], top: 'rgba(104,112,133,0.92)', bot: 'rgba(192,182,160,0.14)' },
  ]

  for (const r of ranges) {
    const phases = r.freqs.map(() => rnd() * Math.PI * 2)
    const amps = r.freqs.map((_, i) => (r.amp * Math.pow(0.56, i)) / 1.5)
    ctx.beginPath()
    ctx.moveTo(0, H)
    for (let x = 0; x <= W; x++) {
      const u = x / W
      let h = r.base
      for (let i = 0; i < r.freqs.length; i++) {
        // 1 − |sin| gives cusped summits instead of rolling dunes. Whole-number
        // frequencies keep the strip seamless where it wraps.
        h += amps[i] * (1 - Math.abs(Math.sin(Math.PI * r.freqs[i] * u + phases[i])))
      }
      ctx.lineTo(x, H * (1 - h))
    }
    ctx.lineTo(W, H)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, H * (1 - (r.base + r.amp)), 0, H)
    g.addColorStop(0, r.top)
    g.addColorStop(1, r.bot)
    ctx.fillStyle = g
    ctx.fill()
  }

  // Dust bank washing over the foot of the range.
  const dust = ctx.createLinearGradient(0, H * 0.74, 0, H)
  dust.addColorStop(0, 'rgba(228,215,182,0)')
  dust.addColorStop(1, 'rgba(228,215,182,0.6)')
  ctx.fillStyle = dust
  ctx.fillRect(0, H * 0.74, W, H * 0.26)

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  _mountainTex = tex
  return tex
}

// ─── Horizon: sky dome + distant ranges ────────────────────────
// Two extra draw calls, no textures fetched over the network. Both opt out of
// fog and tone mapping so the backdrop stays exactly as authored while the
// scene in front of it keeps its filmic response.
function Horizon({ radius }: { radius: number }) {
  const sky = useMemo(() => getSkyDomeTexture(), [])
  const mountains = useMemo(() => getMountainTexture(), [])
  const ridgeR = radius / 2.4
  const ridgeH = ridgeR * 0.17

  return (
    <group renderOrder={-1}>
      <mesh frustumCulled={false}>
        <sphereGeometry args={[radius, 48, 24]} />
        <meshBasicMaterial
          map={sky ?? undefined}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>

      {mountains && (
        <mesh position={[0, ridgeH / 2 - ridgeR * 0.004, 0]}>
          <cylinderGeometry args={[ridgeR, ridgeR, ridgeH, 128, 1, true]} />
          <meshBasicMaterial
            map={mountains}
            side={THREE.BackSide}
            transparent
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  )
}

// Pre-filters the procedural sky into an environment map once per mount.
function SceneEnvironment({ intensity = 0.55 }: { intensity?: number }) {
  const gl = useThree(s => s.gl)

  const target = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const src = makeSkyTexture(intensity)
    const rt = pmrem.fromEquirectangular(src)
    src.dispose()
    pmrem.dispose()
    return rt
  }, [gl, intensity])

  useEffect(() => () => { target.dispose() }, [target])

  return <primitive attach="environment" object={target.texture} />
}

// ─── Fabric / mylar materials ──────────────────────────────────
function FabricMaterial({
  color,
  roughness = 1,
  metalness = 0,
  envMapIntensity = 0.35,
  bumpScale = 0.02,
  side,
  flatShading = false,
  transparent,
  opacity,
}: {
  color: THREE.Color | string
  roughness?: number
  metalness?: number
  envMapIntensity?: number
  bumpScale?: number
  side?: THREE.Side
  flatShading?: boolean
  transparent?: boolean
  opacity?: number
}) {
  const tex = getFabricTexture()
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      envMapIntensity={envMapIntensity}
      roughnessMap={tex}
      bumpMap={tex}
      bumpScale={bumpScale}
      side={side}
      flatShading={flatShading}
      transparent={transparent}
      opacity={opacity}
    />
  )
}

// ─── Geometry helpers: watertight, sagging fabric surfaces ─────
function buildIndexedGeometry(tris: V3[][]): THREE.BufferGeometry {
  const lookup = new Map<string, number>()
  const positions: number[] = []
  const indices: number[] = []
  const idx = (p: V3) => {
    const key = `${p[0].toFixed(4)},${p[1].toFixed(4)},${p[2].toFixed(4)}`
    let i = lookup.get(key)
    if (i === undefined) {
      i = positions.length / 3
      lookup.set(key, i)
      positions.push(p[0], p[1], p[2])
    }
    return i
  }
  for (const t of tris) indices.push(idx(t[0]), idx(t[1]), idx(t[2]))
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// One subdivision pass that dips the new midpoints — turns rigid triangles into
// slack fabric spanning between poles.
function sagSubdivide(tris: V3[][], sag: number): V3[][] {
  const out: V3[][] = []
  const mid = (p: V3, q: V3): V3 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - sag, (p[2] + q[2]) / 2]
  for (const [a, b, c] of tris) {
    const ab = mid(a, b)
    const bc = mid(b, c)
    const ca = mid(c, a)
    out.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca])
  }
  return out
}

// ─── Guy lines + stakes ────────────────────────────────────────
const GUY_GEO = new THREE.CylinderGeometry(1, 1, 1, 3, 1, true)
const STAKE_GEO = new THREE.CylinderGeometry(1, 0.5, 1, 5)
const GUY_MAT = new THREE.MeshStandardMaterial({ color: '#efe7d2', roughness: 0.85, metalness: 0 })
const STAKE_MAT = new THREE.MeshStandardMaterial({ color: '#8f959b', roughness: 0.55, metalness: 0.6 })
const UP = new THREE.Vector3(0, 1, 0)

function GuyLines({
  widthM,
  depthM,
  anchorY,
  spread = 0.32,
}: {
  widthM: number
  depthM: number
  anchorY: number
  spread?: number
}) {
  const highDetail = useHighDetail()

  const lines = useMemo(() => {
    const hw = widthM / 2
    const hd = depthM / 2
    const corners: V3[] = [
      [hw, anchorY, hd],
      [-hw, anchorY, hd],
      [-hw, anchorY, -hd],
      [hw, anchorY, -hd],
    ]
    return corners.map(c => {
      const stakeX = c[0] + Math.sign(c[0]) * widthM * spread
      const stakeZ = c[2] + Math.sign(c[2]) * depthM * spread
      const v = new THREE.Vector3(stakeX - c[0], -anchorY, stakeZ - c[2])
      const len = v.length()
      const quat = new THREE.Quaternion().setFromUnitVectors(UP, v.clone().normalize())
      return {
        mid: [(c[0] + stakeX) / 2, anchorY / 2, (c[2] + stakeZ) / 2] as V3,
        stake: [stakeX, 0.04, stakeZ] as V3,
        quat,
        len,
      }
    })
  }, [widthM, depthM, anchorY, spread])

  if (!highDetail) return null
  const cordR = Math.max(0.006, Math.min(widthM, depthM) * 0.008)
  const stakeR = cordR * 2.2

  return (
    <group>
      {lines.map((l, i) => (
        <React.Fragment key={i}>
          <mesh
            geometry={GUY_GEO}
            material={GUY_MAT}
            position={l.mid}
            quaternion={l.quat}
            scale={[cordR, l.len, cordR]}
          />
          <mesh
            geometry={STAKE_GEO}
            material={STAKE_MAT}
            position={l.stake}
            scale={[stakeR, 0.12, stakeR]}
          />
        </React.Fragment>
      ))}
    </group>
  )
}

// Reinforced webbing hem where the fabric meets the ground.
function TentHem({ widthM, depthM, color }: { widthM: number; depthM: number; color: THREE.Color }) {
  const h = Math.min(widthM, depthM) * 0.045
  return (
    <mesh position={[0, h / 2, 0]}>
      <boxGeometry args={[widthM * 1.015, h, depthM * 1.015]} />
      <meshStandardMaterial color={color} roughness={0.95} metalness={0} envMapIntensity={0.25} />
    </mesh>
  )
}

// ─── GLB Model Loader ──────────────────────────────────────────
function GLBModel({ url, scale, position }: { url: string; scale: [number, number, number]; position: [number, number, number] }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(), [scene])

  return (
    <primitive
      object={cloned}
      scale={scale}
      position={position}
      castShadow
      receiveShadow
    />
  )
}

// ─── Corrugated wall geometry helper ──────────────────────────
function useCorrugatedGeometry(w: number, h: number, ridges: number, depth: number) {
  const geo = useMemo(() => {
    const segs = ridges * 4
    const g = new THREE.PlaneGeometry(w, h, segs, 1)
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      pos.setZ(i, Math.sin((x / w) * ridges * Math.PI * 2) * depth)
    }
    g.computeVertexNormals()
    return g
  }, [w, h, ridges, depth])

  // Dispose the previous geometry when params change or on unmount (prevents VRAM leak)
  useEffect(() => {
    return () => { geo.dispose() }
  }, [geo])

  return geo
}

// ─── Wheel helper ──────────────────────────────────────────────
function Wheel({ position, radius }: { position: [number, number, number]; radius: number }) {
  return (
    <group position={position}>
      {/* Tire */}
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[radius, radius * 0.35, 8, 16]} />
        <meshStandardMaterial color="#222222" roughness={0.9} />
      </mesh>
      {/* Hubcap */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[radius * 0.55, 12]} />
        <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── RV / Camper (Class C motorhome) ────────────────────────
function RV3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const windowColor = '#bcd9e8'

  // Build the motorhome with its LENGTH along local X, then rotate the whole
  // group so the length runs along whichever footprint axis is longer. This
  // keeps proportions correct (long & boxy) regardless of how the object was
  // placed, instead of rendering a stubby barrel.
  const lengthAlongZ = depthM >= widthM
  const L = Math.max(widthM, depthM) // vehicle length
  const W = Math.min(widthM, depthM) // vehicle width
  const H = heightM

  const wheelR = Math.min(H * 0.16, W * 0.24)
  const bodyBottom = wheelR * 1.05
  const bodyTop = H
  const bodyCH = bodyTop - bodyBottom // living box height
  const cabTopY = bodyBottom + bodyCH * 0.58
  const cabCH = cabTopY - bodyBottom

  const boxLen = L * 0.7
  const cabLen = L * 0.3
  const boxFrontX = L / 2 - cabLen // x where cab meets living box
  const accent = threeColor.clone().multiplyScalar(0.55)

  // Evenly spaced living-area side windows
  const winCount = Math.max(2, Math.round(boxLen / (W * 0.7)))
  const winW = boxLen / (winCount + 1) * 0.7
  const winH = bodyCH * 0.34

  const content = (
    <group>
      {/* Dark chassis / underbody */}
      <mesh castShadow receiveShadow position={[-L * 0.04, bodyBottom * 0.5, 0]}>
        <boxGeometry args={[L * 0.95, bodyBottom, W * 0.82]} />
        <meshStandardMaterial color="#262626" roughness={0.85} metalness={0.2} />
      </mesh>

      {/* Living box body */}
      <mesh castShadow receiveShadow position={[-L / 2 + boxLen / 2, bodyBottom + bodyCH / 2, 0]}>
        <boxGeometry args={[boxLen, bodyCH, W]} />
        <meshStandardMaterial color={threeColor} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Accent stripes along both living-box sides */}
      {[1, -1].map(s => (
        <mesh key={`stripe-${s}`} position={[-L / 2 + boxLen / 2, bodyBottom + bodyCH * 0.32, s * (W / 2 + 0.004)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[boxLen * 0.95, bodyCH * 0.12]} />
          <meshStandardMaterial color={accent} roughness={0.5} metalness={0.2} />
        </mesh>
      ))}
      {/* Living-area side windows (both sides) */}
      {Array.from({ length: winCount }, (_, i) => {
        const x = -L / 2 + (boxLen / (winCount + 1)) * (i + 1)
        return [1, -1].map(s => (
          <mesh key={`win-${i}-${s}`} position={[x, bodyBottom + bodyCH * 0.62, s * (W / 2 + 0.005)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
            <planeGeometry args={[winW, winH]} />
            <meshStandardMaterial color={windowColor} metalness={0.3} roughness={0.1} transparent opacity={0.75} />
          </mesh>
        ))
      })}
      {/* Entry door on +Z side, near the cab end */}
      <mesh position={[boxFrontX - boxLen * 0.16, bodyBottom + bodyCH * 0.42, W / 2 + 0.006]}>
        <planeGeometry args={[W * 0.42, bodyCH * 0.74]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.7)} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[boxFrontX - boxLen * 0.16, bodyBottom + bodyCH * 0.55, W / 2 + 0.008]}>
        <planeGeometry args={[W * 0.2, bodyCH * 0.22]} />
        <meshStandardMaterial color={windowColor} metalness={0.3} roughness={0.1} transparent opacity={0.7} />
      </mesh>

      {/* Truck cab (front, lower) */}
      <mesh castShadow receiveShadow position={[L / 2 - cabLen / 2, bodyBottom + cabCH / 2, 0]}>
        <boxGeometry args={[cabLen, cabCH, W * 0.97]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.92)} roughness={0.45} metalness={0.25} />
      </mesh>
      {/* Over-cab bunk (Class C signature overhang) */}
      <mesh castShadow receiveShadow position={[boxFrontX + cabLen * 0.42, cabTopY + (bodyTop - cabTopY) / 2, 0]}>
        <boxGeometry args={[cabLen * 0.82, bodyTop - cabTopY, W]} />
        <meshStandardMaterial color={threeColor} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Over-cab bunk window */}
      <mesh position={[boxFrontX + cabLen * 0.42, cabTopY + (bodyTop - cabTopY) * 0.55, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[W * 0.5, (bodyTop - cabTopY) * 0.5]} />
        <meshStandardMaterial color={windowColor} metalness={0.3} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      {/* Windshield */}
      <mesh position={[L / 2 + 0.006, bodyBottom + cabCH * 0.62, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[W * 0.82, cabCH * 0.5]} />
        <meshStandardMaterial color={windowColor} metalness={0.4} roughness={0.05} transparent opacity={0.55} />
      </mesh>
      {/* Cab side windows */}
      {[1, -1].map(s => (
        <mesh key={`cabwin-${s}`} position={[L / 2 - cabLen * 0.4, bodyBottom + cabCH * 0.62, s * (W * 0.485 + 0.005)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[cabLen * 0.5, cabCH * 0.4]} />
          <meshStandardMaterial color={windowColor} metalness={0.4} roughness={0.05} transparent opacity={0.55} />
        </mesh>
      ))}
      {/* Front bumper */}
      <mesh castShadow position={[L / 2 - 0.02, bodyBottom * 0.6, 0]}>
        <boxGeometry args={[0.06, bodyBottom * 0.6, W * 0.9]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Headlights */}
      {[1, -1].map(s => (
        <mesh key={`hl-${s}`} position={[L / 2 + 0.006, bodyBottom + cabCH * 0.2, s * W * 0.32]}>
          <circleGeometry args={[cabCH * 0.1, 12]} />
          <meshStandardMaterial color="#ffffcc" emissive="#ffffaa" emissiveIntensity={0.35} />
        </mesh>
      ))}

      {/* Roof cap (slightly inset, lighter) */}
      <mesh castShadow position={[-L / 2 + boxLen / 2, bodyTop + 0.01, 0]}>
        <boxGeometry args={[boxLen * 0.98, 0.02, W * 0.98]} />
        <meshStandardMaterial color={threeColor.clone().lerp(new THREE.Color('#ffffff'), 0.2)} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Rooftop AC unit */}
      <mesh castShadow position={[-L / 2 + boxLen * 0.32, bodyTop + 0.08, 0]}>
        <boxGeometry args={[W * 0.55, 0.13, W * 0.45]} />
        <meshStandardMaterial color="#ececec" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Roof vent */}
      <mesh castShadow position={[-L / 2 + boxLen * 0.7, bodyTop + 0.05, 0]}>
        <boxGeometry args={[W * 0.3, 0.07, W * 0.3]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
      </mesh>

      {/* Pull-out awning on +Z side */}
      <mesh castShadow position={[-L / 2 + boxLen * 0.5, bodyTop * 0.86, W / 2 + W * 0.34]} rotation={[Math.PI / 2.5, 0, 0]}>
        <planeGeometry args={[boxLen * 0.62, W * 0.68]} />
        <meshStandardMaterial color="#e2ddd0" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {[-boxLen * 0.28, boxLen * 0.28].map((sx, i) => (
        <mesh key={`awn-${i}`} position={[-L / 2 + boxLen * 0.5 + sx, bodyTop * 0.45, W / 2 + W * 0.32]}>
          <cylinderGeometry args={[0.012, 0.012, bodyTop * 0.86, 6]} />
          <meshStandardMaterial color="#bbbbbb" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* Rear ladder */}
      {[-W * 0.18, W * 0.18].map((sz, i) => (
        <mesh key={`lad-${i}`} position={[-L / 2 - 0.012, bodyBottom + bodyCH * 0.5, sz]}>
          <cylinderGeometry args={[0.01, 0.01, bodyCH * 0.9, 6]} />
          <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <mesh key={`rung-${i}`} position={[-L / 2 - 0.012, bodyBottom + bodyCH * f, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, W * 0.36, 6]} />
          <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* Wheels — front axle (under cab) + rear axle (under living box) */}
      <Wheel position={[L / 2 - cabLen * 0.55, wheelR, W / 2 + 0.01]} radius={wheelR} />
      <Wheel position={[L / 2 - cabLen * 0.55, wheelR, -W / 2 - 0.01]} radius={wheelR} />
      <Wheel position={[-L / 2 + boxLen * 0.22, wheelR, W / 2 + 0.01]} radius={wheelR} />
      <Wheel position={[-L / 2 + boxLen * 0.22, wheelR, -W / 2 - 0.01]} radius={wheelR} />
    </group>
  )

  return lengthAlongZ ? <group rotation={[0, Math.PI / 2, 0]}>{content}</group> : content
}

// ─── Vehicle (Car) ──────────────────────────────────────────
function Vehicle3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const wheelR = Math.min(depthM * 0.11, heightM * 0.15)
  const bodyH = heightM * 0.5
  const cabinH = heightM * 0.45

  return (
    <group>
      {/* Lower body */}
      <mesh castShadow receiveShadow position={[0, bodyH / 2, 0]}>
        <boxGeometry args={[widthM, bodyH, depthM]} />
        <meshStandardMaterial color={threeColor} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Cabin / greenhouse */}
      <mesh castShadow receiveShadow position={[0, bodyH + cabinH / 2, 0]}>
        <boxGeometry args={[widthM * 0.65, cabinH, depthM * 0.85]} />
        <meshStandardMaterial color="#87CEEB" metalness={0.4} roughness={0.1} transparent opacity={0.55} />
      </mesh>
      {/* Hood */}
      <mesh castShadow position={[widthM * 0.35, bodyH * 0.85, 0]}>
        <boxGeometry args={[widthM * 0.3, bodyH * 0.15, depthM * 0.95]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.9)} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Trunk */}
      <mesh castShadow position={[-widthM * 0.35, bodyH * 0.8, 0]}>
        <boxGeometry args={[widthM * 0.25, bodyH * 0.1, depthM * 0.9]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.9)} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Wheels */}
      <Wheel position={[widthM * 0.3, wheelR, depthM / 2 + 0.005]} radius={wheelR} />
      <Wheel position={[widthM * 0.3, wheelR, -depthM / 2 - 0.005]} radius={wheelR} />
      <Wheel position={[-widthM * 0.3, wheelR, depthM / 2 + 0.005]} radius={wheelR} />
      <Wheel position={[-widthM * 0.3, wheelR, -depthM / 2 - 0.005]} radius={wheelR} />
      {/* Headlights */}
      <mesh position={[widthM / 2 + 0.004, bodyH * 0.65, depthM * 0.3]}>
        <circleGeometry args={[bodyH * 0.12, 10]} />
        <meshStandardMaterial color="#ffffcc" emissive="#ffffaa" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[widthM / 2 + 0.004, bodyH * 0.65, -depthM * 0.3]}>
        <circleGeometry args={[bodyH * 0.12, 10]} />
        <meshStandardMaterial color="#ffffcc" emissive="#ffffaa" emissiveIntensity={0.3} />
      </mesh>
      {/* Tail lights */}
      <mesh position={[-widthM / 2 - 0.004, bodyH * 0.6, depthM * 0.3]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[bodyH * 0.08, 10]} />
        <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[-widthM / 2 - 0.004, bodyH * 0.6, -depthM * 0.3]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[bodyH * 0.08, 10]} />
        <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}

// ─── Shipping Container (PC Container) ──────────────────────
function Container3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const ridges = Math.max(4, Math.round(widthM / 0.15))
  // Corrugated side panels
  const sideGeo = useCorrugatedGeometry(widthM * 0.95, heightM * 0.95, ridges, 0.012)
  const endGeo = useCorrugatedGeometry(depthM * 0.95, heightM * 0.95, Math.max(3, Math.round(depthM / 0.15)), 0.012)

  return (
    <group>
      {/* Floor */}
      <mesh receiveShadow position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthM, depthM]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.5)} roughness={0.9} />
      </mesh>
      {/* Corrugated side walls */}
      <mesh castShadow receiveShadow geometry={sideGeo} position={[0, heightM / 2, depthM / 2]} >
        <meshStandardMaterial color={threeColor} roughness={0.7} metalness={0.35} />
      </mesh>
      <mesh castShadow receiveShadow geometry={sideGeo} position={[0, heightM / 2, -depthM / 2]} rotation={[0, Math.PI, 0]}>
        <meshStandardMaterial color={threeColor} roughness={0.7} metalness={0.35} />
      </mesh>
      {/* Corrugated end walls */}
      <mesh castShadow geometry={endGeo} position={[-widthM / 2, heightM / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.85)} roughness={0.7} metalness={0.35} />
      </mesh>
      {/* Door end with locking bars */}
      <mesh castShadow geometry={endGeo} position={[widthM / 2, heightM / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.85)} roughness={0.7} metalness={0.35} />
      </mesh>
      {/* Door locking bars */}
      <mesh position={[widthM / 2 + 0.008, heightM / 2, depthM * 0.15]}>
        <cylinderGeometry args={[0.008, 0.008, heightM * 0.7, 6]} />
        <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[widthM / 2 + 0.008, heightM / 2, -depthM * 0.15]}>
        <cylinderGeometry args={[0.008, 0.008, heightM * 0.7, 6]} />
        <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Door locking handles */}
      <mesh position={[widthM / 2 + 0.015, heightM * 0.5, depthM * 0.15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.005, 0.005, 0.04, 6]} />
        <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[widthM / 2 + 0.015, heightM * 0.5, -depthM * 0.15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.005, 0.005, 0.04, 6]} />
        <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Roof */}
      <mesh castShadow receiveShadow position={[0, heightM, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthM, depthM]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.8)} roughness={0.8} metalness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Corner posts (steel beams) */}
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz], i) => (
        <mesh key={i} castShadow position={[sx * widthM * 0.49, heightM / 2, sz * depthM * 0.49]}>
          <boxGeometry args={[0.025, heightM, 0.025]} />
          <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      {/* Top rail beams */}
      <mesh position={[0, heightM, depthM * 0.49]}>
        <boxGeometry args={[widthM, 0.02, 0.02]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, heightM, -depthM * 0.49]}>
        <boxGeometry args={[widthM, 0.02, 0.02]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Bottom rail beams */}
      <mesh position={[0, 0.01, depthM * 0.49]}>
        <boxGeometry args={[widthM, 0.02, 0.02]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.01, -depthM * 0.49]}>
        <boxGeometry args={[widthM, 0.02, 0.02]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── Tent brand classification ──────────────────────────────
// Maps a camper's free-text make/model (or a pasted product URL) to a
// distinctive tent silhouette. Keeps geometry light — one style per look.
type TentStyle = 'shiftpod' | 'nobake' | 'canvas' | 'cabin' | 'dome'

function classifyTentStyle(makeModel: string | null | undefined): TentStyle {
  const s = (makeModel || '').toLowerCase()
  if (/shift\s*pod/.test(s)) return 'shiftpod'
  if (/no\s*bake|nobaketent/.test(s)) return 'nobake'
  if (/kodiak|flex.?bow|canvas|wall\s*tent/.test(s)) return 'canvas'
  if (/cabin|skylodge|kingdom|instant|stand\s*up|standup|lodge/.test(s)) return 'cabin'
  if (/dome|sundome|pop.?up/.test(s)) return 'dome'
  // Unknown / blank → classic camping dome (door + window, reads as a tent)
  return 'dome'
}

// ─── Shared tent geometry helpers ───────────────────────────
// 4-sided hip roof spanning an exact w×d footprint up to a central apex.
// Subdivided once with a downward dip so the panels read as slack fabric
// stretched over a frame rather than four hard planes.
function useHipRoofGeometry(w: number, d: number, h: number) {
  const geo = useMemo(() => {
    const hw = w / 2, hd = d / 2
    const apex: V3 = [0, h, 0]
    const c: V3[] = [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd]]
    const base: V3[][] = [
      [c[0], c[1], apex],
      [c[1], c[2], apex],
      [c[2], c[3], apex],
      [c[3], c[0], apex],
    ]
    return buildIndexedGeometry(sagSubdivide(base, h * 0.055))
  }, [w, d, h])
  useEffect(() => () => { geo.dispose() }, [geo])
  return geo
}

// Gable / ridge roof: two slopes facing ±x with closed gable ends on ±z.
function useRidgeRoofGeometry(w: number, d: number, h: number) {
  const geo = useMemo(() => {
    const hw = w / 2, hd = d / 2
    const rf: V3 = [0, h, hd]
    const rb: V3 = [0, h, -hd]
    const lf: V3 = [-hw, 0, hd]
    const lb: V3 = [-hw, 0, -hd]
    const rff: V3 = [hw, 0, hd]
    const rbb: V3 = [hw, 0, -hd]
    const base: V3[][] = [
      // left slope
      [lb, lf, rf], [lb, rf, rb],
      // right slope
      [rbb, rf, rff], [rbb, rb, rf],
      // gable ends
      [lf, rff, rf], [rbb, lb, rb],
    ]
    return buildIndexedGeometry(sagSubdivide(base, h * 0.05))
  }, [w, d, h])
  useEffect(() => () => { geo.dispose() }, [geo])
  return geo
}

// Slack canopy for open shade structures — a grid that dips between its posts.
function useCanopyGeometry(w: number, d: number, sag: number, cols = 3, rows = 3) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, d, cols * 4, rows * 4)
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      // Local bay coordinates → one sine hump per bay between posts.
      const u = (pos.getX(i) / w + 0.5) * cols
      const v = (pos.getY(i) / d + 0.5) * rows
      const dip = Math.sin(Math.PI * (u % 1)) * Math.sin(Math.PI * (v % 1))
      pos.setZ(i, -dip * sag)
    }
    g.computeVertexNormals()
    return g
  }, [w, d, sag, cols, rows])
  useEffect(() => () => { geo.dispose() }, [geo])
  return geo
}

// ─── Reusable tent door (fabric doorway flap on a tent face) ──
function TentDoor({ width, height, faceDepth, back = false, arch = true, frameColor }: { width: number; height: number; faceDepth: number; back?: boolean; arch?: boolean; frameColor?: THREE.Color }) {
  const z = back ? -faceDepth : faceDepth
  const highDetail = useHighDetail()
  // The door is a genuinely recessed cavity framed by proud storm flaps, so it
  // catches its own shadow instead of reading as a decal on a flat wall.
  const surround = frameColor ?? new THREE.Color('#43474b')
  const inset = Math.min(width, height) * 0.09
  return (
    <group position={[0, 0, z]} rotation={[0, back ? Math.PI : 0, 0]}>
      {/* Storm-flap surround, slightly proud of the wall */}
      <mesh castShadow position={[0, height * 0.54, 0.006]}>
        <boxGeometry args={[width * 1.22, height * 1.14, 0.012]} />
        <FabricMaterial color={surround} roughness={0.95} envMapIntensity={0.25} />
      </mesh>
      {/* Recessed cavity — interior shading comes from real depth */}
      <mesh position={[0, height / 2, 0.006 - inset / 2]}>
        <boxGeometry args={[width, height, inset]} />
        <meshStandardMaterial color="#2b2e32" roughness={1} metalness={0} envMapIntensity={0.1} side={THREE.BackSide} />
      </mesh>
      {arch && (
        <mesh position={[0, height, 0.008]}>
          <circleGeometry args={[width / 2, 16, 0, Math.PI]} />
          <meshStandardMaterial color="#2b2e32" roughness={1} envMapIntensity={0.1} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Zipper seam */}
      <mesh position={[0, height / 2, 0.013]}>
        <boxGeometry args={[0.012, height * 0.94, 0.005]} />
        <meshStandardMaterial color="#d8b53a" metalness={0.7} roughness={0.3} />
      </mesh>
      {highDetail && (
        <>
          {/* Rolled-back door flap toggled above the opening */}
          <mesh castShadow position={[0, height * 1.02, 0.02]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[height * 0.07, height * 0.07, width * 0.92, 8]} />
            <FabricMaterial color={surround.clone().multiplyScalar(1.08)} roughness={0.95} envMapIntensity={0.25} />
          </mesh>
          {[-0.3, 0.3].map((f, i) => (
            <mesh key={i} position={[width * f, height * 1.02, 0.03]}>
              <boxGeometry args={[0.012, height * 0.2, 0.006]} />
              <meshStandardMaterial color="#5a5f64" roughness={0.85} />
            </mesh>
          ))}
          {/* Zipper pull */}
          <mesh position={[width * 0.06, height * 0.34, 0.018]}>
            <sphereGeometry args={[Math.max(0.008, width * 0.03), 8, 6]} />
            <meshStandardMaterial color="#c9a52f" metalness={0.75} roughness={0.3} />
          </mesh>
        </>
      )}
    </group>
  )
}

// ─── Reusable tent window (mesh-screen panel) ───────────────
function TentWindow({ position, width, height, rotY = 0 }: { position: [number, number, number]; width: number; height: number; rotY?: number }) {
  const highDetail = useHighDetail()
  const screen = getFabricTexture()
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Binding tape around the opening */}
      <mesh position={[0, 0, 0.002]}>
        <boxGeometry args={[width * 1.09, height * 1.12, 0.005]} />
        <meshStandardMaterial color="#6f757b" roughness={0.9} envMapIntensity={0.25} />
      </mesh>
      {/* Insect screen — the shared fabric weave doubles as the mesh pattern */}
      <mesh position={[0, 0, 0.006]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#16242c"
          transparent
          opacity={0.62}
          roughness={0.5}
          metalness={0.15}
          bumpMap={screen}
          bumpScale={0.01}
          side={THREE.DoubleSide}
        />
      </mesh>
      {highDetail && (
        /* Awning lip that shades the window */
        <mesh castShadow position={[0, height * 0.6, height * 0.13]} rotation={[Math.PI / 2.9, 0, 0]}>
          <planeGeometry args={[width * 1.18, height * 0.4]} />
          <FabricMaterial color="#9aa0a6" side={THREE.DoubleSide} envMapIntensity={0.3} />
        </mesh>
      )}
    </group>
  )
}

// ─── Shiftpod (faceted insulated silver dome) ───────────────
function ShiftpodTent({ widthM, depthM, heightM, color, backDoor }: TentStyleProps) {
  const tc = hexToThreeColor(color)
  const highDetail = useHighDetail()
  // Iconic reflective silver shell — blend hue toward silver but keep enough
  // of the assigned color so builder/camper coding still reads.
  const shell = tc.clone().lerp(new THREE.Color('#d3d7db'), 0.62)
  const fabric = getFabricTexture()
  const r = 0.5
  const baseH = heightM * 0.46
  const domeH = heightM - baseH
  const sx = widthM / (2 * r), sz = depthM / (2 * r)
  const doorW = Math.min(widthM, depthM) * 0.3
  const doorH = baseH * 0.92
  const seamR = Math.min(widthM, depthM) * 0.012
  return (
    <group>
      {/* Octagonal insulated base — tall enough for the doorway */}
      <mesh castShadow receiveShadow position={[0, baseH / 2, 0]} scale={[sx, 1, sz]}>
        <cylinderGeometry args={[r, r, baseH, 8]} />
        <meshStandardMaterial color={shell} roughness={0.34} metalness={0.72} envMapIntensity={1.15} bumpMap={fabric} bumpScale={0.05} flatShading />
      </mesh>
      {/* Faceted blunt dome roof (truncated octagon, not a sharp point) */}
      <mesh castShadow receiveShadow position={[0, baseH, 0]} scale={[sx, 1, sz]}>
        <cylinderGeometry args={[r * 0.22, r, domeH, 8]} />
        <meshStandardMaterial color={shell.clone().multiplyScalar(1.06)} roughness={0.3} metalness={0.75} envMapIntensity={1.25} bumpMap={fabric} bumpScale={0.05} flatShading />
      </mesh>
      {/* Top vent cap */}
      <mesh castShadow position={[0, heightM, 0]} scale={[sx, 1, sz]}>
        <cylinderGeometry args={[r * 0.22, r * 0.24, heightM * 0.06, 8]} />
        <meshStandardMaterial color="#3a3d40" roughness={0.55} metalness={0.5} />
      </mesh>
      {highDetail && (
        <>
          {/* Welded seam ribs down each of the eight panel edges */}
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2 + Math.PI / 8
            return (
              <mesh key={`seam-${i}`} position={[Math.cos(a) * widthM * 0.5, baseH / 2, Math.sin(a) * depthM * 0.5]}>
                <cylinderGeometry args={[seamR, seamR, baseH, 4]} />
                <meshStandardMaterial color={shell.clone().multiplyScalar(0.78)} roughness={0.45} metalness={0.6} />
              </mesh>
            )
          })}
          {/* Vestibule canopy over the entrance */}
          <mesh castShadow position={[0, baseH * 0.95, depthM * 0.62]} rotation={[Math.PI / 2.7, 0, 0]}>
            <planeGeometry args={[doorW * 1.9, depthM * 0.3]} />
            <FabricMaterial color={shell.clone().multiplyScalar(0.95)} metalness={0.4} roughness={0.5} envMapIntensity={0.8} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
      <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 * 0.99} arch frameColor={shell.clone().multiplyScalar(0.82)} />
      {backDoor && <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 * 0.99} back arch frameColor={shell.clone().multiplyScalar(0.82)} />}
      {/* Round porthole window on the base side */}
      <mesh position={[widthM / 2 * 0.99, baseH * 0.62, 0]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[Math.min(widthM, depthM) * 0.07, 16]} />
        <meshStandardMaterial color="#16242c" transparent opacity={0.55} roughness={0.2} metalness={0.3} />
      </mesh>
      <TentHem widthM={widthM * 0.99} depthM={depthM * 0.99} color={shell.clone().multiplyScalar(0.6)} />
      <GuyLines widthM={widthM} depthM={depthM} anchorY={baseH * 0.95} spread={0.26} />
      <GroundSheet widthM={widthM} depthM={depthM} color={tc.clone().multiplyScalar(0.45)} />
    </group>
  )
}

// ─── No Bake Tent (reflective insulated dome on a wall) ─────
function NoBakeTent({ widthM, depthM, heightM, color, backDoor }: TentStyleProps) {
  const tc = hexToThreeColor(color)
  const highDetail = useHighDetail()
  const shell = tc.clone().lerp(new THREE.Color('#eef1f3'), 0.7)
  const fabric = getFabricTexture()
  const r = 0.5
  const wallH = heightM * 0.34
  const domeH = heightM - wallH
  const doorW = Math.min(widthM, depthM) * 0.3
  const doorH = wallH * 0.94
  return (
    <group>
      {/* Insulated vertical wall — gives the doorway a surface to sit on */}
      <mesh castShadow receiveShadow position={[0, wallH / 2, 0]} scale={[widthM / (2 * r), 1, depthM / (2 * r)]}>
        <cylinderGeometry args={[r, r, wallH, 32]} />
        <meshStandardMaterial color={shell} roughness={0.3} metalness={0.6} envMapIntensity={1.1} bumpMap={fabric} bumpScale={0.04} />
      </mesh>
      {/* Reflective domed roof */}
      <mesh castShadow receiveShadow position={[0, wallH, 0]} scale={[widthM, domeH * 2, depthM]}>
        <sphereGeometry args={[r, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={shell.clone().multiplyScalar(1.03)} roughness={0.26} metalness={0.65} envMapIntensity={1.25} bumpMap={fabric} bumpScale={0.04} side={THREE.DoubleSide} />
      </mesh>
      {highDetail && (
        /* Meridian seams where the reflective panels are taped together */
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={`mer-${i}`} position={[0, wallH, 0]} rotation={[0, (i / 6) * Math.PI, 0]} scale={[widthM / (2 * r), domeH / r, 1]}>
              <torusGeometry args={[r, 0.008, 4, 20, Math.PI]} />
              <meshStandardMaterial color={shell.clone().multiplyScalar(0.82)} roughness={0.4} metalness={0.55} />
            </mesh>
          ))}
        </>
      )}
      {/* Roof vent */}
      <mesh castShadow position={[0, heightM * 0.97, 0]}>
        <cylinderGeometry args={[Math.min(widthM, depthM) * 0.07, Math.min(widthM, depthM) * 0.08, heightM * 0.06, 12]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.55} roughness={0.45} />
      </mesh>
      <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 * 0.95} arch frameColor={shell.clone().multiplyScalar(0.85)} />
      {backDoor && <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 * 0.95} back arch frameColor={shell.clone().multiplyScalar(0.85)} />}
      <TentWindow position={[widthM / 2 * 0.95, wallH * 0.6, 0]} width={depthM * 0.24} height={wallH * 0.5} rotY={Math.PI / 2} />
      <TentHem widthM={widthM * 0.97} depthM={depthM * 0.97} color={shell.clone().multiplyScalar(0.62)} />
      <GuyLines widthM={widthM * 0.95} depthM={depthM * 0.95} anchorY={wallH * 0.9} spread={0.3} />
      <GroundSheet widthM={widthM} depthM={depthM} color={tc.clone().multiplyScalar(0.5)} />
    </group>
  )
}

// ─── Canvas wall tent (Kodiak Flex-Bow style) ───────────────
function CanvasTent({ widthM, depthM, heightM, color, backDoor }: TentStyleProps) {
  const tc = hexToThreeColor(color)
  const highDetail = useHighDetail()
  const canvas = tc.clone().lerp(new THREE.Color('#cdbb90'), 0.55)
  const wallH = heightM * 0.5
  const ridgeH = heightM * 0.5
  // Roof overhangs the walls like a real fly, so the eave casts a shadow line.
  const roofGeo = useRidgeRoofGeometry(widthM * 1.09, depthM * 1.05, ridgeH)
  const doorW = Math.min(widthM, depthM) * 0.3
  const doorH = wallH * 0.9
  const cornerR = Math.min(widthM, depthM, wallH) * 0.12
  return (
    <group>
      {/* Canvas walls — rounded corners read as fabric over flex-bow poles */}
      <RoundedBox
        args={[widthM, wallH, depthM]}
        radius={cornerR}
        smoothness={2}
        castShadow
        receiveShadow
        position={[0, wallH / 2, 0]}
      >
        <FabricMaterial color={canvas} roughness={1} envMapIntensity={0.3} />
      </RoundedBox>
      {/* Peaked canvas roof with slack between the ridge and the eaves */}
      <mesh castShadow receiveShadow geometry={roofGeo} position={[0, wallH, 0]}>
        <FabricMaterial color={canvas.clone().multiplyScalar(0.92)} roughness={1} envMapIntensity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Ridge pole running the length of the tent */}
      <mesh castShadow position={[0, wallH + ridgeH, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[Math.min(widthM, depthM) * 0.018, Math.min(widthM, depthM) * 0.018, depthM * 1.08, 6]} />
        <meshStandardMaterial color="#8a6a3a" roughness={0.65} metalness={0.15} />
      </mesh>
      {/* Awning over the front door */}
      <mesh castShadow position={[0, wallH * 0.92, depthM / 2 + depthM * 0.16]} rotation={[Math.PI / 2.6, 0, 0]}>
        <planeGeometry args={[doorW * 1.7, depthM * 0.38]} />
        <FabricMaterial color={canvas.clone().multiplyScalar(1.05)} roughness={1} envMapIntensity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {[-doorW * 0.8, doorW * 0.8].map((sx, i) => (
        <mesh key={i} castShadow position={[sx, wallH * 0.45, depthM / 2 + depthM * 0.3]}>
          <cylinderGeometry args={[0.02, 0.022, wallH * 0.9, 6]} />
          <meshStandardMaterial color="#8a6a3a" roughness={0.7} />
        </mesh>
      ))}
      {highDetail && (
        /* Stitched panel seams across the roof slopes */
        [-1, 1].map(side => (
          <mesh key={`seam-${side}`} position={[side * widthM * 0.28, wallH + ridgeH * 0.44, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, depthM * 1.02, 4]} />
            <meshStandardMaterial color={canvas.clone().multiplyScalar(0.78)} roughness={1} />
          </mesh>
        ))
      )}
      <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 + 0.004} arch={false} />
      {backDoor && <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 + 0.004} back arch={false} />}
      <TentWindow position={[widthM / 2 + 0.005, wallH * 0.62, 0]} width={depthM * 0.24} height={wallH * 0.34} rotY={Math.PI / 2} />
      <TentHem widthM={widthM} depthM={depthM} color={canvas.clone().multiplyScalar(0.62)} />
      <GuyLines widthM={widthM} depthM={depthM} anchorY={wallH * 0.98} />
      <GroundSheet widthM={widthM} depthM={depthM} color={canvas.clone().multiplyScalar(0.5)} />
    </group>
  )
}

// ─── Cabin / instant tent (Coleman, REI Kingdom) ────────────
function CabinTent({ widthM, depthM, heightM, color, backDoor }: TentStyleProps) {
  const tc = hexToThreeColor(color)
  const highDetail = useHighDetail()
  const wallH = heightM * 0.55
  const roofH = heightM * 0.45
  const roofGeo = useHipRoofGeometry(widthM * 1.08, depthM * 1.08, roofH)
  const doorW = Math.min(widthM, depthM) * 0.32
  const doorH = wallH * 0.88
  const winW = depthM * 0.26
  const winH = wallH * 0.4
  const cornerR = Math.min(widthM, depthM, wallH) * 0.1
  const poleR = Math.min(widthM, depthM) * 0.016
  return (
    <group>
      {/* Vertical fabric walls, softened at the corner poles */}
      <RoundedBox
        args={[widthM, wallH, depthM]}
        radius={cornerR}
        smoothness={2}
        castShadow
        receiveShadow
        position={[0, wallH / 2, 0]}
      >
        <FabricMaterial color={tc} roughness={1} envMapIntensity={0.32} />
      </RoundedBox>
      {/* Tall hip roof with an overhanging, slack fly */}
      <mesh castShadow receiveShadow geometry={roofGeo} position={[0, wallH, 0]}>
        <FabricMaterial color={tc.clone().multiplyScalar(0.84)} roughness={1} envMapIntensity={0.32} side={THREE.DoubleSide} />
      </mesh>
      {highDetail && (
        /* Exposed corner frame poles */
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz], i) => (
          <mesh key={`pole-${i}`} castShadow position={[sx * widthM * 0.5, wallH / 2, sz * depthM * 0.5]}>
            <cylinderGeometry args={[poleR, poleR, wallH, 6]} />
            <meshStandardMaterial color="#6b7075" metalness={0.55} roughness={0.45} />
          </mesh>
        ))
      )}
      <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 + 0.004} arch={false} frameColor={tc.clone().multiplyScalar(0.62)} />
      {backDoor && <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 + 0.004} back arch={false} frameColor={tc.clone().multiplyScalar(0.62)} />}
      <TentWindow position={[widthM / 2 + 0.005, wallH * 0.58, 0]} width={winW} height={winH} rotY={Math.PI / 2} />
      <TentWindow position={[-widthM / 2 - 0.005, wallH * 0.58, 0]} width={winW} height={winH} rotY={-Math.PI / 2} />
      <TentHem widthM={widthM} depthM={depthM} color={tc.clone().multiplyScalar(0.55)} />
      <GuyLines widthM={widthM * 1.04} depthM={depthM * 1.04} anchorY={wallH * 0.97} />
      <GroundSheet widthM={widthM} depthM={depthM} color={tc.clone().multiplyScalar(0.5)} />
    </group>
  )
}

// ─── Classic dome tent (default for unknown make/model) ─────
function DomeTent({ widthM, depthM, heightM, color, backDoor }: TentStyleProps) {
  const tc = hexToThreeColor(color)
  const highDetail = useHighDetail()
  const r = 0.5
  const wallH = heightM * 0.4
  const domeH = heightM - wallH
  const doorW = Math.min(widthM, depthM) * 0.32
  const doorH = wallH * 0.96
  const fly = tc.clone().multiplyScalar(0.78).lerp(new THREE.Color('#f0e7d4'), 0.12)
  return (
    <group>
      {/* Short vertical fabric wall — the door & windows attach here */}
      <mesh castShadow receiveShadow position={[0, wallH / 2, 0]} scale={[widthM / (2 * r), 1, depthM / (2 * r)]}>
        <cylinderGeometry args={[r * 0.97, r, wallH, 32]} />
        <FabricMaterial color={tc} roughness={1} envMapIntensity={0.3} />
      </mesh>
      {/* Inner canopy */}
      <mesh castShadow receiveShadow position={[0, wallH, 0]} scale={[widthM, domeH * 2, depthM]}>
        <sphereGeometry args={[r, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <FabricMaterial color={tc.clone().multiplyScalar(0.96)} roughness={1} envMapIntensity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Rainfly draped over the top — the offset shell is what makes a dome
          tent read as a tent instead of a smooth hemisphere. */}
      <mesh castShadow position={[0, wallH * 0.62, 0]} scale={[widthM * 1.05, (domeH + wallH * 0.38) * 2, depthM * 1.05]}>
        <sphereGeometry args={[r, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
        <FabricMaterial color={fly} roughness={1} envMapIntensity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Arched support poles crossing over the dome */}
      {[{ rot: 0, span: widthM }, { rot: Math.PI / 2, span: depthM }].map(({ rot, span }, i) => (
        <mesh key={i} castShadow position={[0, wallH, 0]} rotation={[0, rot, 0]} scale={[span / (2 * r), domeH / r, 1]}>
          <torusGeometry args={[r, 0.018, 6, 24, Math.PI]} />
          <meshStandardMaterial color="#5b6066" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {highDetail && (
        /* Vestibule porch over the entrance */
        <>
          <mesh castShadow position={[0, wallH * 0.72, depthM * 0.62]} rotation={[Math.PI / 2.5, 0, 0]}>
            <planeGeometry args={[doorW * 2, depthM * 0.34]} />
            <FabricMaterial color={fly} roughness={1} envMapIntensity={0.3} side={THREE.DoubleSide} />
          </mesh>
          {[-doorW * 0.85, doorW * 0.85].map((sx, i) => (
            <mesh key={`vp-${i}`} position={[sx, wallH * 0.28, depthM * 0.68]}>
              <cylinderGeometry args={[0.012, 0.012, wallH * 0.56, 5]} />
              <meshStandardMaterial color="#5b6066" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
        </>
      )}
      <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 * 0.95} arch frameColor={tc.clone().multiplyScalar(0.7)} />
      {backDoor && <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 * 0.95} back arch frameColor={tc.clone().multiplyScalar(0.7)} />}
      <TentWindow position={[widthM / 2 * 0.95, wallH * 0.58, 0]} width={depthM * 0.26} height={wallH * 0.5} rotY={Math.PI / 2} />
      <TentHem widthM={widthM * 0.97} depthM={depthM * 0.97} color={tc.clone().multiplyScalar(0.55)} />
      <GuyLines widthM={widthM * 0.92} depthM={depthM * 0.92} anchorY={wallH + domeH * 0.35} spread={0.38} />
      <GroundSheet widthM={widthM} depthM={depthM} color={tc.clone().multiplyScalar(0.55)} />
    </group>
  )
}

// Shared ground sheet under every tent, with a scuffed dust apron around it.
function GroundSheet({ widthM, depthM, color }: { widthM: number; depthM: number; color: THREE.Color }) {
  return (
    <group>
      <mesh receiveShadow position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthM * 1.04, depthM * 1.04]} />
        <meshStandardMaterial color={color} roughness={1} envMapIntensity={0.2} />
      </mesh>
      {/* Trodden dust ring from people walking around the tent */}
      <mesh receiveShadow position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthM * 1.5, depthM * 1.5]} />
        <meshStandardMaterial color="#cdb98d" roughness={1} transparent opacity={0.35} />
      </mesh>
    </group>
  )
}

interface TentStyleProps {
  widthM: number
  depthM: number
  heightM: number
  color: string
  backDoor: boolean
}

// Campers sleeping in an RV/vehicle still get an `object_type: 'tent'` object,
// so detect them from the persisted flag, the "(RV)" label, or the make/model.
function isRVShelter(obj: FloorplanObjectRow): boolean {
  if (obj.properties?.is_rv) return true
  const text = `${obj.label ?? ''} ${obj.properties?.tent_make_model ?? ''}`.toLowerCase()
  return /\brv\b|\brvs\b|motor\s?home|camper\s?van|campervan|winnebago|airstream|sprinter|travel\s?trailer|fifth\s?wheel|box\s?truck/.test(text)
}

// ─── Tent (brand-aware dispatcher) ──────────────────────────
function Tent3D({ obj, widthM, depthM, heightM, color }: { obj: FloorplanObjectRow; widthM: number; depthM: number; heightM: number; color: string }) {
  const entranceCount = obj.properties?.entrance_count ?? 1
  const backDoor = entranceCount >= 2 || obj.properties?.entrance_side === 'both'

  // RV/camper shelters render as the same motorhome model as a placed RV object
  // instead of a tent silhouette.
  if (isRVShelter(obj)) {
    const rvHeightM = Math.max(heightM, Math.min(widthM, depthM) * 1.25)
    return <RV3D widthM={widthM} depthM={depthM} heightM={rvHeightM} color={color} />
  }

  const style = classifyTentStyle(obj.properties?.tent_make_model)
  // Floor the height so small tents aren't rendered as flat pancakes — a real
  // tent stands a meaningful fraction of its footprint tall.
  const effHeightM = Math.max(heightM, Math.min(widthM, depthM) * 0.72)
  const props: TentStyleProps = { widthM, depthM, heightM: effHeightM, color, backDoor }

  switch (style) {
    case 'shiftpod': return <ShiftpodTent {...props} />
    case 'nobake':   return <NoBakeTent {...props} />
    case 'canvas':   return <CanvasTent {...props} />
    case 'cabin':    return <CabinTent {...props} />
    case 'dome':
    default:         return <DomeTent {...props} />
  }
}

// ─── Generator ──────────────────────────────────────────────
function Generator3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  return (
    <group>
      {/* Main housing */}
      <mesh castShadow receiveShadow position={[0, heightM / 2, 0]}>
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshStandardMaterial color={threeColor} roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Vent grille on side */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[widthM / 2 + 0.004, heightM * 0.3 + i * heightM * 0.1, 0]}>
          <boxGeometry args={[0.002, heightM * 0.03, depthM * 0.6]} />
          <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {/* Control panel */}
      <mesh position={[-widthM / 2 - 0.004, heightM * 0.6, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[depthM * 0.5, heightM * 0.3]} />
        <meshStandardMaterial color="#222222" roughness={0.5} />
      </mesh>
      {/* Indicator light on panel */}
      <mesh position={[-widthM / 2 - 0.006, heightM * 0.68, depthM * 0.05]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
      </mesh>
      {/* Exhaust pipe */}
      <mesh castShadow position={[widthM * 0.3, heightM + 0.05, -depthM * 0.3]}>
        <cylinderGeometry args={[0.02, 0.02, heightM * 0.25, 8]} />
        <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Fuel tank */}
      <mesh castShadow position={[0, heightM * 0.15, depthM * 0.35]}>
        <boxGeometry args={[widthM * 0.5, heightM * 0.25, depthM * 0.15]} />
        <meshStandardMaterial color="#660000" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Frame base */}
      <mesh receiveShadow position={[0, 0.01, 0]}>
        <boxGeometry args={[widthM * 1.05, 0.02, depthM * 1.05]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── Porta Potty ────────────────────────────────────────────
function PortaPotty3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  return (
    <group>
      {/* Main box */}
      <mesh castShadow receiveShadow position={[0, heightM / 2, 0]}>
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshStandardMaterial color={threeColor} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Roof (slight overhang, darker) */}
      <mesh castShadow position={[0, heightM + 0.01, 0]}>
        <boxGeometry args={[widthM * 1.05, 0.02, depthM * 1.05]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.6)} roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Roof vent */}
      <mesh position={[0, heightM + 0.035, 0]}>
        <boxGeometry args={[widthM * 0.35, 0.03, depthM * 0.35]} />
        <meshStandardMaterial color="#555555" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* Door outline (front face) */}
      <mesh position={[widthM / 2 + 0.004, heightM * 0.45, 0]}>
        <planeGeometry args={[depthM * 0.7, heightM * 0.78]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.75)} roughness={0.8} />
      </mesh>
      {/* Vent slats on door */}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} position={[widthM / 2 + 0.006, heightM * 0.72 + i * heightM * 0.04, 0]}>
          <boxGeometry args={[0.002, 0.005, depthM * 0.4]} />
          <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {/* Door handle */}
      <mesh position={[widthM / 2 + 0.01, heightM * 0.5, depthM * 0.18]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── Kitchen ────────────────────────────────────────────────
function Kitchen3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const counterH = heightM * 0.45
  return (
    <group>
      {/* Open-sided structure posts */}
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz], i) => (
        <mesh key={i} castShadow position={[sx * widthM * 0.47, heightM / 2, sz * depthM * 0.47]}>
          <boxGeometry args={[0.03, heightM, 0.03]} />
          <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* Roof cover */}
      <mesh castShadow receiveShadow position={[0, heightM, 0]}>
        <boxGeometry args={[widthM, 0.03, depthM]} />
        <meshStandardMaterial color={threeColor} roughness={0.7} transparent opacity={0.6} />
      </mesh>
      {/* Counter / prep surface */}
      <mesh castShadow receiveShadow position={[-widthM * 0.15, counterH, -depthM * 0.3]}>
        <boxGeometry args={[widthM * 0.6, 0.03, depthM * 0.3]} />
        <meshStandardMaterial color="#bbbbbb" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Counter legs */}
      {[[-0.4, -0.4], [0.15, -0.4], [0.15, -0.2], [-0.4, -0.2]].map(([sx, sz], i) => (
        <mesh key={`cl${i}`} position={[sx * widthM, counterH / 2, sz * depthM]}>
          <boxGeometry args={[0.015, counterH, 0.015]} />
          <meshStandardMaterial color="#777777" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* Stove / burner area */}
      <mesh position={[widthM * 0.2, counterH + 0.02, -depthM * 0.32]}>
        <boxGeometry args={[widthM * 0.2, 0.02, depthM * 0.22]} />
        <meshStandardMaterial color="#222222" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Burner rings */}
      {[[0.15, -0.35], [0.25, -0.35]].map(([sx, sz], i) => (
        <mesh key={`b${i}`} position={[sx * widthM, counterH + 0.04, sz * depthM]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.02, 0.004, 8, 16]} />
          <meshStandardMaterial color="#ff3300" emissive="#ff2200" emissiveIntensity={0.3} metalness={0.5} />
        </mesh>
      ))}
      {/* Sink basin */}
      <mesh position={[-widthM * 0.3, counterH - 0.01, -depthM * 0.3]}>
        <boxGeometry args={[widthM * 0.1, 0.04, depthM * 0.1]} />
        <meshStandardMaterial color="#aaddee" metalness={0.3} roughness={0.2} />
      </mesh>
    </group>
  )
}

// ─── Grill ──────────────────────────────────────────────────
function Grill3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const bodyH = heightM * 0.4
  return (
    <group>
      {/* Grill body (bowl/box) */}
      <mesh castShadow receiveShadow position={[0, heightM * 0.55, 0]}>
        <boxGeometry args={[widthM * 0.85, bodyH, depthM * 0.85]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.5)} roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Grill grates */}
      {Array.from({ length: Math.max(3, Math.round(depthM / 0.08)) }, (_, i) => (
        <mesh key={i} position={[0, heightM * 0.76, -depthM * 0.35 + i * (depthM * 0.7) / Math.max(2, Math.round(depthM / 0.08) - 1)]}>
          <boxGeometry args={[widthM * 0.78, 0.005, 0.005]} />
          <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {/* Lid handle */}
      <mesh position={[0, heightM * 0.85, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, widthM * 0.3, 6]} />
        <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Legs */}
      {[[-0.35, -0.35], [0.35, -0.35], [0.35, 0.35], [-0.35, 0.35]].map(([sx, sz], i) => (
        <mesh key={i} castShadow position={[sx * widthM, heightM * 0.25, sz * depthM]}>
          <cylinderGeometry args={[0.01, 0.01, heightM * 0.5, 6]} />
          <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      {/* Heat glow */}
      <pointLight position={[0, heightM * 0.7, 0]} color="#ff4400" intensity={0.5} distance={widthM * 2} castShadow={false} />
    </group>
  )
}

// ─── Refrigerated Truck ─────────────────────────────────────
function ReeferTruck3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const boxLen = widthM * 0.68
  const cabLen = widthM - boxLen
  const wheelR = Math.min(depthM * 0.1, heightM * 0.08)
  const boxH = heightM * 0.9

  return (
    <group>
      {/* Refrigerated box body */}
      <mesh castShadow receiveShadow position={[-widthM / 2 + boxLen / 2, boxH / 2, 0]}>
        <boxGeometry args={[boxLen, boxH, depthM]} />
        <meshStandardMaterial color="#eeeeee" roughness={0.5} metalness={0.15} />
      </mesh>
      {/* Reefer unit on front of box */}
      <mesh castShadow position={[-widthM / 2 + 0.02, boxH * 0.7, 0]}>
        <boxGeometry args={[0.06, boxH * 0.4, depthM * 0.7]} />
        <meshStandardMaterial color="#cccccc" roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Reefer vent grille */}
      {Array.from({ length: 3 }, (_, i) => (
        <mesh key={i} position={[-widthM / 2 - 0.005, boxH * 0.6 + i * 0.04, 0]}>
          <boxGeometry args={[0.002, 0.01, depthM * 0.5]} />
          <meshStandardMaterial color="#999999" metalness={0.6} />
        </mesh>
      ))}
      {/* Cab */}
      <mesh castShadow receiveShadow position={[widthM / 2 - cabLen / 2, heightM * 0.38, 0]}>
        <boxGeometry args={[cabLen, heightM * 0.7, depthM * 0.9]} />
        <meshStandardMaterial color={threeColor} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Windshield */}
      <mesh position={[widthM / 2 + 0.004, heightM * 0.52, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depthM * 0.65, heightM * 0.35]} />
        <meshStandardMaterial color="#87CEEB" metalness={0.4} roughness={0.05} transparent opacity={0.6} />
      </mesh>
      {/* Wheels */}
      <Wheel position={[-widthM * 0.3, wheelR, depthM / 2 + 0.005]} radius={wheelR} />
      <Wheel position={[-widthM * 0.3, wheelR, -depthM / 2 - 0.005]} radius={wheelR} />
      <Wheel position={[widthM * 0.35, wheelR, depthM / 2 + 0.005]} radius={wheelR} />
      <Wheel position={[widthM * 0.35, wheelR, -depthM / 2 - 0.005]} radius={wheelR} />
      {/* Roll-up door at back of box */}
      <mesh position={[-widthM / 2 + boxLen + 0.004, boxH * 0.48, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depthM * 0.85, boxH * 0.88]} />
        <meshStandardMaterial color="#dddddd" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Door handle */}
      <mesh position={[-widthM / 2 + boxLen + 0.015, boxH * 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.05, 6]} />
        <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── Fire Pit ───────────────────────────────────────────────
function FirePit3D({ widthM, depthM, heightM, color: _color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const radius = Math.min(widthM, depthM) * 0.42
  return (
    <group>
      {/* Stone ring */}
      <mesh castShadow receiveShadow position={[0, heightM * 0.4, 0]}>
        <torusGeometry args={[radius, radius * 0.2, 8, 24]} />
        <meshStandardMaterial color="#8B7355" roughness={0.95} metalness={0} />
      </mesh>
      {/* Inner pit (dark) */}
      <mesh receiveShadow position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.75, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={1} />
      </mesh>
      {/* Embers / coals */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.5, 12]} />
        <meshStandardMaterial color="#cc3300" emissive="#ff4400" emissiveIntensity={0.6} roughness={1} />
      </mesh>
      {/* Fire glow */}
      <pointLight position={[0, heightM + 0.3, 0]} color="#ff6600" intensity={2.5} distance={widthM * 4} castShadow={false} />
      <pointLight position={[0, 0.1, 0]} color="#ff3300" intensity={1} distance={widthM * 2} castShadow={false} />
    </group>
  )
}

// ─── Table ──────────────────────────────────────────────────
function Table3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const topH = heightM * 0.08
  const legH = heightM - topH
  return (
    <group>
      {/* Table top */}
      <mesh castShadow receiveShadow position={[0, heightM - topH / 2, 0]}>
        <boxGeometry args={[widthM, topH, depthM]} />
        <meshStandardMaterial color={threeColor} roughness={0.8} metalness={0} />
      </mesh>
      {/* Legs */}
      {[[-0.42, -0.42], [0.42, -0.42], [0.42, 0.42], [-0.42, 0.42]].map(([sx, sz], i) => (
        <mesh key={i} castShadow position={[sx * widthM, legH / 2, sz * depthM]}>
          <boxGeometry args={[0.02, legH, 0.02]} />
          <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.7)} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Bar ────────────────────────────────────────────────────
function Bar3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const counterH = heightM * 0.55
  return (
    <group>
      {/* Bar counter */}
      <mesh castShadow receiveShadow position={[0, counterH / 2, -depthM * 0.3]}>
        <boxGeometry args={[widthM * 0.95, counterH, depthM * 0.3]} />
        <meshStandardMaterial color={threeColor} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Counter top surface */}
      <mesh position={[0, counterH + 0.01, -depthM * 0.3]}>
        <boxGeometry args={[widthM, 0.025, depthM * 0.35]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.6)} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Stools */}
      {Array.from({ length: Math.max(2, Math.round(widthM / 0.4)) }, (_, i) => {
        const x = -widthM * 0.4 + i * (widthM * 0.8) / Math.max(1, Math.round(widthM / 0.4) - 1)
        return (
          <group key={i} position={[x, 0, depthM * 0.1]}>
            {/* Stool seat */}
            <mesh castShadow position={[0, counterH * 0.6, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.015, 12]} />
              <meshStandardMaterial color="#444444" roughness={0.6} metalness={0.3} />
            </mesh>
            {/* Stool leg */}
            <mesh position={[0, counterH * 0.3, 0]}>
              <cylinderGeometry args={[0.01, 0.015, counterH * 0.55, 6]} />
              <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        )
      })}
      {/* Back shelf structure */}
      <mesh castShadow position={[0, heightM / 2, -depthM * 0.45]}>
        <boxGeometry args={[widthM * 0.9, heightM, 0.02]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.5)} roughness={0.7} />
      </mesh>
      {/* Shelves */}
      {[0.3, 0.55, 0.8].map((yf, i) => (
        <mesh key={i} position={[0, heightM * yf, -depthM * 0.43]}>
          <boxGeometry args={[widthM * 0.88, 0.015, 0.06]} />
          <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.6)} roughness={0.6} />
        </mesh>
      ))}
      {/* Roof / canopy posts */}
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz], i) => (
        <mesh key={`p${i}`} castShadow position={[sx * widthM * 0.47, heightM / 2, sz * depthM * 0.47]}>
          <boxGeometry args={[0.025, heightM, 0.025]} />
          <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Stage ──────────────────────────────────────────────────
function Stage3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const platformH = heightM * 0.15
  return (
    <group>
      {/* Stage platform */}
      <mesh castShadow receiveShadow position={[0, platformH / 2, 0]}>
        <boxGeometry args={[widthM, platformH, depthM]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.4)} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Stage floor surface */}
      <mesh position={[0, platformH + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthM * 0.98, depthM * 0.98]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>
      {/* Speaker stacks */}
      {[-1, 1].map((side, i) => (
        <mesh key={i} castShadow position={[side * widthM * 0.45, platformH + heightM * 0.25, -depthM * 0.4]}>
          <boxGeometry args={[widthM * 0.08, heightM * 0.45, depthM * 0.08]} />
          <meshStandardMaterial color="#222222" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {/* Truss / lighting rig */}
      <mesh position={[0, heightM * 0.9, -depthM * 0.35]}>
        <boxGeometry args={[widthM * 0.9, 0.03, 0.03]} />
        <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Truss uprights */}
      {[-1, 1].map((side, i) => (
        <mesh key={`t${i}`} castShadow position={[side * widthM * 0.44, (platformH + heightM * 0.9) / 2, -depthM * 0.35]}>
          <boxGeometry args={[0.025, heightM * 0.8, 0.025]} />
          <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      {/* Monitor wedges */}
      {[-0.25, 0.25].map((sx, i) => (
        <mesh key={`m${i}`} castShadow position={[sx * widthM, platformH + 0.03, depthM * 0.35]} rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[widthM * 0.1, heightM * 0.06, depthM * 0.08]} />
          <meshStandardMaterial color="#333333" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Bike Parking ───────────────────────────────────────────
function BikeParking3D({ widthM, depthM: _depthM, heightM, color: _color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const rackCount = Math.max(2, Math.round(widthM / 0.35))
  return (
    <group>
      {/* Ground rail */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[widthM * 0.9, 0.015, 0.02]} />
        <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* U-shaped racks */}
      {Array.from({ length: rackCount }, (_, i) => {
        const x = -widthM * 0.4 + i * (widthM * 0.8) / Math.max(1, rackCount - 1)
        const archH = heightM * 0.7
        const archW = 0.06
        return (
          <group key={i} position={[x, 0, 0]}>
            {/* Left upright */}
            <mesh position={[0, archH / 2, -archW / 2]}>
              <cylinderGeometry args={[0.008, 0.008, archH, 6]} />
              <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Right upright */}
            <mesh position={[0, archH / 2, archW / 2]}>
              <cylinderGeometry args={[0.008, 0.008, archH, 6]} />
              <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Top arch */}
            <mesh position={[0, archH, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.008, 0.008, archW, 6]} />
              <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ─── Fuel / Propane Tank ────────────────────────────────────
function FuelTank3D({ widthM, depthM, heightM: _heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const r = Math.min(widthM, depthM) * 0.4
  return (
    <group>
      {/* Horizontal cylinder tank */}
      <mesh castShadow receiveShadow position={[0, r + 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[r, widthM * 0.5, 8, 16]} />
        <meshStandardMaterial color={threeColor} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Cradle / support legs */}
      {[-0.25, 0.25].map((sx, i) => (
        <mesh key={i} position={[sx * widthM, r * 0.5, 0]}>
          <boxGeometry args={[0.015, r, depthM * 0.5]} />
          <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* Valve on top */}
      <mesh position={[0, r * 2 + 0.04, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.06, 8]} />
        <meshStandardMaterial color="#cc0000" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Warning band */}
      <mesh position={[0, r + 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[r + 0.003, 0.008, 4, 24]} />
        <meshStandardMaterial color="#ff0000" roughness={0.6} />
      </mesh>
    </group>
  )
}

// ─── Water Station ──────────────────────────────────────────
function WaterStation3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const tankR = Math.min(widthM, depthM) * 0.35
  return (
    <group>
      {/* Cylindrical water tank */}
      <mesh castShadow receiveShadow position={[0, heightM / 2, 0]}>
        <cylinderGeometry args={[tankR, tankR, heightM, 16]} />
        <meshStandardMaterial color={threeColor} roughness={0.4} metalness={0.2} transparent opacity={0.8} />
      </mesh>
      {/* Water level visible inside */}
      <mesh position={[0, heightM * 0.35, 0]}>
        <cylinderGeometry args={[tankR * 0.95, tankR * 0.95, heightM * 0.6, 16]} />
        <meshStandardMaterial color="#4488cc" roughness={0.3} transparent opacity={0.35} />
      </mesh>
      {/* Lid */}
      <mesh position={[0, heightM + 0.01, 0]}>
        <cylinderGeometry args={[tankR * 1.02, tankR * 1.02, 0.02, 16]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.7)} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Spigot */}
      <mesh position={[tankR + 0.02, heightM * 0.25, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.05, 6]} />
        <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── Shower Container ───────────────────────────────────────
function Shower3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const sideGeo = useCorrugatedGeometry(widthM * 0.95, heightM * 0.95, Math.max(3, Math.round(widthM / 0.15)), 0.01)

  return (
    <group>
      {/* Container body (same corrugated style as PC container) */}
      <mesh castShadow receiveShadow geometry={sideGeo} position={[0, heightM / 2, depthM / 2]}>
        <meshStandardMaterial color={threeColor} roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh castShadow receiveShadow geometry={sideGeo} position={[0, heightM / 2, -depthM / 2]} rotation={[0, Math.PI, 0]}>
        <meshStandardMaterial color={threeColor} roughness={0.7} metalness={0.3} />
      </mesh>
      {/* End walls */}
      <mesh castShadow position={[-widthM / 2, heightM / 2, 0]}>
        <boxGeometry args={[0.02, heightM, depthM]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.85)} roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh castShadow position={[widthM / 2, heightM / 2, 0]}>
        <boxGeometry args={[0.02, heightM, depthM]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.85)} roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Roof */}
      <mesh castShadow receiveShadow position={[0, heightM, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthM, depthM]} />
        <meshStandardMaterial color={threeColor.clone().multiplyScalar(0.7)} roughness={0.8} metalness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Stall dividers inside */}
      {Array.from({ length: Math.max(1, Math.round(widthM / 0.5) - 1) }, (_, i) => {
        const x = -widthM / 2 + (i + 1) * (widthM / Math.round(widthM / 0.5))
        return (
          <mesh key={i} position={[x, heightM * 0.45, 0]}>
            <boxGeometry args={[0.01, heightM * 0.85, depthM * 0.9]} />
            <meshStandardMaterial color="#dddddd" roughness={0.7} transparent opacity={0.5} />
          </mesh>
        )
      })}
      {/* Water pipe along top */}
      <mesh position={[0, heightM * 0.92, 0]}>
        <cylinderGeometry args={[0.008, 0.008, widthM * 0.9, 6]} />
        <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

// ─── Storage (shelving) ─────────────────────────────────────
function Storage3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const shelfCount = Math.max(2, Math.round(heightM / 0.3))
  return (
    <group>
      {/* Main enclosure (translucent) */}
      <mesh castShadow receiveShadow position={[0, heightM / 2, 0]}>
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshStandardMaterial color={threeColor} roughness={0.7} transparent opacity={0.5} />
      </mesh>
      {/* Shelf uprights */}
      {[[-0.45, -0.45], [0.45, -0.45], [0.45, 0.45], [-0.45, 0.45]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * widthM, heightM / 2, sz * depthM]}>
          <boxGeometry args={[0.015, heightM, 0.015]} />
          <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* Shelves */}
      {Array.from({ length: shelfCount }, (_, i) => (
        <mesh key={i} position={[0, (i + 1) * heightM / (shelfCount + 1), 0]}>
          <boxGeometry args={[widthM * 0.88, 0.012, depthM * 0.88]} />
          <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Art Car ────────────────────────────────────────────────
function ArtCar3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const threeColor = hexToThreeColor(color)
  const wheelR = Math.min(depthM * 0.1, heightM * 0.08)
  const platformH = heightM * 0.25
  return (
    <group>
      {/* Flatbed base */}
      <mesh castShadow receiveShadow position={[0, platformH / 2, 0]}>
        <boxGeometry args={[widthM, platformH, depthM]} />
        <meshStandardMaterial color="#444444" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Art sculpture on top — abstract peaked shape */}
      <mesh castShadow position={[0, platformH + heightM * 0.35, 0]}>
        <coneGeometry args={[Math.min(widthM, depthM) * 0.4, heightM * 0.6, 6]} />
        <meshStandardMaterial color={threeColor} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Decorative rings */}
      <mesh position={[0, platformH + heightM * 0.2, 0]}>
        <torusGeometry args={[Math.min(widthM, depthM) * 0.35, 0.015, 8, 24]} />
        <meshStandardMaterial color={threeColor.clone().lerp(new THREE.Color('#ffffff'), 0.3)} metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Wheels */}
      <Wheel position={[widthM * 0.35, wheelR, depthM / 2 + 0.005]} radius={wheelR} />
      <Wheel position={[widthM * 0.35, wheelR, -depthM / 2 - 0.005]} radius={wheelR} />
      <Wheel position={[-widthM * 0.35, wheelR, depthM / 2 + 0.005]} radius={wheelR} />
      <Wheel position={[-widthM * 0.35, wheelR, -depthM / 2 - 0.005]} radius={wheelR} />
      {/* LED light strips (emissive rings) */}
      {[0.4, 0.55].map((yf, i) => (
        <mesh key={i} position={[0, platformH + heightM * yf, 0]}>
          <torusGeometry args={[Math.min(widthM, depthM) * (0.3 - i * 0.08), 0.008, 6, 20]} />
          <meshStandardMaterial color="#ff44ff" emissive="#ff22ff" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Stairs / Ladder (airplane-style rolling staircase) ─────────
// widthM = footprint along the ramp direction (X)
// depthM = tread width (Z)
// heightM = top platform elevation
function StairsLadder3D({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const frame = hexToThreeColor(color)
  const dark = frame.clone().multiplyScalar(0.55)
  const tread = frame.clone().lerp(new THREE.Color('#1f2937'), 0.4)

  // Top 22% of length = platform; rest = sloped staircase
  const platformFrac = 0.22
  const platLen = widthM * platformFrac
  const stairLen = widthM - platLen
  const platHeight = heightM
  const platThick = Math.max(0.08, heightM * 0.04)

  // Step layout — ~7" risers (~0.18m). Floorplan units are meters here (1 ft = 0.3048m).
  // Use rise of ~0.5 ft (~0.15m) for compact look at small scales.
  const stepRise = 0.18
  const stepCount = Math.max(3, Math.round(platHeight / stepRise))
  const stepRun = stairLen / stepCount
  const treadW = depthM * 0.85
  const treadThick = Math.max(0.04, platThick * 0.6)

  // Wheel radius based on depth
  const wheelR = Math.min(depthM * 0.15, 0.3)

  // Stair base X = -widthM/2, platform centered at +widthM/2 - platLen/2
  const stairStartX = -widthM / 2

  // Side stringers (the diagonal beams holding the steps)
  const stringerThick = Math.max(0.05, depthM * 0.04)
  const stringerLen = Math.sqrt(stairLen * stairLen + platHeight * platHeight)
  const stringerAngle = Math.atan2(platHeight, stairLen)
  const stringerDepth = Math.max(0.18, platHeight * 0.15)

  // Handrail height above steps/platform
  const railH = 1.0
  const railThick = 0.035

  return (
    <group>
      {/* ─── Steps ─── */}
      {Array.from({ length: stepCount }, (_, i) => {
        const x = stairStartX + i * stepRun + stepRun / 2
        const y = (i + 1) * (platHeight / stepCount) - treadThick / 2
        return (
          <mesh key={i} castShadow receiveShadow position={[x, y, 0]}>
            <boxGeometry args={[stepRun * 1.02, treadThick, treadW]} />
            <meshStandardMaterial color={tread} roughness={0.85} metalness={0.3} />
          </mesh>
        )
      })}

      {/* ─── Side stringers (two diagonal beams) ─── */}
      {[-1, 1].map(side => (
        <mesh
          key={`stringer-${side}`}
          castShadow
          position={[
            stairStartX + stairLen / 2,
            platHeight / 2,
            (side * treadW) / 2 + (side * stringerThick) / 2,
          ]}
          rotation={[0, 0, stringerAngle]}
        >
          <boxGeometry args={[stringerLen, stringerDepth, stringerThick]} />
          <meshStandardMaterial color={dark} roughness={0.7} metalness={0.5} />
        </mesh>
      ))}

      {/* ─── Top Platform ─── */}
      <mesh
        castShadow
        receiveShadow
        position={[widthM / 2 - platLen / 2, platHeight - platThick / 2, 0]}
      >
        <boxGeometry args={[platLen, platThick, depthM * 0.95]} />
        <meshStandardMaterial color={tread} roughness={0.85} metalness={0.3} />
      </mesh>

      {/* Platform support legs */}
      {[-1, 1].map(side => (
        <mesh
          key={`leg-${side}`}
          castShadow
          position={[
            widthM / 2 - stringerThick / 2,
            platHeight / 2,
            (side * depthM * 0.95) / 2,
          ]}
        >
          <boxGeometry args={[stringerThick * 1.2, platHeight, stringerThick * 1.2]} />
          <meshStandardMaterial color={dark} roughness={0.7} metalness={0.5} />
        </mesh>
      ))}

      {/* ─── Platform railing (top guardrail around 3 sides) ─── */}
      {/* Back rail (far end opposite the stairs) */}
      <mesh position={[widthM / 2 - railThick / 2, platHeight + railH / 2, 0]}>
        <boxGeometry args={[railThick, railH, depthM]} />
        <meshStandardMaterial color={frame} metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Side rails on platform */}
      {[-1, 1].map(side => (
        <mesh
          key={`prail-${side}`}
          position={[
            widthM / 2 - platLen / 2,
            platHeight + railH / 2,
            (side * depthM) / 2 - (side * railThick) / 2,
          ]}
        >
          <boxGeometry args={[platLen, railH, railThick]} />
          <meshStandardMaterial color={frame} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Top cap rail across the back */}
      <mesh position={[widthM / 2 - railThick, platHeight + railH, 0]}>
        <boxGeometry args={[railThick * 2, railThick, depthM + railThick]} />
        <meshStandardMaterial color={frame} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* ─── Sloped handrails along the stairs ─── */}
      {[-1, 1].map(side => (
        <mesh
          key={`shrail-${side}`}
          position={[
            stairStartX + stairLen / 2,
            platHeight / 2 + railH,
            (side * treadW) / 2 + (side * railThick) / 2,
          ]}
          rotation={[0, 0, stringerAngle]}
        >
          <boxGeometry args={[stringerLen, railThick, railThick]} />
          <meshStandardMaterial color={frame} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* Vertical balusters every ~2 steps along the stair handrails */}
      {Array.from({ length: stepCount }, (_, i) => {
        if (i % 2 !== 0) return null
        const x = stairStartX + i * stepRun + stepRun / 2
        const y = (i + 1) * (platHeight / stepCount)
        return (
          <group key={`bal-${i}`}>
            {[-1, 1].map(side => (
              <mesh
                key={side}
                position={[x, y + railH / 2, (side * treadW) / 2 + (side * railThick) / 2]}
              >
                <boxGeometry args={[railThick * 0.7, railH, railThick * 0.7]} />
                <meshStandardMaterial color={frame} metalness={0.5} roughness={0.5} />
              </mesh>
            ))}
          </group>
        )
      })}

      {/* ─── Wheels (4 wheels at base — 2 at bottom of stairs, 2 under platform) ─── */}
      <Wheel position={[stairStartX + wheelR * 0.4, wheelR, depthM / 2 - wheelR * 0.2]} radius={wheelR} />
      <Wheel position={[stairStartX + wheelR * 0.4, wheelR, -depthM / 2 + wheelR * 0.2]} radius={wheelR} />
      <Wheel position={[widthM / 2 - wheelR * 0.4, wheelR, depthM / 2 - wheelR * 0.2]} radius={wheelR} />
      <Wheel position={[widthM / 2 - wheelR * 0.4, wheelR, -depthM / 2 + wheelR * 0.2]} radius={wheelR} />

      {/* Cross brace under stairs for structural look */}
      <mesh
        position={[stairStartX + stairLen * 0.5, platHeight * 0.25, 0]}
        rotation={[0, 0, stringerAngle]}
      >
        <boxGeometry args={[stringerLen * 0.9, stringerThick * 0.6, treadW * 0.9]} />
        <meshStandardMaterial color={dark} roughness={0.85} metalness={0.4} transparent opacity={0.0} />
      </mesh>
    </group>
  )
}

// ─── Shade sail (slack tensioned fabric panel) ──────────────────
function ShadeSail({ widthM, depthM, heightM, color }: { widthM: number; depthM: number; heightM: number; color: string }) {
  const geo = useCanopyGeometry(widthM, depthM, Math.min(widthM, depthM) * 0.06, 1, 1)
  return (
    <mesh castShadow receiveShadow geometry={geo} position={[0, heightM, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <FabricMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.42} roughness={1} envMapIntensity={0.35} />
    </mesh>
  )
}

// ─── Shade structure canopy (fabric slung between the posts) ────
function ShadeCanopy({ widthM, depthM, heightM, color, cols, rows }: { widthM: number; depthM: number; heightM: number; color: THREE.Color; cols: number; rows: number }) {
  const sag = Math.min(widthM / Math.max(1, cols), depthM / Math.max(1, rows)) * 0.09
  const geo = useCanopyGeometry(widthM, depthM, sag, cols, rows)
  return (
    <mesh castShadow receiveShadow geometry={geo} position={[0, heightM, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <FabricMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.55} roughness={1} envMapIntensity={0.35} />
    </mesh>
  )
}

// ─── Fallback Procedural Object ────────────────────────────────
function ProceduralObject({
  obj,
  widthM,
  depthM,
  heightM,
  color,
  roofShape,
  shadePosts,
}: {
  obj: FloorplanObjectRow
  widthM: number
  depthM: number
  heightM: number
  color: string
  roofShape: RoofShape
  shadePosts?: ShadePost[]
}) {
  const threeColor = hexToThreeColor(color)
  const darkerColor = threeColor.clone().multiplyScalar(0.7)
  const lighterColor = threeColor.clone().lerp(new THREE.Color('#ffffff'), 0.3)

  // Flat ground objects
  if (heightM <= 0.1) {
    return (
      <mesh receiveShadow position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthM, depthM]} />
        <meshStandardMaterial color={threeColor} opacity={0.6} transparent />
      </mesh>
    )
  }

  // ─── Type-specific detailed 3D models ──────────────────────
  switch (obj.object_type) {
    case 'rv':
      return <RV3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'vehicle':
      return <Vehicle3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'pc_container':
      return <Container3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'tent':
      return <Tent3D obj={obj} widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'generator':
      return <Generator3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'porta_potty':
      return <PortaPotty3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'kitchen':
      return <Kitchen3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'grill':
      return <Grill3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'refrigerated_truck':
      return <ReeferTruck3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'fire_pit':
      return <FirePit3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'table':
      return <Table3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'bar':
      return <Bar3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'stage':
      return <Stage3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'bike_parking':
      return <BikeParking3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'fuel_storage':
    case 'propane_storage':
      return <FuelTank3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'water_station':
      return <WaterStation3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'shower_container':
      return <Shower3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'storage':
      return <Storage3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'art_car':
      return <ArtCar3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
    case 'stairs_ladder':
      return <StairsLadder3D widthM={widthM} depthM={depthM} heightM={heightM} color={color} />
  }

  // Shade sail: a slack fabric panel at canopy height — no posts.
  if (obj.object_type === 'shade_sail') {
    const sailColor = obj.color && obj.color.toLowerCase() !== '#93c5fd' ? obj.color : '#f5f0e6'
    return <ShadeSail widthM={widthM} depthM={depthM} heightM={heightM} color={sailColor} />
  }

  // Shade structures: open canopy with perimeter poles every 10 ft.
  // Shared posts (used by an adjacent shade_structure) collapse to one — the
  // non-owner skips rendering them.
  if (obj.object_type === 'shade_structure') {
    const postRadius = 0.04
    const SPACING_FT = 10

    // Compute local-meter stops along each axis from the FT-based spacing.
    const axisStops = (lenFt: number, lenM: number) => {
      const arr: number[] = [0]
      for (let v = SPACING_FT; v < lenFt - 0.001; v += SPACING_FT) {
        arr.push((v / lenFt) * lenM)
      }
      arr.push(lenM)
      return arr
    }
    const xs = axisStops(obj.width_ft, widthM)
    const zs = axisStops(obj.height_ft, depthM)

    // Build unique perimeter point set in local meters (top-left origin),
    // then convert to centered coordinates for three.js.
    const seen = new Set<string>()
    const pts: Array<{ x: number; z: number; shared: boolean }> = []
    const sharedKeys = new Set<string>()
    const ownedKeys = new Set<string>()
    if (shadePosts) {
      for (const p of shadePosts) {
        const k = `${p.xLocal.toFixed(2)}_${p.yLocal.toFixed(2)}`
        if (p.shared) sharedKeys.add(k)
        if (p.owned) ownedKeys.add(k)
      }
    }
    const push = (lxFt: number, lyFt: number, xM: number, zM: number) => {
      const key = `${lxFt.toFixed(2)}_${lyFt.toFixed(2)}`
      if (seen.has(key)) return
      seen.add(key)
      const shared = sharedKeys.has(key)
      // Skip rendering posts owned by a different shade structure.
      if (shadePosts && shared && !ownedKeys.has(key)) return
      pts.push({ x: xM - widthM / 2, z: zM - depthM / 2, shared })
    }
    // x-edges: top (y=0) and bottom (y=height)
    xs.forEach((xM, i) => {
      const xFt = i === xs.length - 1 ? obj.width_ft : i * SPACING_FT
      push(xFt, 0, xM, 0)
      push(xFt, obj.height_ft, xM, depthM)
    })
    // z-edges: left (x=0) and right (x=width)
    zs.forEach((zM, j) => {
      const yFt = j === zs.length - 1 ? obj.height_ft : j * SPACING_FT
      push(0, yFt, 0, zM)
      push(obj.width_ft, yFt, widthM, zM)
    })

    return (
      <group>
        {/* Perimeter poles */}
        {pts.map((p, i) => (
          <mesh key={i} castShadow position={[p.x, heightM / 2, p.z]}>
            <cylinderGeometry args={[postRadius, postRadius * 1.15, heightM, 10]} />
            <meshStandardMaterial
              color={p.shared ? '#d97706' : '#6a6f75'}
              metalness={0.85}
              roughness={0.3}
              envMapIntensity={0.9}
            />
          </mesh>
        ))}
        {/* Base plates so the posts sit on the playa rather than float */}
        {pts.map((p, i) => (
          <mesh key={`bp-${i}`} receiveShadow position={[p.x, 0.012, p.z]}>
            <cylinderGeometry args={[postRadius * 2.4, postRadius * 2.4, 0.024, 8]} />
            <meshStandardMaterial color="#4b5056" metalness={0.7} roughness={0.5} />
          </mesh>
        ))}
        {/* Fabric canopy slung between the posts */}
        <ShadeCanopy
          widthM={widthM}
          depthM={depthM}
          heightM={heightM}
          color={threeColor}
          cols={Math.max(1, xs.length - 1)}
          rows={Math.max(1, zs.length - 1)}
        />
        {/* Top edge beams connecting poles */}
        {/* Front beam */}
        <mesh position={[0, heightM, -depthM * 0.47]}>
          <boxGeometry args={[widthM * 0.94, 0.04, 0.04]} />
          <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Back beam */}
        <mesh position={[0, heightM, depthM * 0.47]}>
          <boxGeometry args={[widthM * 0.94, 0.04, 0.04]} />
          <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Left beam */}
        <mesh position={[-widthM * 0.47, heightM, 0]}>
          <boxGeometry args={[0.04, 0.04, depthM * 0.94]} />
          <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Right beam */}
        <mesh position={[widthM * 0.47, heightM, 0]}>
          <boxGeometry args={[0.04, 0.04, depthM * 0.94]} />
          <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    )
  }

  // ─── Default generic box fallback ─────────────────────────
  // Chamfered rather than a hard cube — the eased edge catches a highlight and
  // reads as a built object instead of a placeholder block.
  const bevel = Math.min(widthM, depthM, heightM) * 0.06
  return (
    <group>
      {/* Main body */}
      <RoundedBox
        castShadow
        receiveShadow
        position={[0, heightM / 2, 0]}
        args={[widthM, heightM, depthM]}
        radius={Math.max(0.01, bevel)}
        smoothness={2}
      >
        <meshStandardMaterial color={threeColor} roughness={0.72} metalness={0.12} envMapIntensity={0.5} />
      </RoundedBox>

      {/* Roof shapes */}
      {roofShape === 'pyramid' && (
        <mesh castShadow position={[0, heightM + Math.min(widthM, depthM) * 0.2, 0]}>
          <coneGeometry args={[Math.max(widthM, depthM) * 0.55, Math.min(widthM, depthM) * 0.4, 4]} />
          <meshStandardMaterial color={darkerColor} roughness={0.7} />
        </mesh>
      )}

      {roofShape === 'a_frame' && (() => {
        const isWide = widthM >= depthM
        const ridgeHeight = Math.min(widthM, depthM) * 0.4
        const hw = (widthM * 1.05) / 2
        const hd = (depthM * 1.05) / 2

        // Build a triangular prism: ridge runs along the longer axis
        const verts = isWide
          ? new Float32Array([
              // Left triangle
              -hw, 0, -hd,  -hw, 0, hd,  -hw, ridgeHeight, 0,
              // Right triangle
              hw, 0, -hd,  hw, 0, hd,  hw, ridgeHeight, 0,
              // Front slope
              -hw, 0, -hd,  hw, 0, -hd,  hw, ridgeHeight, 0,  -hw, ridgeHeight, 0,
              // Back slope
              -hw, 0, hd,  hw, 0, hd,  hw, ridgeHeight, 0,  -hw, ridgeHeight, 0,
              // Bottom
              -hw, 0, -hd,  hw, 0, -hd,  hw, 0, hd,  -hw, 0, hd,
            ])
          : new Float32Array([
              // Front triangle
              -hw, 0, -hd,  hw, 0, -hd,  0, ridgeHeight, -hd,
              // Back triangle
              -hw, 0, hd,  hw, 0, hd,  0, ridgeHeight, hd,
              // Left slope
              -hw, 0, -hd,  -hw, 0, hd,  0, ridgeHeight, hd,  0, ridgeHeight, -hd,
              // Right slope
              hw, 0, -hd,  hw, 0, hd,  0, ridgeHeight, hd,  0, ridgeHeight, -hd,
              // Bottom
              -hw, 0, -hd,  hw, 0, -hd,  hw, 0, hd,  -hw, 0, hd,
            ])

        const indices = new Uint16Array([
          // Left/Front triangle
          0, 1, 2,
          // Right/Back triangle
          3, 5, 4,
          // Front/Left slope (2 tris)
          6, 7, 8,  6, 8, 9,
          // Back/Right slope (2 tris)
          10, 12, 11,  10, 13, 12,
          // Bottom (2 tris)
          14, 15, 16,  14, 16, 17,
        ])

        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
        geo.setIndex(new THREE.BufferAttribute(indices, 1))
        geo.computeVertexNormals()

        return (
          <mesh castShadow geometry={geo} position={[0, heightM, 0]}>
            <meshStandardMaterial color={darkerColor} roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        )
      })()}

      {roofShape === 'dome' && (
        <mesh castShadow position={[0, heightM, 0]}>
          <sphereGeometry args={[Math.max(widthM, depthM) * 0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={lighterColor} roughness={0.5} metalness={0.1} />
        </mesh>
      )}
    </group>
  )
}

// Things that get dragged into place by hand and never end up perfectly square
// to the grid. Fixed infrastructure (shade, containers, kitchen) is left exact.
const HAND_PLACED_TYPES = new Set([
  'tent', 'rv', 'vehicle', 'table', 'bike_parking', 'storage', 'porta_potty',
  'fire_pit', 'water_station', 'art_car', 'grill', 'stairs_ladder',
])

// ─── Individual Map Object ─────────────────────────────────────
function MapObject3D({
  obj,
  feetToMeters,
  originX,
  originZ,
  isSelected,
  isHovered,
  showLabels,
  onSelect,
  onHover,
  shadePosts,
}: {
  obj: FloorplanObjectRow
  feetToMeters: number
  originX: number
  originZ: number
  isSelected: boolean
  isHovered: boolean
  showLabels: boolean
  onSelect: (obj: FloorplanObjectRow) => void
  onHover: (id: string | null) => void
  shadePosts?: ShadePost[]
}) {
  const groupRef = useRef<THREE.Group>(null)

  const widthM = obj.width_ft * feetToMeters
  const depthM = obj.height_ft * feetToMeters
  const elevationFt = getObjectElevation(obj)
  const heightM = elevationFt * feetToMeters
  const roofShape = (obj.properties?.roof_shape as RoofShape) || 'flat'

  // Position: convert from top-left origin (2D) to center-based (3D)
  const posX = (obj.x + obj.width_ft / 2) * feetToMeters - originX
  const posZ = (obj.y + obj.height_ft / 2) * feetToMeters - originZ

  const hasModel = !!obj.properties?.meshy_model_url
  const modelUrl = obj.properties?.meshy_model_url as string | undefined

  // Deterministic per-object variation — a couple of degrees of yaw and a hair
  // of tint keeps a row of identical tents from reading as stamped copies.
  const variation = useMemo(() => {
    if (!HAND_PLACED_TYPES.has(obj.object_type)) return { yaw: 0, color: obj.color }
    const rnd = makeRng(hashSeed(obj.id))
    const yaw = (rnd() - 0.5) * 0.06
    const tint = 0.93 + rnd() * 0.14
    const color = `#${hexToThreeColor(obj.color).multiplyScalar(tint).getHexString()}`
    return { yaw, color }
  }, [obj.id, obj.object_type, obj.color])

  // Pulse animation for hovered/selected
  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (isHovered || isSelected) {
      groupRef.current.position.y = Math.sin(Date.now() * 0.003) * 0.05
    } else {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, delta * 5)
    }
  })

  // Selection ring color
  let ringColor = 'transparent'
  if (isSelected) ringColor = '#3b82f6'

  return (
    <group
      ref={groupRef}
      position={[posX, 0, posZ]}
      rotation={[0, -(obj.rotation * Math.PI) / 180 + variation.yaw, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(obj) }}
      onPointerEnter={(e) => { e.stopPropagation(); onHover(obj.id); document.body.style.cursor = 'pointer' }}
      onPointerLeave={() => { onHover(null); document.body.style.cursor = 'auto' }}
    >
      {/* Selection ring on ground */}
      {ringColor !== 'transparent' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[Math.max(widthM, depthM) * 0.55, Math.max(widthM, depthM) * 0.6, 32]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* The actual 3D model or procedural fallback */}
      <Suspense fallback={
        <ProceduralObject
          obj={obj}
          widthM={widthM}
          depthM={depthM}
          heightM={heightM}
          color={variation.color}
          roofShape={roofShape}
          shadePosts={shadePosts}
        />
      }>
        {hasModel && modelUrl ? (
          <GLBModel
            url={modelUrl}
            scale={[widthM, heightM || widthM, depthM]}
            position={[0, 0, 0]}
          />
        ) : (
          <ProceduralObject
            obj={obj}
            widthM={widthM}
            depthM={depthM}
            heightM={heightM}
            color={variation.color}
            roofShape={roofShape}
            shadePosts={shadePosts}
          />
        )}
      </Suspense>

      {/* Floating label — only shown when the object has a non-empty label */}
      {showLabels && obj.label?.trim() && (
        <Html
          position={[0, heightM + 0.5, 0]}
          center
          distanceFactor={15}
          style={{
            background: isSelected ? 'rgba(59,130,246,0.9)' : 'rgba(0,0,0,0.75)',
            color: 'white',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 'bold',
            borderRadius: '3px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {obj.label.trim()}
        </Html>
      )}
    </group>
  )
}

// ─── Grid restricted to camp boundary ──────────────────────────
function BoundaryGrid({ widthM, depthM, gridSize }: { widthM: number; depthM: number; gridSize: number }) {
  // Grid lines live on their own transparent layer so the playa surface below
  // stays visible instead of being flattened into a solid tan slab.
  const gridTexture = useMemo(() => {
    const cellPx = 32
    const cols = Math.max(1, Math.round(widthM / gridSize))
    const rows = Math.max(1, Math.round(depthM / gridSize))
    const canvasW = Math.min(2048, cols * cellPx)
    const canvasH = Math.min(2048, rows * cellPx)
    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvasW, canvasH)
    ctx.strokeStyle = 'rgba(60,45,20,0.16)'
    ctx.lineWidth = 1
    for (let c = 0; c <= cols; c++) {
      const x = (c / cols) * canvasW
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasH); ctx.stroke()
    }
    for (let r = 0; r <= rows; r++) {
      const y = (r / rows) * canvasH
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasW, y); ctx.stroke()
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [widthM, depthM, gridSize])

  useEffect(() => () => { gridTexture.dispose() }, [gridTexture])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
      <planeGeometry args={[widthM, depthM]} />
      <meshBasicMaterial map={gridTexture} transparent depthWrite={false} />
    </mesh>
  )
}

// ─── Ground Plane ──────────────────────────────────────────────
function GroundPlane({ widthM, depthM, gridSize, farM }: { widthM: number; depthM: number; gridSize: number; farM: number }) {
  const gl = useThree(s => s.gl)

  // One cracked-playa tile, reused at two densities: coarse for the open desert,
  // finer inside the camp footprint where the camera actually gets close.
  // The clone shares the source bitmap, so the second density is free.
  const { outer, inner } = useMemo(() => {
    const base = getPlayaTexture()
    if (!base) return { outer: null, inner: null }
    const maxAniso = gl.capabilities.getMaxAnisotropy()
    const tileM = 7
    base.anisotropy = maxAniso
    base.repeat.set((farM * 2) / tileM, (farM * 2) / tileM)
    const i = base.clone()
    i.anisotropy = maxAniso
    i.repeat.set(widthM / (tileM * 0.5), depthM / (tileM * 0.5))
    return { outer: base, inner: i }
  }, [gl, widthM, depthM, farM])

  const tracks = useMemo(() => getTrackTexture(), [])

  return (
    <group>
      {/* Open playa, carried out past the mountains so the desert reads as
          continuous instead of ending on a visible edge */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[farM * 2, farM * 2]} />
        <meshStandardMaterial
          map={outer ?? undefined}
          bumpMap={outer ?? undefined}
          bumpScale={0.18}
          roughnessMap={outer ?? undefined}
          color="#e8d5a3"
          roughness={0.95}
          metalness={0}
          envMapIntensity={0.35}
        />
      </mesh>

      {/* Camp footprint — dust compacted a shade darker by traffic */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <planeGeometry args={[widthM, depthM]} />
        <meshStandardMaterial
          map={inner ?? undefined}
          bumpMap={inner ?? undefined}
          bumpScale={0.24}
          roughnessMap={inner ?? undefined}
          color="#dcc99a"
          roughness={0.93}
          metalness={0}
          envMapIntensity={0.3}
        />
      </mesh>

      {/* Traffic worn across camp */}
      {tracks && (
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.009, 0]}>
          <planeGeometry args={[Math.max(widthM, depthM) * 2.4, Math.max(widthM, depthM) * 2.4]} />
          <meshStandardMaterial map={tracks} transparent depthWrite={false} roughness={1} metalness={0} />
        </mesh>
      )}

      <BoundaryGrid widthM={widthM} depthM={depthM} gridSize={gridSize} />
    </group>
  )
}

// ─── Sun ───────────────────────────────────────────────────────
function SunLight({ span }: { span: number }) {
  const ref = useRef<THREE.DirectionalLight>(null)

  // Three won't rebuild the shadow frustum from the props alone, so without
  // this the sun keeps its stock ±5 unit box and anything outside the middle of
  // camp silently stops casting.
  useEffect(() => {
    ref.current?.shadow.camera.updateProjectionMatrix()
  }, [span])

  const d = span * 1.6
  return (
    <directionalLight
      ref={ref}
      color="#fff3dd"
      position={[SUN_DIR.x * d, SUN_DIR.y * d, SUN_DIR.z * d]}
      intensity={2.1}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-camera-far={span * 4}
      shadow-camera-left={-span * 0.8}
      shadow-camera-right={span * 0.8}
      shadow-camera-top={span * 0.8}
      shadow-camera-bottom={-span * 0.8}
    />
  )
}

// ─── Camera Controller ─────────────────────────────────────────
function CameraSetup({ widthM, depthM }: { widthM: number; depthM: number }) {
  const { camera } = useThree()

  useEffect(() => {
    const dist = Math.max(widthM, depthM) * 0.8
    camera.position.set(dist * 0.6, dist * 0.5, dist * 0.6)
    camera.lookAt(0, 0, 0)
  }, [camera, widthM, depthM])

  return null
}

// ─── Main 3D Map Component ─────────────────────────────────────
export interface CampMap3DProps {
  config: FloorplanConfigRow
  objects: FloorplanObjectRow[]
  selectedObjectId: string | null
  hoveredObjectId: string | null
  showLabels?: boolean
  onSelectObject: (obj: FloorplanObjectRow) => void
  onHoverObject: (id: string | null) => void
  onGenerate3DModel: (obj: FloorplanObjectRow) => void
}

export function CampMap3D({
  config,
  objects,
  selectedObjectId,
  hoveredObjectId,
  showLabels = true,
  onSelectObject,
  onHoverObject,
}: CampMap3DProps) {
  // Scale: 1 foot = 0.3048 meters, but for visual density let's use a tighter scale
  const feetToMeters = 0.15 // slightly compressed for better visual fit
  const widthM = config.width_ft * feetToMeters
  const depthM = config.length_ft * feetToMeters
  const originX = widthM / 2
  const originZ = depthM / 2
  const gridSizeM = config.grid_size_ft * feetToMeters

  const visibleObjects = useMemo(
    () => objects.filter(o => !['fire_lane', 'road', 'path_of_travel', 'distance_marker', 'neighbor_zone'].includes(o.object_type)),
    [objects]
  )

  // Also render flat-ground objects (roads, fire lanes) as ground markings
  const groundObjects = useMemo(
    () => objects.filter(o => ['fire_lane', 'road', 'path_of_travel'].includes(o.object_type)),
    [objects]
  )

  // Shared posts between adjacent shade_structures are deduped so the inventory
  // is accurate and the renderer doesn't double-draw them.
  const shadePostsByObj = useMemo(() => computeShadePosts(objects), [objects])

  const span = Math.max(widthM, depthM)

  // Backdrop shells, ordered so nothing pokes through: ranges sit inside the
  // playa edge, and the sky dome encloses the plane's corners.
  const horizonR = Math.min(span * 4, 260)
  const groundFar = horizonR * 1.5
  const domeR = groundFar * 1.6
  // Very dense camps drop the micro-detail pass to keep draw calls bounded.
  const highDetail = visibleObjects.length <= 110

  return (
    <div className="w-full h-full">
      <Canvas
        shadows="percentage"
        dpr={[1, 1.75]}
        performance={{ min: 0.5 }}
        camera={{ fov: 45, near: 0.1, far: domeR * 2.5 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        style={{ background: 'linear-gradient(180deg, #3f7fbe 0%, #7fb0dc 36%, #cfe2ee 50%, #e6d5ac 100%)' }}
        onPointerMissed={() => onSelectObject(null as unknown as FloorplanObjectRow)}
      >
        {/* Desert haze gives distance objects aerial perspective */}
        <fog attach="fog" args={['#dfd2ae', span * 1.1, span * 5]} />

        <CameraSetup widthM={widthM} depthM={depthM} />
        <OrbitControls
          makeDefault
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={2}
          maxDistance={span * 2}
          enableDamping
          dampingFactor={0.05}
        />

        {/* Lighting — a procedural sky drives image-based lighting, so metal,
            mylar and fabric pick up real reflections instead of flat shading.
            Direct lights stay low so shadows and form still read. */}
        <SceneEnvironment intensity={0.55} />
        <ambientLight intensity={0.12} />
        <hemisphereLight color="#bcd9ef" groundColor="#c9b184" intensity={0.4} />
        <SunLight span={span} />
        {/* Cool sky bounce so shadowed faces aren't dead flat */}
        <directionalLight color="#cfe0f0" position={[-widthM * 0.6, widthM * 0.4, depthM * 0.5]} intensity={0.35} />

        {/* Sky dome + distant ranges */}
        <Horizon radius={domeR} />

        {/* Ground */}
        <GroundPlane widthM={widthM} depthM={depthM} gridSize={gridSizeM} farM={groundFar} />

        {/* Soft occlusion where objects meet the playa. Captured over the first
            couple of seconds then frozen — no per-frame scene re-render. */}
        <ContactShadows
          position={[0, 0.015, 0]}
          opacity={0.55}
          scale={span * 1.6}
          blur={2.4}
          far={4}
          resolution={1024}
          frames={120}
          color="#5a4a2c"
        />

        <HighDetailContext.Provider value={highDetail}>
        {/* Ground marking objects (roads, fire lanes) */}
        {groundObjects.map(obj => {
          const posX = (obj.x + obj.width_ft / 2) * feetToMeters - originX
          const posZ = (obj.y + obj.height_ft / 2) * feetToMeters - originZ
          const w = obj.width_ft * feetToMeters
          const d = obj.height_ft * feetToMeters
          return (
            <mesh key={obj.id} rotation={[-Math.PI / 2, 0, 0]} position={[posX, 0.02, posZ]}>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial
                color={obj.color}
                opacity={0.5}
                transparent
                roughness={1}
              />
            </mesh>
          )
        })}

        {/* 3D Objects */}
        {visibleObjects.map(obj => (
          <MapObject3D
            key={obj.id}
            obj={obj}
            feetToMeters={feetToMeters}
            originX={originX}
            originZ={originZ}
            isSelected={selectedObjectId === obj.id}
            isHovered={hoveredObjectId === obj.id}
            showLabels={showLabels}
            onSelect={onSelectObject}
            onHover={onHoverObject}
            shadePosts={shadePostsByObj.get(obj.id)}
          />
        ))}
        </HighDetailContext.Provider>

        {/* Border labels as 3D text */}
        {config.border_label_north && (
          <Text position={[0, 0.5, -depthM / 2 - 1]} fontSize={0.5} color="#eab308" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="black">
            ↑ {config.border_label_north}
          </Text>
        )}
        {config.border_label_south && (
          <Text position={[0, 0.5, depthM / 2 + 1]} fontSize={0.5} color="white" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="black">
            ↓ {config.border_label_south}
          </Text>
        )}
      </Canvas>
    </div>
  )
}
