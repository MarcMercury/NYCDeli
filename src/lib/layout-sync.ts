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
const _RESOURCE_CATEGORY_MAP: Partial<Record<FloorplanObjectType, BuildCategory>> = {
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
  /** True if directly linked OR covered by a group inventory row */
  coveredByInventory: boolean
  /** True if directly linked OR covered by a group electrical row */
  coveredByElectrical: boolean
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
 *
 * Uses TWO matching strategies:
 *   1. Direct link via floorplan_object_id (strongest match)
 *   2. Type-based coverage: an inventory row whose quantity_expected
 *      covers the count of objects of that type on the map
 */
export async function fetchLayoutAudit(floorplanId: string): Promise<LayoutAuditSummary> {
  const supabase = createClient()

  // Fetch all data in parallel
  const [objRes, invAllRes, resRes, elecAllRes] = await Promise.all([
    supabase.from('floorplan_objects').select('*').eq('floorplan_id', floorplanId),
    supabase.from('build_inventory').select('*'),
    supabase.from('build_resources').select('*').not('floorplan_object_id', 'is', null),
    supabase.from('electrical_load_items').select('*'),
  ])

  const objects = (objRes.data || []) as FloorplanObjectRow[]
  const allInventory = (invAllRes.data || []) as BuildInventoryRow[]
  const allElectrical = (elecAllRes.data || []) as ElectricalLoadItemRow[]

  // Build direct-link maps
  const inventoryByObj = new Map<string, BuildInventoryRow>()
  for (const row of allInventory) {
    if (row.floorplan_object_id) inventoryByObj.set(row.floorplan_object_id, row)
  }
  const resourcesByObj = new Map<string, BuildResourceRow>()
  for (const row of (resRes.data || []) as BuildResourceRow[]) {
    if (row.floorplan_object_id) resourcesByObj.set(row.floorplan_object_id, row)
  }
  const elecByObj = new Map<string, ElectricalLoadItemRow>()
  for (const row of allElectrical) {
    if (row.floorplan_object_id) elecByObj.set(row.floorplan_object_id, row)
  }

  // Build type-based coverage maps:
  // Inventory rows whose category matches the object type's mapped category
  // → sum their quantity_expected to see if total covers the placed count
  const invCategoryMap = new Map<InventoryCategory, { total: number; rows: BuildInventoryRow[] }>()
  for (const row of allInventory) {
    const cat = row.category as InventoryCategory
    const entry = invCategoryMap.get(cat) || { total: 0, rows: [] }
    entry.total += row.quantity_expected
    entry.rows.push(row)
    invCategoryMap.set(cat, entry)
  }

  // Electrical: sum quantity across all items that share a type-match
  const elecSumByType = new Map<FloorplanObjectType, { totalQty: number; rows: ElectricalLoadItemRow[] }>()
  for (const row of allElectrical) {
    // Try to determine which object type this electrical item covers
    // based on its floorplan_object_id linking or name matching
    if (row.floorplan_object_id) {
      const obj = objects.find(o => o.id === row.floorplan_object_id)
      if (obj) {
        const entry = elecSumByType.get(obj.object_type) || { totalQty: 0, rows: [] }
        entry.totalQty += row.quantity
        entry.rows.push(row)
        elecSumByType.set(obj.object_type, entry)
      }
    }
  }

  // Count objects by type
  const objectsByType = new Map<FloorplanObjectType, FloorplanObjectRow[]>()
  const typeCounts: Record<string, number> = {}
  for (const obj of objects) {
    const t = obj.object_type
    typeCounts[t] = (typeCounts[t] || 0) + 1
    const arr = objectsByType.get(t) || []
    arr.push(obj)
    objectsByType.set(t, arr)
  }

  // Determine type-level coverage
  const typeCoveredInventory = new Set<FloorplanObjectType>()
  const typeCoveredElectrical = new Set<FloorplanObjectType>()
  for (const [objType, objList] of objectsByType) {
    if (SKIP_TYPES.has(objType)) continue
    const invCat = INVENTORY_CATEGORY_MAP[objType]
    if (invCat) {
      const catInfo = invCategoryMap.get(invCat)
      // Check if any linked inventory row references objects of this type
      const directLinked = objList.filter(o => inventoryByObj.has(o.id)).length
      if (directLinked > 0 || (catInfo && catInfo.total >= objList.length)) {
        typeCoveredInventory.add(objType)
      }
    }
    if (ELECTRICAL_DEFAULTS[objType]) {
      const elecInfo = elecSumByType.get(objType)
      const directLinked = objList.filter(o => elecByObj.has(o.id)).length
      if (directLinked > 0 || (elecInfo && elecInfo.totalQty >= objList.length)) {
        typeCoveredElectrical.add(objType)
      }
    }
  }

  const items: LayoutAuditItem[] = []
  let totalLinkedInventory = 0
  let totalUnlinkedInventory = 0
  let totalLinkedElectrical = 0
  let totalUnlinkedElectrical = 0

  for (const obj of objects) {
    const t = obj.object_type
    if (SKIP_TYPES.has(t)) continue

    const needsInventory = !!INVENTORY_CATEGORY_MAP[t]
    const needsElectrical = !!ELECTRICAL_DEFAULTS[t]
    const inventoryItem = inventoryByObj.get(obj.id) || null
    const resourceItem = resourcesByObj.get(obj.id) || null
    const electricalItem = elecByObj.get(obj.id) || null

    // An item is "covered" if directly linked OR type-level covered
    const invCovered = !!inventoryItem || typeCoveredInventory.has(t)
    const elecCovered = !!electricalItem || typeCoveredElectrical.has(t)

    if (needsInventory) {
      if (invCovered) totalLinkedInventory++
      else totalUnlinkedInventory++
    }
    if (needsElectrical) {
      if (elecCovered) totalLinkedElectrical++
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
      coveredByInventory: invCovered,
      coveredByElectrical: elecCovered,
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
    supabase.from('build_inventory').select('*'),
  ])

  const objects = (objRes.data || []) as FloorplanObjectRow[]
  const allInventory = (invRes.data || []) as BuildInventoryRow[]
  const linkedIds = new Set(
    allInventory
      .map(r => r.floorplan_object_id)
      .filter(Boolean)
  )

  // Build type-level coverage: count objects per type, sum inventory qty per category
  const objectCountByType = new Map<FloorplanObjectType, number>()
  for (const obj of objects) {
    if (!SKIP_TYPES.has(obj.object_type) && INVENTORY_CATEGORY_MAP[obj.object_type]) {
      objectCountByType.set(obj.object_type, (objectCountByType.get(obj.object_type) || 0) + 1)
    }
  }
  const invQtyByCategory = new Map<InventoryCategory, number>()
  for (const row of allInventory) {
    const cat = row.category as InventoryCategory
    invQtyByCategory.set(cat, (invQtyByCategory.get(cat) || 0) + row.quantity_expected)
  }
  // Types already covered by existing inventory quantity
  const coveredTypes = new Set<FloorplanObjectType>()
  for (const [objType, count] of objectCountByType) {
    const cat = INVENTORY_CATEGORY_MAP[objType]!
    const directLinked = objects.filter(o => o.object_type === objType && linkedIds.has(o.id)).length
    if (directLinked > 0 || (invQtyByCategory.get(cat) || 0) >= count) {
      coveredTypes.add(objType)
    }
  }

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
    if (coveredTypes.has(obj.object_type)) continue // already covered by existing inventory

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
    supabase.from('electrical_load_items').select('*'),
  ])

  const objects = (objRes.data || []) as FloorplanObjectRow[]
  const allElectrical = (elecRes.data || []) as ElectricalLoadItemRow[]
  const linkedIds = new Set(
    allElectrical
      .map(r => r.floorplan_object_id)
      .filter(Boolean)
  )

  // Build type-level coverage for electrical
  const objectCountByType = new Map<FloorplanObjectType, number>()
  for (const obj of objects) {
    if (ELECTRICAL_DEFAULTS[obj.object_type]) {
      objectCountByType.set(obj.object_type, (objectCountByType.get(obj.object_type) || 0) + 1)
    }
  }
  const elecLinkedByType = new Map<FloorplanObjectType, number>()
  for (const row of allElectrical) {
    if (row.floorplan_object_id) {
      const obj = objects.find(o => o.id === row.floorplan_object_id)
      if (obj) {
        elecLinkedByType.set(obj.object_type, (elecLinkedByType.get(obj.object_type) || 0) + row.quantity)
      }
    }
  }
  const coveredTypes = new Set<FloorplanObjectType>()
  for (const [objType, count] of objectCountByType) {
    const directLinked = objects.filter(o => o.object_type === objType && linkedIds.has(o.id)).length
    if (directLinked > 0 || (elecLinkedByType.get(objType) || 0) >= count) {
      coveredTypes.add(objType)
    }
  }

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
    if (coveredTypes.has(obj.object_type)) continue // already covered by existing electrical items

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
    supabase.from('build_schedule_items').select('*'),
  ])

  const objects = (objRes.data || []) as FloorplanObjectRow[]
  const allSchedule = (schedRes.data || []) as { id: string; floorplan_object_id: string | null; title: string }[]
  const linkedIds = new Set(
    allSchedule
      .map(r => r.floorplan_object_id)
      .filter(Boolean)
  )

  // Build type-level coverage: if there's already a schedule item for any
  // object of this type, consider the type covered (schedule items are tasks,
  // not quantity based)
  const coveredTypes = new Set<FloorplanObjectType>()
  for (const obj of objects) {
    if (SKIP_TYPES.has(obj.object_type)) continue
    if (linkedIds.has(obj.id)) {
      coveredTypes.add(obj.object_type)
    }
  }

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
    if (coveredTypes.has(obj.object_type)) continue // already has schedule items for this type

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
