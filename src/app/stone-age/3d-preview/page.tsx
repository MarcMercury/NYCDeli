'use client'

// TEMPORARY visual-verification harness for the 3D map renderer.
import { CampMap3D } from '@/components/camp-map-3d'
import type { FloorplanConfigRow, FloorplanObjectRow } from '@/types/database'

const config = {
  id: 'preview',
  name: 'Preview',
  width_ft: 200,
  length_ft: 150,
  grid_size_ft: 10,
  border_label_north: '7:30 & Esplanade',
  border_label_south: 'Camp Frontage',
  is_active: true,
  created_at: '',
  updated_at: '',
} as unknown as FloorplanConfigRow

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

const makes = ['Shiftpod 2', 'No Bake Tent', 'Kodiak Flex-Bow', 'Coleman Cabin', '']
const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#a855f7']

const objects: FloorplanObjectRow[] = [
  obj({ object_type: 'shade_structure', x: 10, y: 10, width_ft: 50, height_ft: 30, color: '#93c5fd', label: 'Shade' }),
  ...Array.from({ length: 15 }, (_, i) =>
    obj({
      object_type: 'tent',
      x: 12 + (i % 5) * 12,
      y: 14 + Math.floor(i / 5) * 12,
      width_ft: 9,
      height_ft: 8,
      color: colors[i % colors.length],
      properties: { tent_make_model: makes[i % makes.length], entrance_count: 1 },
    })
  ),
  obj({ object_type: 'kitchen', x: 80, y: 20, width_ft: 30, height_ft: 20, color: '#fbbf24', label: 'Kitchen' }),
  obj({ object_type: 'rv', x: 130, y: 20, width_ft: 30, height_ft: 10, color: '#e5e7eb', label: 'RV' }),
  obj({ object_type: 'pc_container', x: 80, y: 60, width_ft: 20, height_ft: 8, color: '#dc2626', label: 'Container' }),
  obj({ object_type: 'generator', x: 130, y: 60, width_ft: 8, height_ft: 6, color: '#6b7280' }),
  obj({ object_type: 'porta_potty', x: 150, y: 60, width_ft: 4, height_ft: 4, color: '#22c55e' }),
  obj({ object_type: 'shade_sail', x: 20, y: 90, width_ft: 30, height_ft: 20, color: '#f5f0e6' }),
  obj({ object_type: 'fire_lane', x: 0, y: 130, width_ft: 200, height_ft: 20, color: '#ef4444' }),
]

export default function Preview() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CampMap3D
        config={config}
        objects={objects}
        selectedObjectId={null}
        hoveredObjectId={null}
        onSelectObject={() => {}}
        onHoverObject={() => {}}
        onGenerate3DModel={() => {}}
      />
    </div>
  )
}
