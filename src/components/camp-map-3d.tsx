'use client'

import React, { useRef, useEffect, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html, ContactShadows, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { FloorplanConfigRow, FloorplanObjectRow, CampSpotWithReservation, CamperRow, RoofShape } from '@/types/database'
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
function useHipRoofGeometry(w: number, d: number, h: number) {
  const geo = useMemo(() => {
    const hw = w / 2, hd = d / 2
    const v = new Float32Array([
      -hw, 0, -hd,  hw, 0, -hd,  0, h, 0,
       hw, 0, -hd,  hw, 0,  hd,  0, h, 0,
       hw, 0,  hd, -hw, 0,  hd,  0, h, 0,
      -hw, 0,  hd, -hw, 0, -hd,  0, h, 0,
    ])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(v, 3))
    g.computeVertexNormals()
    return g
  }, [w, d, h])
  useEffect(() => () => { geo.dispose() }, [geo])
  return geo
}

// Gable / ridge roof: two slopes facing ±x with closed gable ends on ±z.
function useRidgeRoofGeometry(w: number, d: number, h: number) {
  const geo = useMemo(() => {
    const hw = w / 2, hd = d / 2
    const v = new Float32Array([
      // left slope
      -hw, 0, -hd,  -hw, 0, hd,  0, h, hd,
      -hw, 0, -hd,   0, h, hd,   0, h, -hd,
      // right slope
       hw, 0, -hd,   0, h, hd,   hw, 0, hd,
       hw, 0, -hd,   0, h, -hd,  0, h, hd,
      // front gable
      -hw, 0, hd,    hw, 0, hd,  0, h, hd,
      // back gable
       hw, 0, -hd,  -hw, 0, -hd, 0, h, -hd,
    ])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(v, 3))
    g.computeVertexNormals()
    return g
  }, [w, d, h])
  useEffect(() => () => { geo.dispose() }, [geo])
  return geo
}

// ─── Reusable tent door (fabric doorway flap on a tent face) ──
function TentDoor({ width, height, faceDepth, back = false, arch = true, frameColor }: { width: number; height: number; faceDepth: number; back?: boolean; arch?: boolean; frameColor?: THREE.Color }) {
  const z = back ? -faceDepth : faceDepth
  // The door reads as a recessed fabric opening framed by the tent material,
  // not a free-standing black slab.
  const surround = frameColor ?? new THREE.Color('#43474b')
  return (
    <group position={[0, 0, z]} rotation={[0, back ? Math.PI : 0, 0]}>
      {/* Fabric flap surround (tent material) */}
      <mesh position={[0, height * 0.54, 0.004]}>
        <planeGeometry args={[width * 1.18, height * 1.12]} />
        <meshStandardMaterial color={surround} roughness={0.88} side={THREE.DoubleSide} />
      </mesh>
      {/* Recessed opening (shaded interior) */}
      <mesh position={[0, height / 2, 0.006]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#2c2f33" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {arch && (
        <mesh position={[0, height, 0.006]}>
          <circleGeometry args={[width / 2, 14, 0, Math.PI]} />
          <meshStandardMaterial color="#2c2f33" roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Zipper seam */}
      <mesh position={[0, height / 2, 0.009]}>
        <boxGeometry args={[0.01, height * 0.92, 0.004]} />
        <meshStandardMaterial color="#d8b53a" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  )
}

// ─── Reusable tent window (mesh-screen panel) ───────────────
function TentWindow({ position, width, height, rotY = 0 }: { position: [number, number, number]; width: number; height: number; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#16242c" transparent opacity={0.5} roughness={0.25} metalness={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.003]}>
        <boxGeometry args={[width, 0.008, 0.004]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.3} roughness={0.6} />
      </mesh>
    </group>
  )
}

// ─── Shiftpod (faceted insulated silver dome) ───────────────
function ShiftpodTent({ widthM, depthM, heightM, color, backDoor }: TentStyleProps) {
  const tc = hexToThreeColor(color)
  // Iconic reflective silver shell — blend hue toward silver but keep enough
  // of the assigned color so builder/camper coding still reads.
  const shell = tc.clone().lerp(new THREE.Color('#d3d7db'), 0.62)
  const r = 0.5
  const baseH = heightM * 0.46
  const domeH = heightM - baseH
  const sx = widthM / (2 * r), sz = depthM / (2 * r)
  const doorW = Math.min(widthM, depthM) * 0.3
  const doorH = baseH * 0.92
  return (
    <group>
      {/* Octagonal insulated base — tall enough for the doorway */}
      <mesh castShadow receiveShadow position={[0, baseH / 2, 0]} scale={[sx, 1, sz]}>
        <cylinderGeometry args={[r, r, baseH, 8]} />
        <meshStandardMaterial color={shell} roughness={0.5} metalness={0.5} flatShading />
      </mesh>
      {/* Faceted blunt dome roof (truncated octagon, not a sharp point) */}
      <mesh castShadow receiveShadow position={[0, baseH, 0]} scale={[sx, 1, sz]}>
        <cylinderGeometry args={[r * 0.22, r, domeH, 8]} />
        <meshStandardMaterial color={shell.clone().multiplyScalar(1.06)} roughness={0.45} metalness={0.55} flatShading />
      </mesh>
      {/* Top vent cap */}
      <mesh position={[0, heightM, 0]} scale={[sx, 1, sz]}>
        <cylinderGeometry args={[r * 0.22, r * 0.22, heightM * 0.05, 8]} />
        <meshStandardMaterial color="#3a3d40" roughness={0.6} metalness={0.4} />
      </mesh>
      <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 * 0.99} arch frameColor={shell.clone().multiplyScalar(0.82)} />
      {backDoor && <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 * 0.99} back arch frameColor={shell.clone().multiplyScalar(0.82)} />}
      {/* Round porthole window on the base side */}
      <mesh position={[widthM / 2 * 0.99, baseH * 0.62, 0]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[Math.min(widthM, depthM) * 0.07, 16]} />
        <meshStandardMaterial color="#16242c" transparent opacity={0.5} roughness={0.2} metalness={0.3} />
      </mesh>
      <GroundSheet widthM={widthM} depthM={depthM} color={tc.clone().multiplyScalar(0.45)} />
    </group>
  )
}

// ─── No Bake Tent (reflective insulated dome on a wall) ─────
function NoBakeTent({ widthM, depthM, heightM, color, backDoor }: TentStyleProps) {
  const tc = hexToThreeColor(color)
  const shell = tc.clone().lerp(new THREE.Color('#eef1f3'), 0.7)
  const r = 0.5
  const wallH = heightM * 0.34
  const domeH = heightM - wallH
  const doorW = Math.min(widthM, depthM) * 0.3
  const doorH = wallH * 0.94
  return (
    <group>
      {/* Insulated vertical wall — gives the doorway a surface to sit on */}
      <mesh castShadow receiveShadow position={[0, wallH / 2, 0]} scale={[widthM / (2 * r), 1, depthM / (2 * r)]}>
        <cylinderGeometry args={[r, r, wallH, 24]} />
        <meshStandardMaterial color={shell} roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Reflective domed roof */}
      <mesh castShadow receiveShadow position={[0, wallH, 0]} scale={[widthM, domeH * 2, depthM]}>
        <sphereGeometry args={[r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={shell.clone().multiplyScalar(1.03)} roughness={0.35} metalness={0.45} side={THREE.DoubleSide} />
      </mesh>
      {/* Roof vent */}
      <mesh position={[0, heightM * 0.97, 0]}>
        <cylinderGeometry args={[Math.min(widthM, depthM) * 0.07, Math.min(widthM, depthM) * 0.07, heightM * 0.05, 10]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.5} roughness={0.5} />
      </mesh>
      <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 * 0.95} arch frameColor={shell.clone().multiplyScalar(0.85)} />
      {backDoor && <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 * 0.95} back arch frameColor={shell.clone().multiplyScalar(0.85)} />}
      <TentWindow position={[widthM / 2 * 0.95, wallH * 0.6, 0]} width={depthM * 0.24} height={wallH * 0.5} rotY={Math.PI / 2} />
      <GroundSheet widthM={widthM} depthM={depthM} color={tc.clone().multiplyScalar(0.5)} />
    </group>
  )
}

// ─── Canvas wall tent (Kodiak Flex-Bow style) ───────────────
function CanvasTent({ widthM, depthM, heightM, color, backDoor }: TentStyleProps) {
  const tc = hexToThreeColor(color)
  const canvas = tc.clone().lerp(new THREE.Color('#cdbb90'), 0.55)
  const wallH = heightM * 0.5
  const ridgeH = heightM * 0.5
  const roofGeo = useRidgeRoofGeometry(widthM, depthM, ridgeH)
  const doorW = Math.min(widthM, depthM) * 0.3
  const doorH = wallH * 0.9
  return (
    <group>
      {/* Canvas walls */}
      <mesh castShadow receiveShadow position={[0, wallH / 2, 0]}>
        <boxGeometry args={[widthM, wallH, depthM]} />
        <meshStandardMaterial color={canvas} roughness={0.95} metalness={0} />
      </mesh>
      {/* Peaked canvas roof */}
      <mesh castShadow receiveShadow geometry={roofGeo} position={[0, wallH, 0]}>
        <meshStandardMaterial color={canvas.clone().multiplyScalar(0.9)} roughness={0.95} side={THREE.DoubleSide} flatShading />
      </mesh>
      {/* Awning over the front door */}
      <mesh castShadow position={[0, wallH * 0.92, depthM / 2 + depthM * 0.16]} rotation={[Math.PI / 2.6, 0, 0]}>
        <planeGeometry args={[doorW * 1.7, depthM * 0.38]} />
        <meshStandardMaterial color={canvas.clone().multiplyScalar(1.05)} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {[-doorW * 0.8, doorW * 0.8].map((sx, i) => (
        <mesh key={i} castShadow position={[sx, wallH * 0.45, depthM / 2 + depthM * 0.3]}>
          <cylinderGeometry args={[0.02, 0.02, wallH * 0.9, 6]} />
          <meshStandardMaterial color="#8a6a3a" roughness={0.7} />
        </mesh>
      ))}
      <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 + 0.004} arch={false} />
      {backDoor && <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 + 0.004} back arch={false} />}
      <TentWindow position={[widthM / 2 + 0.005, wallH * 0.62, 0]} width={depthM * 0.24} height={wallH * 0.34} rotY={Math.PI / 2} />
      <GroundSheet widthM={widthM} depthM={depthM} color={canvas.clone().multiplyScalar(0.5)} />
    </group>
  )
}

// ─── Cabin / instant tent (Coleman, REI Kingdom) ────────────
function CabinTent({ widthM, depthM, heightM, color, backDoor }: TentStyleProps) {
  const tc = hexToThreeColor(color)
  const wallH = heightM * 0.55
  const roofH = heightM * 0.45
  const roofGeo = useHipRoofGeometry(widthM, depthM, roofH)
  const doorW = Math.min(widthM, depthM) * 0.32
  const doorH = wallH * 0.88
  const winW = depthM * 0.26
  const winH = wallH * 0.4
  return (
    <group>
      {/* Vertical fabric walls */}
      <mesh castShadow receiveShadow position={[0, wallH / 2, 0]}>
        <boxGeometry args={[widthM, wallH, depthM]} />
        <meshStandardMaterial color={tc} roughness={0.85} metalness={0} />
      </mesh>
      {/* Tall hip roof */}
      <mesh castShadow receiveShadow geometry={roofGeo} position={[0, wallH, 0]}>
        <meshStandardMaterial color={tc.clone().multiplyScalar(0.82)} roughness={0.9} metalness={0} flatShading side={THREE.DoubleSide} />
      </mesh>
      <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 + 0.004} arch={false} frameColor={tc.clone().multiplyScalar(0.62)} />
      {backDoor && <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 + 0.004} back arch={false} frameColor={tc.clone().multiplyScalar(0.62)} />}
      <TentWindow position={[widthM / 2 + 0.005, wallH * 0.58, 0]} width={winW} height={winH} rotY={Math.PI / 2} />
      <TentWindow position={[-widthM / 2 - 0.005, wallH * 0.58, 0]} width={winW} height={winH} rotY={-Math.PI / 2} />
      <GroundSheet widthM={widthM} depthM={depthM} color={tc.clone().multiplyScalar(0.5)} />
    </group>
  )
}

// ─── Classic dome tent (default for unknown make/model) ─────
function DomeTent({ widthM, depthM, heightM, color, backDoor }: TentStyleProps) {
  const tc = hexToThreeColor(color)
  const r = 0.5
  const wallH = heightM * 0.4
  const domeH = heightM - wallH
  const doorW = Math.min(widthM, depthM) * 0.32
  const doorH = wallH * 0.96
  return (
    <group>
      {/* Short vertical fabric wall — the door & windows attach here */}
      <mesh castShadow receiveShadow position={[0, wallH / 2, 0]} scale={[widthM / (2 * r), 1, depthM / (2 * r)]}>
        <cylinderGeometry args={[r * 0.97, r, wallH, 24]} />
        <meshStandardMaterial color={tc} roughness={0.82} metalness={0} />
      </mesh>
      {/* Domed canopy on top */}
      <mesh castShadow receiveShadow position={[0, wallH, 0]} scale={[widthM, domeH * 2, depthM]}>
        <sphereGeometry args={[r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={tc.clone().multiplyScalar(0.96)} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Arched support ribs over the dome */}
      {[{ rot: 0, span: widthM }, { rot: Math.PI / 2, span: depthM }].map(({ rot, span }, i) => (
        <mesh key={i} position={[0, wallH, 0]} rotation={[0, rot, 0]} scale={[span / (2 * r), domeH / r, 1]}>
          <torusGeometry args={[r, 0.01, 6, 18, Math.PI]} />
          <meshStandardMaterial color="#5b6066" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 * 0.95} arch frameColor={tc.clone().multiplyScalar(0.7)} />
      {backDoor && <TentDoor width={doorW} height={doorH} faceDepth={depthM / 2 * 0.95} back arch frameColor={tc.clone().multiplyScalar(0.7)} />}
      <TentWindow position={[widthM / 2 * 0.95, wallH * 0.58, 0]} width={depthM * 0.26} height={wallH * 0.5} rotY={Math.PI / 2} />
      <GroundSheet widthM={widthM} depthM={depthM} color={tc.clone().multiplyScalar(0.55)} />
    </group>
  )
}

// Shared ground sheet under every tent.
function GroundSheet({ widthM, depthM, color }: { widthM: number; depthM: number; color: THREE.Color }) {
  return (
    <mesh receiveShadow position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[widthM * 1.04, depthM * 1.04]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  )
}

interface TentStyleProps {
  widthM: number
  depthM: number
  heightM: number
  color: string
  backDoor: boolean
}

// ─── Tent (brand-aware dispatcher) ──────────────────────────
function Tent3D({ obj, widthM, depthM, heightM, color }: { obj: FloorplanObjectRow; widthM: number; depthM: number; heightM: number; color: string }) {
  const style = classifyTentStyle(obj.properties?.tent_make_model)
  const entranceCount = obj.properties?.entrance_count ?? 1
  const backDoor = entranceCount >= 2 || obj.properties?.entrance_side === 'both'
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

  // Shade sail: just a thin translucent off-white sail at canopy height — no posts.
  if (obj.object_type === 'shade_sail') {
    const sailColor = obj.color && obj.color.toLowerCase() !== '#93c5fd' ? obj.color : '#f5f0e6'
    return (
      <group>
        <mesh
          castShadow
          receiveShadow
          position={[0, heightM, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[widthM, depthM, 1, 1]} />
          <meshStandardMaterial
            color={sailColor}
            side={THREE.DoubleSide}
            transparent
            opacity={0.35}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      </group>
    )
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
            <cylinderGeometry args={[postRadius, postRadius, heightM, 8]} />
            <meshStandardMaterial
              color={p.shared ? '#d97706' : '#555555'}
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
        ))}
        {/* Thin translucent canopy on top */}
        <mesh castShadow receiveShadow position={[0, heightM, 0]}>
          <boxGeometry args={[widthM, 0.05, depthM]} />
          <meshStandardMaterial color={threeColor} roughness={0.6} metalness={0.0} transparent opacity={0.45} />
        </mesh>
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
  return (
    <group>
      {/* Main body */}
      <mesh castShadow receiveShadow position={[0, heightM / 2, 0]}>
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshStandardMaterial color={threeColor} roughness={0.8} metalness={0.1} />
      </mesh>

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
  spots,
  camper,
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
  spots: CampSpotWithReservation[]
  camper: CamperRow | null
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

  // Check reservation status
  const spot = obj.properties?.reservable
    ? spots.find(s => s.floorplan_object_id === obj.id || (Math.abs(s.x_position - obj.x) < 5 && Math.abs(s.y_position - obj.y) < 5))
    : null

  const hasModel = !!obj.properties?.meshy_model_url
  const modelUrl = obj.properties?.meshy_model_url as string | undefined

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
  else if (spot && spot.reservations.length === 0) ringColor = '#10b981'
  else if (spot && camper && spot.reservations.some(r => r.camper_id === camper.id)) ringColor = '#eab308'
  else if (spot && spot.reservations.length >= spot.max_occupants) ringColor = '#ef4444'
  else if (spot && spot.reservations.length > 0) ringColor = '#f97316' // orange — joinable

  return (
    <group
      ref={groupRef}
      position={[posX, 0, posZ]}
      rotation={[0, -(obj.rotation * Math.PI) / 180, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(obj) }}
      onPointerEnter={(e) => { e.stopPropagation(); onHover(obj.id); document.body.style.cursor = 'pointer' }}
      onPointerLeave={() => { onHover(null); document.body.style.cursor = 'auto' }}
    >
      {/* Selection / reservation ring on ground */}
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
          color={obj.color}
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
            color={obj.color}
            roofShape={roofShape}
            shadePosts={shadePosts}
          />
        )}
      </Suspense>

      {/* Floating label */}
      {showLabels && (
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
          {obj.label || obj.object_type.replace(/_/g, ' ')}
          {camper && spot?.reservations.some(r => r.camper_id === camper.id) && ' ⭐'}
        </Html>
      )}
    </group>
  )
}

// ─── Grid restricted to camp boundary ──────────────────────────
function BoundaryGrid({ widthM, depthM, gridSize }: { widthM: number; depthM: number; gridSize: number }) {
  const gridTexture = useMemo(() => {
    const cellPx = 64
    const cols = Math.max(1, Math.round(widthM / gridSize))
    const rows = Math.max(1, Math.round(depthM / gridSize))
    const canvasW = cols * cellPx
    const canvasH = rows * cellPx
    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f5e6c8'
    ctx.fillRect(0, 0, canvasW, canvasH)
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'
    ctx.lineWidth = 1
    for (let c = 0; c <= cols; c++) {
      const x = c * cellPx
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasH); ctx.stroke()
    }
    for (let r = 0; r <= rows; r++) {
      const y = r * cellPx
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasW, y); ctx.stroke()
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    tex.minFilter = THREE.LinearFilter
    return tex
  }, [widthM, depthM, gridSize])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
      <planeGeometry args={[widthM, depthM]} />
      <meshStandardMaterial map={gridTexture} roughness={0.9} metalness={0} />
    </mesh>
  )
}

// ─── Ground Plane ──────────────────────────────────────────────
function GroundPlane({ widthM, depthM, gridSize }: { widthM: number; depthM: number; gridSize: number }) {
  return (
    <group>
      {/* Outer flat ground (no grid) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[widthM * 3, depthM * 3]} />
        <meshStandardMaterial color="#e8d5a3" roughness={1} metalness={0} />
      </mesh>

      {/* Camp boundary with grid lines */}
      <BoundaryGrid widthM={widthM} depthM={depthM} gridSize={gridSize} />
    </group>
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
  spots: CampSpotWithReservation[]
  camper: CamperRow | null
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
  spots,
  camper,
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

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{ fov: 50, near: 0.1, far: 1000 }}
        style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #B8D4E3 40%, #E8D5A3 100%)' }}
        onPointerMissed={() => onSelectObject(null as unknown as FloorplanObjectRow)}
      >
        <CameraSetup widthM={widthM} depthM={depthM} />
        <OrbitControls
          makeDefault
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={2}
          maxDistance={Math.max(widthM, depthM) * 2}
          enableDamping
          dampingFactor={0.05}
        />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[widthM * 0.5, widthM * 0.8, -depthM * 0.3]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={widthM * 3}
          shadow-camera-left={-widthM}
          shadow-camera-right={widthM}
          shadow-camera-top={depthM}
          shadow-camera-bottom={-depthM}
        />
        <hemisphereLight color="#87CEEB" groundColor="#E8D5A3" intensity={0.3} />

        {/* Ground */}
        <GroundPlane widthM={widthM} depthM={depthM} gridSize={gridSizeM} />

        {/* Contact shadows for extra realism */}
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.4}
          scale={Math.max(widthM, depthM) * 1.5}
          blur={2}
          far={10}
        />

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
            spots={spots}
            camper={camper}
            shadePosts={shadePostsByObj.get(obj.id)}
          />
        ))}

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
