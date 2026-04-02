'use client'

import React, { useRef, useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html, Environment, ContactShadows, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { FloorplanConfigRow, FloorplanObjectRow, CampSpotWithReservation, CamperRow, RoofShape } from '@/types/database'

// ─── Color Helpers ─────────────────────────────────────────────
function hexToThreeColor(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

function getDefaultElevation(type: string): number {
  const heights: Record<string, number> = {
    shade_structure: 12, tent: 7, kitchen: 10, bar: 10, stage: 8,
    common_area: 10, refrigerated_truck: 10, shower_container: 9,
    pc_container: 9, rv: 10, vehicle: 5, generator: 4, porta_potty: 8,
    water_station: 3, first_aid: 8, storage: 6, prep_area: 8,
    service_area: 8, fuel_storage: 3, propane_storage: 3,
    fire_extinguisher: 2, fire_pit: 1, grill: 4, flame_effect: 3,
    fence: 6, sign: 5, entrance: 8, bike_parking: 3, table: 3,
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

// ─── Fallback Procedural Object ────────────────────────────────
function ProceduralObject({
  obj,
  widthM,
  depthM,
  heightM,
  color,
  roofShape,
}: {
  obj: FloorplanObjectRow
  widthM: number
  depthM: number
  heightM: number
  color: string
  roofShape: RoofShape
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

  // Shade structures: open canopy with 4 corner poles (no solid box body)
  if (obj.object_type === 'shade_structure') {
    const postRadius = 0.04
    return (
      <group>
        {/* 4 corner poles */}
        {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz], i) => (
          <mesh key={i} castShadow position={[sx * widthM * 0.47, heightM / 2, sz * depthM * 0.47]}>
            <cylinderGeometry args={[postRadius, postRadius, heightM, 8]} />
            <meshStandardMaterial color="#555555" metalness={0.9} roughness={0.2} />
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

      {roofShape === 'a_frame' && (
        <mesh castShadow position={[0, heightM, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[widthM * 1.05, Math.min(widthM, depthM) * 0.3, depthM * 1.05]} />
          <meshStandardMaterial color={darkerColor} roughness={0.7} />
        </mesh>
      )}

      {roofShape === 'dome' && (
        <mesh castShadow position={[0, heightM, 0]}>
          <sphereGeometry args={[Math.max(widthM, depthM) * 0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={lighterColor} roughness={0.5} metalness={0.1} />
        </mesh>
      )}

      {/* Fire pit glow */}
      {obj.object_type === 'fire_pit' && (
        <pointLight
          position={[0, heightM + 0.5, 0]}
          color="#ff6600"
          intensity={2}
          distance={widthM * 3}
          castShadow={false}
        />
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
  else if (spot && !spot.reservation) ringColor = '#10b981'
  else if (spot?.reservation && camper && spot.reservation.camper_id === camper.id) ringColor = '#eab308'
  else if (spot?.reservation) ringColor = '#ef4444'

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
          {spot?.reservation?.camper_id === camper?.id && ' ⭐'}
        </Html>
      )}
    </group>
  )
}

// ─── Ground Plane ──────────────────────────────────────────────
function GroundPlane({ widthM, depthM, gridSize }: { widthM: number; depthM: number; gridSize: number }) {
  return (
    <group>
      {/* Main ground */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[widthM * 1.5, depthM * 1.5]} />
        <meshStandardMaterial color="#e8d5a3" roughness={1} metalness={0} />
      </mesh>

      {/* Camp boundary */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[widthM, depthM]} />
        <meshStandardMaterial color="#f5e6c8" roughness={0.9} metalness={0} />
      </mesh>

      {/* Grid lines */}
      <gridHelper
        args={[Math.max(widthM, depthM) * 1.2, Math.round(Math.max(widthM, depthM) / gridSize), '#00000022', '#00000011']}
        position={[0, 0.01, 0]}
      />
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
