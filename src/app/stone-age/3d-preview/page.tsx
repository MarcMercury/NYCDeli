'use client'

// TEMPORARY visual-verification harness for the 3D map renderer.
// ?set=vehicles | small | tents | all — each set gets a tight config so the
// default camera framing lands close to the objects under review.
import React from 'react'
import { CampMap3D } from '@/components/camp-map-3d'
import type { FloorplanConfigRow, FloorplanObjectRow } from '@/types/database'

function makeConfig(width_ft: number, length_ft: number): FloorplanConfigRow {
  return {
    id: 'preview',
    name: 'Preview',
    width_ft,
    length_ft,
    grid_size_ft: 10,
    border_label_north: '',
    border_label_south: '',
    is_active: true,
    created_at: '',
    updated_at: '',
  } as unknown as FloorplanConfigRow
}

let n = 0
function obj(o: Partial<FloorplanObjectRow>): FloorplanObjectRow {
  return {
    id: `o${n++}`,
    floorplan_id: 'preview',
    object_type: 'tent',
    label: '',
    x: 0,
    y: 0,
    width_ft: 10,
    height_ft: 10,
    rotation: 0,
    color: '#f59e0b',
    z_index: 0,
    is_locked: false,
    parent_id: null,
    properties: {},
    created_at: '',
    updated_at: '',
    ...o,
  } as unknown as FloorplanObjectRow
}

const SETS: Record<string, { config: FloorplanConfigRow; objects: FloorplanObjectRow[] }> = {
  vehicles: {
    config: makeConfig(70, 60),
    objects: [
      obj({ object_type: 'refrigerated_truck', x: 16, y: 6, width_ft: 34, height_ft: 12, color: '#60a5fa', properties: { elevation_ft: 12 } }),
      obj({ object_type: 'pc_container', x: 8, y: 24, width_ft: 52, height_ft: 12, color: '#dc2626', label: 'Bike Trailer', properties: { elevation_ft: 12, description: 'Bike Rental Trailer' } }),
      obj({ object_type: 'generator', x: 20, y: 42, width_ft: 26, height_ft: 10, color: '#facc15', properties: { elevation_ft: 7 } }),
    ],
  },
  truck: {
    config: makeConfig(46, 34),
    objects: [
      obj({ object_type: 'refrigerated_truck', x: 6, y: 11, width_ft: 34, height_ft: 12, color: '#60a5fa', properties: { elevation_ft: 12 } }),
    ],
  },
  trailerRear: {
    config: makeConfig(100, 60),
    objects: [
      obj({ object_type: 'pc_container', x: 24, y: 24, width_ft: 52, height_ft: 12, rotation: 180, color: '#dc2626', label: 'Bike Trailer', properties: { elevation_ft: 12 } }),
    ],
  },
  small: {
    config: makeConfig(34, 24),
    objects: [
      obj({ object_type: 'porta_potty', x: 4, y: 8, width_ft: 8, height_ft: 8, color: '#64748b', properties: { elevation_ft: 7 } }),
      obj({ object_type: 'swamp_cooler', x: 16, y: 9, width_ft: 4, height_ft: 4, color: '#67e8f9', properties: { elevation_ft: 5 } }),
      obj({ object_type: 'swamp_cooler', x: 24, y: 9, width_ft: 4, height_ft: 4, color: '#67e8f9', rotation: 40, properties: { elevation_ft: 5 } }),
      obj({ object_type: 'generator', x: 15, y: 16, width_ft: 6, height_ft: 4, color: '#facc15', label: 'Distro 4' }),
    ],
  },
  tents: {
    config: makeConfig(110, 80),
    objects: [
      obj({ object_type: 'common_area', x: 6, y: 8, width_ft: 60, height_ft: 23, color: '#86efac', label: 'NYC Chill Tent', properties: { elevation_ft: 14, roof_shape: 'a_frame' } }),
      obj({ object_type: 'common_area', x: 80, y: 8, width_ft: 20, height_ft: 60, color: '#86efac', label: 'Public Chill', properties: { elevation_ft: 14, roof_shape: 'a_frame' } }),
      obj({ object_type: 'tent', x: 10, y: 46, width_ft: 10, height_ft: 10, color: '#f59e0b', properties: { tent_make_model: 'Shiftpod 2' } }),
      obj({ object_type: 'tent', x: 26, y: 46, width_ft: 10, height_ft: 10, color: '#ef4444', properties: { tent_make_model: 'Kodiak Flex-Bow' } }),
    ],
  },
}

SETS.all = {
  config: makeConfig(200, 150),
  objects: [
    ...SETS.vehicles.objects.map(o => obj({ ...o, id: `a${n++}`, x: o.x + 10, y: o.y + 6 })),
    ...SETS.small.objects.map(o => obj({ ...o, id: `b${n++}`, x: o.x + 90, y: o.y + 60 })),
    ...SETS.tents.objects.map(o => obj({ ...o, id: `c${n++}`, x: o.x + 80, y: o.y + 70 })),
  ],
}

export default function Preview() {
  const [set, setSet] = React.useState('all')

  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('set')
    if (q && SETS[q]) setSet(q)
  }, [])

  const active = SETS[set]

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CampMap3D
        config={active.config}
        objects={active.objects}
        selectedObjectId={null}
        hoveredObjectId={null}
        showLabels={false}
        onSelectObject={() => {}}
        onHoverObject={() => {}}
        onGenerate3DModel={() => {}}
      />
    </div>
  )
}
