'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Select } from '@/components/ui'
import type { FloorplanObjectRow, FloorplanObjectType } from '@/types/database'
import { getTemplateForType, OBJECT_TEMPLATES } from './object-templates'

// Types that have BRC-specific properties
const FUEL_TYPES = new Set(['fuel_storage', 'propane_storage'])
const PC_TYPES = new Set(['pc_container'])
const RV_TYPES = new Set(['rv'])
const TENT_TYPES = new Set(['tent'])
const ROAD_TYPES = new Set(['road'])
const SIGN_TYPES = new Set(['sign'])
const NEIGHBOR_TYPES = new Set(['neighbor_zone'])
const DISTANCE_TYPES = new Set(['distance_marker'])
const EXTINGUISHER_TYPES = new Set(['fire_extinguisher'])

interface PropertiesPanelProps {
  selectedObject: FloorplanObjectRow | null
  allObjects: FloorplanObjectRow[]
  onUpdateObject: (id: string, updates: Partial<FloorplanObjectRow>) => void
  onDeleteObject: (id: string) => void
  onDuplicateObject: (id: string) => void
  onLockToggle: (id: string) => void
  onBringForward: (id: string) => void
  onSendBackward: (id: string) => void
  onSetParent: (childId: string, parentId: string | null) => void
}

export function PropertiesPanel({
  selectedObject,
  allObjects,
  onUpdateObject,
  onDeleteObject,
  onDuplicateObject,
  onLockToggle,
  onBringForward,
  onSendBackward,
  onSetParent,
}: PropertiesPanelProps) {
  const [editingResponsibility, setEditingResponsibility] = useState('')

  if (!selectedObject) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-8">
            Select an object on the grid to edit its properties
          </p>
        </CardContent>
      </Card>
    )
  }

  const template = getTemplateForType(selectedObject.object_type)
  const children = allObjects.filter(o => o.parent_id === selectedObject.id)
  const parentCandidates = allObjects.filter(
    o => o.id !== selectedObject.id && o.parent_id !== selectedObject.id
  )

  function updateProp(key: string, value: unknown) {
    onUpdateObject(selectedObject!.id, {
      properties: { ...selectedObject!.properties, [key]: value },
    } as Partial<FloorplanObjectRow>)
  }

  function addResponsibility() {
    if (!editingResponsibility.trim()) return
    const current = selectedObject!.properties?.responsibilities || []
    updateProp('responsibilities', [...current, editingResponsibility.trim()])
    setEditingResponsibility('')
  }

  function removeResponsibility(index: number) {
    const current = selectedObject!.properties?.responsibilities || []
    updateProp(
      'responsibilities',
      current.filter((_: string, i: number) => i !== index)
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{template?.icon || '📦'}</span>
          <span className="truncate">{selectedObject.label || template?.label || 'Object'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
            Basic Info
          </p>
          <div className="space-y-2">
            <Input
              label="Label"
              value={selectedObject.label}
              onChange={e => onUpdateObject(selectedObject.id, { label: e.target.value })}
            />
            <Select
              label="Type"
              value={selectedObject.object_type}
              onChange={e => {
                const newType = e.target.value as FloorplanObjectType
                const tmpl = getTemplateForType(newType)
                onUpdateObject(selectedObject.id, {
                  object_type: newType,
                  color: tmpl?.defaultColor || selectedObject.color,
                })
              }}
              options={OBJECT_TEMPLATES.map(t => ({
                value: t.type,
                label: `${t.icon} ${t.label}`,
              }))}
            />
            {/* Description — prominent placement */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                value={selectedObject.properties?.description || ''}
                onChange={e => updateProp('description', e.target.value)}
                className="w-full px-3 py-2 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[60px] resize-y"
                placeholder="Describe this object or area..."
              />
            </div>
            {selectedObject.is_locked && <Badge variant="warning">Locked</Badge>}
          </div>
        </div>

        {/* Position & Size */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
            Position & Size
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="X (ft)"
              type="number"
              value={selectedObject.x}
              onChange={e => onUpdateObject(selectedObject.id, { x: Number(e.target.value) })}
            />
            <Input
              label="Y (ft)"
              type="number"
              value={selectedObject.y}
              onChange={e => onUpdateObject(selectedObject.id, { y: Number(e.target.value) })}
            />
            <Input
              label="Width (ft)"
              type="number"
              min={1}
              value={selectedObject.width_ft}
              onChange={e => onUpdateObject(selectedObject.id, { width_ft: Number(e.target.value) })}
              helpText="Footprint side along X (how wide)"
            />
            <Input
              label="Length (ft)"
              type="number"
              min={1}
              value={selectedObject.height_ft}
              onChange={e => onUpdateObject(selectedObject.id, { height_ft: Number(e.target.value) })}
              helpText="Footprint side along Y (how long / deep)"
            />
          </div>
          <div className="mt-2">
            <Input
              label="Rotation (deg)"
              type="number"
              min={0}
              max={360}
              step={15}
              value={selectedObject.rotation}
              onChange={e => onUpdateObject(selectedObject.id, { rotation: Number(e.target.value) })}
            />
          </div>
        </div>

        {/* Appearance */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
            Appearance
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold">Color</label>
            <input
              type="color"
              value={selectedObject.color}
              onChange={e => onUpdateObject(selectedObject.id, { color: e.target.value })}
              className="w-8 h-8 border-2 border-black cursor-pointer"
            />
            <span className="text-xs font-mono text-gray-500">{selectedObject.color}</span>
          </div>
        </div>

        {/* 3D Appearance */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
            3D Appearance
          </p>
          <div className="space-y-2">
            <Input
              label="Height (ft)"
              type="number"
              min={0}
              step={1}
              value={selectedObject.properties?.elevation_ft ?? ''}
              onChange={e => updateProp('elevation_ft', e.target.value ? Number(e.target.value) : undefined)}
              helpText="How tall the structure stands above ground (vertical height, used in 3D view)"
            />
            <Select
              label="Roof Shape"
              value={selectedObject.properties?.roof_shape || ''}
              onChange={e => updateProp('roof_shape', e.target.value || undefined)}
              options={[
                { value: '', label: 'Default (Flat)' },
                { value: 'flat', label: '⬜ Flat' },
                { value: 'pyramid', label: '🔺 Pyramid' },
                { value: 'a_frame', label: '⛺ A-Frame' },
                { value: 'dome', label: '🔵 Dome' },
              ]}
            />
            <p className="text-[9px] text-gray-500">
              These values affect the 3D Birds Eye view on the Camp Map
            </p>
          </div>
        </div>

        {/* Functional Properties */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
            Functions
          </p>
          <div className="space-y-2">
            {/* Reservable toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!selectedObject.properties?.reservable}
                onChange={e => updateProp('reservable', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-bold">Reservable</span>
              <span className="text-[10px] text-gray-500">(users can reserve this)</span>
            </label>

            {/* Capacity */}
            <Input
              label="Capacity"
              type="number"
              min={0}
              value={selectedObject.properties?.capacity || ''}
              onChange={e => updateProp('capacity', e.target.value ? Number(e.target.value) : undefined)}
              helpText="Max number of people"
            />

            {/* Linked To */}
            <Select
              label="Linked System"
              value={selectedObject.properties?.linked_to || ''}
              onChange={e => updateProp('linked_to', e.target.value || undefined)}
              options={[
                { value: '', label: 'None' },
                { value: 'reservations', label: 'Reservation Portal' },
                { value: 'kitchen_shifts', label: 'Kitchen Shifts' },
                { value: 'build_tasks', label: 'Build Tasks' },
                { value: 'schedule', label: 'Schedule' },
              ]}
            />
          </div>
        </div>

        {/* BRC-Specific Properties */}
        {TENT_TYPES.has(selectedObject.object_type) && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
              Tent Opening
            </p>
            <div className="space-y-2">
              <Select
                label="Tent Entrances"
                value={selectedObject.properties?.entrance_count != null ? String(selectedObject.properties.entrance_count) : ''}
                onChange={e => updateProp('entrance_count', e.target.value ? parseInt(e.target.value) : undefined)}
                options={[
                  { value: '', label: 'Not set' },
                  { value: '1', label: '1 Side' },
                  { value: '2', label: '2 Side' },
                  { value: '3', label: '3 Side' },
                  { value: '4', label: '4 Side' },
                ]}
              />
              <Select
                label="Entrance Orientation"
                value={selectedObject.properties?.entrance_side || ''}
                onChange={e => updateProp('entrance_side', e.target.value || undefined)}
                options={[
                  { value: '', label: 'Not set' },
                  { value: 'width', label: 'Short Side' },
                  { value: 'length', label: 'Long Side' },
                  { value: 'both', label: 'Short and Long Sides' },
                ]}
              />
            </div>
          </div>
        )}

        {PC_TYPES.has(selectedObject.object_type) && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
              PC Container Info
            </p>
            <div className="space-y-2">
              <Input
                label="PC Number"
                value={selectedObject.properties?.pc_number || ''}
                onChange={e => updateProp('pc_number', e.target.value)}
                placeholder="e.g. 12345"
              />
              <Select
                label="Door Direction"
                value={selectedObject.properties?.door_direction || ''}
                onChange={e => updateProp('door_direction', e.target.value || undefined)}
                options={[
                  { value: '', label: 'Not set' },
                  { value: 'north', label: 'North' },
                  { value: 'south', label: 'South' },
                  { value: 'east', label: 'East' },
                  { value: 'west', label: 'West' },
                ]}
              />
            </div>
          </div>
        )}

        {FUEL_TYPES.has(selectedObject.object_type) && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
              Fuel Info
            </p>
            <Select
              label="Fuel Type"
              value={selectedObject.properties?.fuel_type || ''}
              onChange={e => updateProp('fuel_type', e.target.value || undefined)}
              options={[
                { value: 'liquid', label: 'Liquid Fuel' },
                { value: 'propane', label: 'Propane / LPG' },
              ]}
            />
            <p className="text-[9px] text-red-600 mt-1">
              Safety zones: 10ft (no combustibles), 20ft (fuel type separation), 50ft (storage-to-storage)
            </p>
          </div>
        )}

        {RV_TYPES.has(selectedObject.object_type) && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
              RV Info
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selectedObject.properties?.needs_pumpout}
                  onChange={e => updateProp('needs_pumpout', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-bold">Needs Pumpout</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selectedObject.properties?.has_generator}
                  onChange={e => updateProp('has_generator', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-bold">Has Generator</span>
              </label>
              {selectedObject.properties?.needs_pumpout && (
                <p className="text-[9px] text-amber-600">
                  Ensure 20ft service access path to road for pumpout trucks
                </p>
              )}
            </div>
          </div>
        )}

        {ROAD_TYPES.has(selectedObject.object_type) && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
              Road Info
            </p>
            <Input
              label="Road Name"
              value={selectedObject.properties?.road_name || ''}
              onChange={e => updateProp('road_name', e.target.value)}
              placeholder="e.g. Esplanade, 3:00 Plaza"
            />
          </div>
        )}

        {SIGN_TYPES.has(selectedObject.object_type) && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
              Sign Text
            </p>
            <Input
              label="Sign Text"
              value={selectedObject.properties?.sign_text || ''}
              onChange={e => updateProp('sign_text', e.target.value)}
              placeholder="Camp name, direction, etc."
            />
          </div>
        )}

        {NEIGHBOR_TYPES.has(selectedObject.object_type) && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
              Neighbor Info
            </p>
            <Input
              label="Neighbor Camp Name"
              value={selectedObject.properties?.neighbor_name || ''}
              onChange={e => updateProp('neighbor_name', e.target.value)}
              placeholder="Preferred neighbor camp"
            />
          </div>
        )}

        {DISTANCE_TYPES.has(selectedObject.object_type) && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
              Distance Marker
            </p>
            <div className="space-y-2">
              <Input
                label="Distance (ft)"
                type="number"
                min={0}
                value={selectedObject.properties?.distance_ft || ''}
                onChange={e => updateProp('distance_ft', e.target.value ? Number(e.target.value) : undefined)}
                helpText="Override auto (defaults to object width)"
              />
              <Input
                label="From Label"
                value={selectedObject.properties?.from_label || ''}
                onChange={e => updateProp('from_label', e.target.value)}
                placeholder="Start reference"
              />
              <Input
                label="To Label"
                value={selectedObject.properties?.to_label || ''}
                onChange={e => updateProp('to_label', e.target.value)}
                placeholder="End reference"
              />
            </div>
          </div>
        )}

        {EXTINGUISHER_TYPES.has(selectedObject.object_type) && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
              Extinguisher Type
            </p>
            <Select
              label="Type"
              value={selectedObject.properties?.ext_type || 'ABC'}
              onChange={e => updateProp('ext_type', e.target.value)}
              options={[
                { value: 'ABC', label: 'ABC (General)' },
                { value: '40B', label: '40-B (Fuel Storage)' },
                { value: 'kitchen', label: 'Kitchen (Wet towel preferred)' },
              ]}
            />
          </div>
        )}

        {/* Responsibilities (for kitchen objects) */}
        {['kitchen', 'grill', 'prep_area', 'service_area'].includes(selectedObject.object_type) && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
              Responsibilities
            </p>
            <div className="space-y-1.5">
              {(selectedObject.properties?.responsibilities || []).map((resp: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="flex-1 text-sm bg-gray-100 px-2 py-1 border border-gray-300">
                    {resp}
                  </span>
                  <button
                    onClick={() => removeResponsibility(i)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold w-5 h-5 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={editingResponsibility}
                  onChange={e => setEditingResponsibility(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addResponsibility()}
                  placeholder="Add responsibility..."
                  className="flex-1 px-2 py-1 text-sm border-2 border-gray-300 focus:outline-none focus:border-black"
                />
                <Button size="sm" onClick={addResponsibility}>+</Button>
              </div>
            </div>
          </div>
        )}

        {/* Parent / Children Hierarchy */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-gray-500">
            Hierarchy
          </p>
          <Select
            label="Parent Object"
            value={selectedObject.parent_id || ''}
            onChange={e => onSetParent(selectedObject.id, e.target.value || null)}
            options={[
              { value: '', label: 'None (top-level)' },
              ...parentCandidates.map(obj => {
                const t = getTemplateForType(obj.object_type)
                return {
                  value: obj.id,
                  label: `${t?.icon || ''} ${obj.label || t?.label || obj.object_type}`,
                }
              }),
            ]}
          />
          {children.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-bold mb-1">Children:</p>
              <div className="space-y-1">
                {children.map(child => {
                  const t = getTemplateForType(child.object_type)
                  return (
                    <div
                      key={child.id}
                      className="text-xs bg-purple-50 border border-purple-200 px-2 py-1 flex items-center gap-1"
                    >
                      <span>{t?.icon}</span>
                      <span>{child.label || t?.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t-2 border-gray-200 pt-3 space-y-2">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => onLockToggle(selectedObject.id)} className="flex-1">
              {selectedObject.is_locked ? '🔓 Unlock' : '🔒 Lock'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onDuplicateObject(selectedObject.id)} className="flex-1">
              📋 Duplicate
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => onBringForward(selectedObject.id)} className="flex-1">
              ↑ Forward
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onSendBackward(selectedObject.id)} className="flex-1">
              ↓ Backward
            </Button>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onDeleteObject(selectedObject.id)}
            className="w-full"
          >
            🗑️ Delete Object
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
