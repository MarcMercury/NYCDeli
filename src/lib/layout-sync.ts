/**
 * Layout ↔ Inventory / Electrical / Schedule Sync Engine
 *
 * Bridges the floorplan layout editor with the build-week inventory,
 * electrical load, and schedule systems.  Every physical object placed
 * on the camp map can be traced through to its inventory record,
 * electrical load entry, and/or build-schedule task.
 */

import { createClient } from '@/lib/supabase/client'
import type {
  FloorplanObjectRow,
  FloorplanObjectType,
  BuildInventoryRow,
  BuildResourceRow,
  ElectricalLoadItemRow,
  InventoryCategory,
  BuildCategory,
  BuildScheduleCategory,
} from '@/types/database'

// ============================================================
// Object-type → category mappings
// ============================================================

/** Map a floorplan object type to its build_inventory category */
const INVENTORY_CATEGORY_MAP: Partial<Record<FloorplanObjectType, InventoryCategory>> = {
  generator:          'electrical',
  swamp_cooler:       'electrical',
  kitchen:            'kitchen',
  grill:              'kitchen',
  prep_area:          'kitchen',
  service_area:       'kitchen',
  refrigerated_truck: 'kitchen',
  shade_structure:    'shade_structure',
  common_area:        'furniture',
  stage:              'large_equipment',
  bar:                'furniture',
  table:              'furniture',
  porta_potty:        'plumbing',
  water_station:      'plumbing',
  greywater_tank:     'plumbing',
  shower_container:   'plumbing',
  sink_hose:          'plumbing',
  fire_pit:           'other',
  first_aid:          'other',
  bike_parking:       'other',
  storage:            'container',
  pc_container:       'container',
  fuel_storage:       'other',
  propane_storage:    'other',
  flame_effect:       'other',
  fire_extinguisher:  'other',
  trash_receptacle:   'other',
  sign:               'layout',
  fence:              'layout',
}

/** Map a floorplan object type to its build_resources category */
const RESOURCE_CATEGORY_MAP: Partial<Record<FloorplanObjectType, BuildCategory>> = {
  generator:          'electrical',
  swamp_cooler:       'electrical',
  kitchen:            'kitchen',
  grill:              'kitchen',
  prep_area:          'kitchen',
  service_area:       'kitchen',
  refrigerated_truck: 'kitchen',
  shade_structure:    'shade_structure',
  common_area:        'shelter',
  stage:              'infrastructure',
  bar:                'furniture',
  table:              'furniture',
  porta_potty:        'plumbing',
  water_station:      'plumbing',
  greywater_tank:     'plumbing',
  shower_container:   'plumbing',
  sink_hose:          'plumbing',
  storage:            'container',
  pc_container:       'container',
  fire_extinguisher:  'safety',
  fuel_storage:       'safety',
  propane_storage:    'safety',
  trash_receptacle:   'infrastructure',
}

/** Map a floorplan object type to a schedule category */
const SCHEDULE_CATEGORY_MAP: Partial<Record<FloorplanObjectType, BuildScheduleCategory>> = {
  generator:          'electrical',
  swamp_cooler:       'electrical',
  kitchen:            'kitchen',
  grill:              'kitchen',
  prep_area:          'kitchen',
  service_area:       'kitchen',
  refrigerated_truck: 'kitchen',
  shade_structure:    'shade',
  common_area:        'infrastructure',
  stage:              'infrastructure',
  porta_potty:        'plumbing',
  water_station:      'plumbing',
  greywater_tank:     'plumbing',
  shower_container:   'plumbing',
  sink_hose:          'plumbing',
  fire_extinguisher:  'safety',
  fuel_storage:       'safety',
  propane_storage:    'safety',
  fence:              'infrastructure',
  sign:               'decoration',
  storage:            'logistics',
  pc_container:       'logistics',
  trash_receptacle:   'logistics',
  bar:                'infrastructure',
  table:              'infrastructure',
  bike_parking:       'logistics',
}

/** Default wattage estimates for electrical objects on the map */
const ELECTRICAL_DEFAULTS: Partial<Record<FloorplanObjectType, { wattage: number; amperage: number; voltage: number; plug_type: string }>> = {
  generator:          { wattage: 0, amperage: 0, voltage: 120, plug_type: 'generator_output' },
  swamp_cooler:       { wattage: 250, amperage: 2.1, voltage: 120, plug_type: 'standard' },
  refrigerated_truck: { wattage: 2000, amperage: 16.7, voltage: 120, plug_type: '20A' },
}

/** Object types that are boundaries/annotations and should NOT generate inventory */
const SKIP_TYPES: Set<FloorplanObjectType> = new Set([
  'fire_lane', 'road', 'path_of_travel', 'entrance',
  'distance_marker', 'neighbor_zone', 'custom',
  'tent', 'rv', 'vehicle', 'art_car', // handled by camp_spots / not camp-owned
])

// ============================================================
// Audit types
// ============================================================

export interface LayoutAuditItem {
  objectId: string
  objectType: FloorplanObjectType
  label: string
  widthFt: number
  heightFt: number
  /** Linked inventory record (if any) */
  inventoryItem: BuildInventoryRow | null
  /** Linked resource record (if any) */
  resourceItem: BuildResourceRow | null
  /** Linked electrical load item (if any) */
  electricalItem: ElectricalLoadItemRow | null
  /** Whether this type should have an inventory link */
  needsInventory: boolean
  /** Whether this type should have an electrical link */
  needsElectrical: boolean
}

export interface LayoutAuditSummary {
  items: LayoutAuditItem[]
  /** Counts grouped by object_type */
  typeCounts: Record<string, number>
  totalPlaced: number
  totalLinkedInventory: number
  totalUnlinkedInventory: number
  totalLinkedElectrical: number
  totalUnlinkedElectrical: number
}

// ============================================================
// Core functions
// ============================================================

/**
 * Fetch a full audit of layout objects vs. inventory/electrical/schedule.
 * Returns every trackable floorplan object and its linked records.
 */
export async function fetchLayoutAudit(floorplanId: string): Promise<LayoutAuditSummary> {
  const supabase = createClient()

  // Fetch all three in parallel
  const [objRes, invRes, resRes, elecRes] = await Promise.all([
    supabase.from('floorplan_objects').select('*').eq('floorplan_id', floorplanId),
    supabase.from('build_inventory').select('*').not('floorplan_object_id', 'is', null),
    supabase.from('build_resources').select('*').not('floorplan_object_id', 'is', null),
    supabase.from('electrical_load_items').select('*').not('floorplan_object_id', 'is', null),
  ])

  const objects = (objRes.data || []) as FloorplanObjectRow[]
  const inventoryByObj = new Map<string, BuildInventoryRow>()
  for (const row of (invRes.data || []) as BuildInventoryRow[]) {
    if (row.floorplan_object_id) inventoryByObj.set(row.floorplan_object_id, row)
  }
  const resourcesByObj = new Map<string, BuildResourceRow>()
  for (const row of (resRes.data || []) as BuildResourceRow[]) {
    if (row.floorplan_object_id) resourcesByObj.set(row.floorplan_object_id, row)
  }
  const elecByObj = new Map<string, ElectricalLoadItemRow>()
  for (const row of (elecRes.data || []) as ElectricalLoadItemRow[]) {
    if (row.floorplan_object_id) elecByObj.set(row.floorplan_object_id, row)
  }

  const typeCounts: Record<string, number> = {}
  const items: LayoutAuditItem[] = []
  let totalLinkedInventory = 0
  let totalUnlinkedInventory = 0
  let totalLinkedElectrical = 0
  let totalUnlinkedElectrical = 0

  for (const obj of objects) {
    const t = obj.object_type
    typeCounts[t] = (typeCounts[t] || 0) + 1

    if (SKIP_TYPES.has(t)) continue

    const needsInventory = !!INVENTORY_CATEGORY_MAP[t]
    const needsElectrical = !!ELECTRICAL_DEFAULTS[t]
    const inventoryItem = inventoryByObj.get(obj.id) || null
    const resourceItem = resourcesByObj.get(obj.id) || null
    const electricalItem = elecByObj.get(obj.id) || null

    if (needsInventory) {
      if (inventoryItem) totalLinkedInventory++
      else totalUnlinkedInventory++
    }
    if (needsElectrical) {
      if (electricalItem) totalLinkedElectrical++
      else totalUnlinkedElectrical++
    }

    items.push({
      objectId: obj.id,
      objectType: t,
      label: obj.label,
      widthFt: obj.width_ft,
      heightFt: obj.height_ft,
      inventoryItem,
      resourceItem,
      electricalItem,
      needsInventory,
      needsElectrical,
    })
  }

  return {
    items,
    typeCounts,
    totalPlaced: objects.length,
    totalLinkedInventory,
    totalUnlinkedInventory,
    totalLinkedElectrical,
    totalUnlinkedElectrical,
  }
}

/**
 * Sync all placed floorplan objects to build_inventory.
 * Creates missing inventory records and links them via floorplan_object_id.
 * Does NOT delete existing manual inventory items.
 * Returns count of items created.
 */
export async function syncLayoutToInventory(floorplanId: string): Promise<number> {
  const supabase = createClient()

  const [objRes, invRes] = await Promise.all([
    supabase.from('floorplan_objects').select('*').eq('floorplan_id', floorplanId),
    supabase.from('build_inventory').select('id, floorplan_object_id').not('floorplan_object_id', 'is', null),
  ])

  const objects = (objRes.data || []) as FloorplanObjectRow[]
  const linkedIds = new Set(
    ((invRes.data || []) as { id: string; floorplan_object_id: string | null }[])
      .map(r => r.floorplan_object_id)
      .filter(Boolean)
  )

  // Get max sort_order
  const { data: maxRow } = await supabase
    .from('build_inventory')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  let nextOrder = maxRow && maxRow.length > 0 ? (maxRow[0] as { sort_order: number }).sort_order + 1 : 0

  let created = 0
  for (const obj of objects) {
    if (SKIP_TYPES.has(obj.object_type)) continue
    if (linkedIds.has(obj.id)) continue

    const category = INVENTORY_CATEGORY_MAP[obj.object_type]
    if (!category) continue

    const { error } = await supabase.from('build_inventory').insert({
      name: obj.label || obj.object_type.replace(/_/g, ' '),
      category,
      description: `Auto-synced from layout: ${obj.width_ft}×${obj.height_ft} ft`,
      quantity_expected: 1,
      floorplan_object_id: obj.id,
      size_w: String(obj.width_ft),
      size_l: String(obj.height_ft),
      sort_order: nextOrder++,
    } as never)

    if (!error) created++
  }

  return created
}

/**
 * Sync placed generators and electrical objects to electrical_load_items.
 * Creates load entries for swamp coolers, refrigerated trucks, etc.
 * Links via floorplan_object_id.
 * Returns count of items created.
 */
export async function syncLayoutToElectrical(floorplanId: string): Promise<number> {
  const supabase = createClient()

  const [objRes, elecRes] = await Promise.all([
    supabase.from('floorplan_objects').select('*').eq('floorplan_id', floorplanId),
    supabase.from('electrical_load_items').select('id, floorplan_object_id').not('floorplan_object_id', 'is', null),
  ])

  const objects = (objRes.data || []) as FloorplanObjectRow[]
  const linkedIds = new Set(
    ((elecRes.data || []) as { id: string; floorplan_object_id: string | null }[])
      .map(r => r.floorplan_object_id)
      .filter(Boolean)
  )

  const { data: maxRow } = await supabase
    .from('electrical_load_items')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  let nextOrder = maxRow && maxRow.length > 0 ? (maxRow[0] as { sort_order: number }).sort_order + 1 : 0

  let created = 0
  for (const obj of objects) {
    const defaults = ELECTRICAL_DEFAULTS[obj.object_type]
    if (!defaults) continue
    if (linkedIds.has(obj.id)) continue

    const { error } = await supabase.from('electrical_load_items').insert({
      name: obj.label || obj.object_type.replace(/_/g, ' '),
      location: `Layout: (${Math.round(obj.x)}, ${Math.round(obj.y)})`,
      voltage: defaults.voltage,
      amperage: defaults.amperage,
      wattage: defaults.wattage,
      plug_type: defaults.plug_type,
      quantity: 1,
      total_amps: defaults.amperage,
      total_wattage: defaults.wattage,
      floorplan_object_id: obj.id,
      sort_order: nextOrder++,
    } as never)

    if (!error) created++
  }

  return created
}

/**
 * Sync placed floorplan objects to build_schedule_items as setup tasks.
 * Creates one "Install <label>" schedule task per trackable object.
 * Returns count of items created.
 */
export async function syncLayoutToSchedule(floorplanId: string): Promise<number> {
  const supabase = createClient()

  const [objRes, schedRes] = await Promise.all([
    supabase.from('floorplan_objects').select('*').eq('floorplan_id', floorplanId),
    supabase.from('build_schedule_items').select('id, floorplan_object_id').not('floorplan_object_id', 'is', null),
  ])

  const objects = (objRes.data || []) as FloorplanObjectRow[]
  const linkedIds = new Set(
    ((schedRes.data || []) as { id: string; floorplan_object_id: string | null }[])
      .map(r => r.floorplan_object_id)
      .filter(Boolean)
  )

  const { data: maxRow } = await supabase
    .from('build_schedule_items')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  let nextOrder = maxRow && maxRow.length > 0 ? (maxRow[0] as { sort_order: number }).sort_order + 1 : 0

  let created = 0
  for (const obj of objects) {
    if (SKIP_TYPES.has(obj.object_type)) continue
    if (linkedIds.has(obj.id)) continue

    const category = SCHEDULE_CATEGORY_MAP[obj.object_type]
    if (!category) continue

    const label = obj.label || obj.object_type.replace(/_/g, ' ')
    const { error } = await supabase.from('build_schedule_items').insert({
      title: `Install ${label}`,
      description: `Setup ${label} (${obj.width_ft}×${obj.height_ft} ft) at layout position`,
      day: 'tuesday', // default build day — admin can change
      category,
      floorplan_object_id: obj.id,
      sort_order: nextOrder++,
      is_delivery: false,
      completed: false,
    } as never)

    if (!error) created++
  }

  return created
}

/**
 * Run all three syncs at once: inventory, electrical, and schedule.
 */
export async function syncLayoutAll(floorplanId: string): Promise<{
  inventoryCreated: number
  electricalCreated: number
  scheduleCreated: number
}> {
  const [inventoryCreated, electricalCreated, scheduleCreated] = await Promise.all([
    syncLayoutToInventory(floorplanId),
    syncLayoutToElectrical(floorplanId),
    syncLayoutToSchedule(floorplanId),
  ])
  return { inventoryCreated, electricalCreated, scheduleCreated }
}

// ============================================================
// Helpers for UI
// ============================================================

/** Human-readable label for an object type */
export function objectTypeLabel(t: FloorplanObjectType): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Whether a given object type needs tracking in inventory */
export function isTrackableType(t: FloorplanObjectType): boolean {
  return !SKIP_TYPES.has(t)
}

/** Whether a given object type has electrical load implications */
export function isElectricalType(t: FloorplanObjectType): boolean {
  return !!ELECTRICAL_DEFAULTS[t]
}
