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
  BuildScheduleDay,
  UtilityLineRow,
  UtilityLinePoint,
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

/** Default wattage / amperage / voltage / plug per electrical-relevant object type.
 *  Only listed types auto-create electrical_load_items rows. Zero-draw or
 *  source objects (e.g. the generator itself) are intentionally omitted. */
const ELECTRICAL_DEFAULTS: Partial<Record<FloorplanObjectType, { wattage: number; amperage: number; voltage: number; plug_type: string }>> = {
  swamp_cooler:       { wattage: 250,  amperage: 2.1,  voltage: 120, plug_type: 'standard' },
  refrigerated_truck: { wattage: 2000, amperage: 16.7, voltage: 120, plug_type: '20A' },
  kitchen:            { wattage: 1500, amperage: 12.5, voltage: 120, plug_type: '20A' },
  prep_area:          { wattage: 500,  amperage: 4.2,  voltage: 120, plug_type: 'standard' },
  service_area:       { wattage: 750,  amperage: 6.3,  voltage: 120, plug_type: 'standard' },
  common_area:        { wattage: 600,  amperage: 5.0,  voltage: 120, plug_type: 'standard' },
  stage:              { wattage: 2000, amperage: 16.7, voltage: 120, plug_type: '20A' },
  bar:                { wattage: 1000, amperage: 8.3,  voltage: 120, plug_type: 'standard' },
  first_aid:          { wattage: 200,  amperage: 1.7,  voltage: 120, plug_type: 'standard' },
  storage:            { wattage: 100,  amperage: 0.8,  voltage: 120, plug_type: 'standard' },
  pc_container:       { wattage: 500,  amperage: 4.2,  voltage: 120, plug_type: 'standard' },
  shower_container:   { wattage: 2000, amperage: 16.7, voltage: 120, plug_type: '20A' },
}

/** Default install day per schedule category — drives smarter schedule sync. */
const CATEGORY_DEFAULT_DAY: Record<BuildScheduleCategory, BuildScheduleDay> = {
  delivery:       'pre_build',
  layout:         'sunday',
  infrastructure: 'sunday',
  shade:          'monday',
  electrical:     'sunday',
  plumbing:       'monday',
  kitchen:        'tuesday',
  decoration:     'thursday',
  safety:         'thursday',
  logistics:      'pre_build',
  other:          'tuesday',
}

/** Component template — recipe of sub-items each unit of an object type needs.
 *  Drives auto-population down to the lag-bolt level when an inventory item
 *  is synced from the layout and has no children yet. */
interface ComponentTemplate {
  name: string
  qty_per_parent: number
  unit: string
  category: string
  size?: string
  notes?: string
}

const COMPONENT_TEMPLATES: Partial<Record<FloorplanObjectType, ComponentTemplate[]>> = {
  shade_structure: [
    { name: 'Lag bolt',          qty_per_parent: 16, unit: 'each', category: 'fastener', size: '1/2" x 4"', notes: 'Anchoring posts to ground plate' },
    { name: 'Ground stake',      qty_per_parent: 8,  unit: 'each', category: 'hardware', size: '24"', notes: 'Guy-line anchors' },
    { name: 'Ratchet strap',     qty_per_parent: 8,  unit: 'each', category: 'hardware', size: '1" x 15ft' },
    { name: 'Aluminet shade',    qty_per_parent: 1,  unit: 'each', category: 'fabric',   size: '20x30 ft' },
    { name: 'Zip ties',          qty_per_parent: 50, unit: 'each', category: 'fastener', size: '11" UV' },
  ],
  shade_sail: [
    { name: 'Eye bolt',          qty_per_parent: 4,  unit: 'each', category: 'fastener', size: '3/8"' },
    { name: 'Turnbuckle',        qty_per_parent: 4,  unit: 'each', category: 'hardware', size: '5/16"' },
    { name: 'Sail',              qty_per_parent: 1,  unit: 'each', category: 'fabric' },
  ],
  kitchen: [
    { name: 'Folding table',     qty_per_parent: 2,  unit: 'each', category: 'other',    size: '6 ft' },
    { name: 'Power strip',       qty_per_parent: 2,  unit: 'each', category: 'wire' },
    { name: 'Extension cord',    qty_per_parent: 2,  unit: 'each', category: 'wire',     size: '12/3 x 25ft' },
    { name: 'Hand-wash station', qty_per_parent: 1,  unit: 'each', category: 'fitting' },
  ],
  grill: [
    { name: 'Propane tank',      qty_per_parent: 2,  unit: 'each', category: 'fuel',     size: '20 lb' },
    { name: 'Regulator hose',    qty_per_parent: 1,  unit: 'each', category: 'fitting' },
    { name: 'Grill brush',       qty_per_parent: 1,  unit: 'each', category: 'consumable' },
  ],
  prep_area: [
    { name: 'Folding table',     qty_per_parent: 2,  unit: 'each', category: 'other',    size: '6 ft' },
    { name: 'Cutting board',     qty_per_parent: 2,  unit: 'each', category: 'consumable' },
  ],
  service_area: [
    { name: 'Folding table',     qty_per_parent: 2,  unit: 'each', category: 'other',    size: '6 ft' },
    { name: 'Tablecloth',        qty_per_parent: 2,  unit: 'each', category: 'fabric' },
  ],
  generator: [
    { name: 'Generator',         qty_per_parent: 1,  unit: 'each', category: 'other' },
    { name: 'Fuel',              qty_per_parent: 50, unit: 'gal',  category: 'fuel',     notes: 'Diesel/propane per gen spec' },
    { name: 'Oil',               qty_per_parent: 2,  unit: 'qt',   category: 'consumable' },
    { name: 'Distro tail',       qty_per_parent: 1,  unit: 'each', category: 'wire',     size: '6/3 SOOW' },
  ],
  porta_potty: [
    { name: 'Toilet paper',      qty_per_parent: 12, unit: 'each', category: 'consumable' },
    { name: 'Hand sanitizer',    qty_per_parent: 1,  unit: 'each', category: 'consumable' },
  ],
  shower_container: [
    { name: 'Water heater',      qty_per_parent: 1,  unit: 'each', category: 'fitting' },
    { name: 'Shower head',       qty_per_parent: 2,  unit: 'each', category: 'fitting' },
    { name: 'Drain hose',        qty_per_parent: 1,  unit: 'each', category: 'fitting',  size: '3/4" x 25ft' },
  ],
  sink_hose: [
    { name: 'Garden hose',       qty_per_parent: 1,  unit: 'each', category: 'fitting',  size: '5/8" x 50ft' },
    { name: 'Spray nozzle',      qty_per_parent: 1,  unit: 'each', category: 'fitting' },
  ],
  water_station: [
    { name: 'Igloo cooler',      qty_per_parent: 1,  unit: 'each', category: 'other',    size: '5 gal' },
    { name: 'Cup',               qty_per_parent: 100,unit: 'each', category: 'consumable' },
  ],
  greywater_tank: [
    { name: 'Tank',              qty_per_parent: 1,  unit: 'each', category: 'fitting' },
    { name: 'Pump-out fitting',  qty_per_parent: 1,  unit: 'each', category: 'fitting' },
  ],
  bar: [
    { name: 'Folding table',     qty_per_parent: 1,  unit: 'each', category: 'other',    size: '6 ft' },
    { name: 'Cup',               qty_per_parent: 200,unit: 'each', category: 'consumable' },
  ],
  stage: [
    { name: 'Pallet',            qty_per_parent: 4,  unit: 'each', category: 'lumber' },
    { name: 'Plywood deck',      qty_per_parent: 2,  unit: 'each', category: 'lumber',   size: '4x8 x 3/4"' },
    { name: 'Lag bolt',          qty_per_parent: 12, unit: 'each', category: 'fastener', size: '3/8" x 3"' },
  ],
  fence: [
    { name: 'T-post',            qty_per_parent: 1,  unit: 'each', category: 'hardware', size: '6 ft', notes: '1 post per 8 ft of fence — adjust' },
    { name: 'Snow fence',        qty_per_parent: 8,  unit: 'ft',   category: 'fabric' },
    { name: 'Zip ties',          qty_per_parent: 6,  unit: 'each', category: 'fastener' },
  ],
  fire_extinguisher: [
    { name: 'Extinguisher',      qty_per_parent: 1,  unit: 'each', category: 'other' },
    { name: 'Wall bracket',      qty_per_parent: 1,  unit: 'each', category: 'hardware' },
  ],
  fire_pit: [
    { name: 'Burn barrel',       qty_per_parent: 1,  unit: 'each', category: 'other' },
    { name: 'Sand bag',          qty_per_parent: 4,  unit: 'each', category: 'consumable', notes: 'Safety perimeter' },
  ],
  storage: [
    { name: 'Padlock',           qty_per_parent: 1,  unit: 'each', category: 'hardware' },
  ],
  pc_container: [
    { name: 'Padlock',           qty_per_parent: 1,  unit: 'each', category: 'hardware' },
    { name: 'LED light strip',   qty_per_parent: 1,  unit: 'each', category: 'wire' },
  ],
  refrigerated_truck: [
    { name: 'Power tail',        qty_per_parent: 1,  unit: 'each', category: 'wire',     size: '10/3 SOOW' },
    { name: 'Wheel chock',       qty_per_parent: 2,  unit: 'each', category: 'hardware' },
  ],
  sign: [
    { name: 'Coroplast panel',   qty_per_parent: 1,  unit: 'each', category: 'fabric',   size: '24x36' },
    { name: 'Stake',             qty_per_parent: 2,  unit: 'each', category: 'hardware' },
  ],
  common_area: [
    { name: 'Folding chair',     qty_per_parent: 8,  unit: 'each', category: 'other' },
    { name: 'Rug',               qty_per_parent: 1,  unit: 'each', category: 'fabric' },
  ],
  table: [
    { name: 'Folding table',     qty_per_parent: 1,  unit: 'each', category: 'other',    size: '6 ft' },
  ],
  bike_parking: [
    { name: 'Bike rack rebar',   qty_per_parent: 6,  unit: 'each', category: 'hardware', size: '1/2" x 4 ft' },
  ],
  swamp_cooler: [
    { name: 'Power cord',        qty_per_parent: 1,  unit: 'each', category: 'wire',     size: '12/3 x 25ft' },
    { name: 'Water inlet hose',  qty_per_parent: 1,  unit: 'each', category: 'fitting' },
  ],
  fuel_storage: [
    { name: 'Fuel can',          qty_per_parent: 2,  unit: 'each', category: 'other',    size: '5 gal' },
    { name: 'Spill kit',         qty_per_parent: 1,  unit: 'each', category: 'consumable' },
  ],
  propane_storage: [
    { name: 'Propane tank',      qty_per_parent: 4,  unit: 'each', category: 'fuel',     size: '20 lb' },
  ],
  trash_receptacle: [
    { name: 'Trash bag',         qty_per_parent: 20, unit: 'each', category: 'consumable', size: '55 gal' },
  ],
}

/** Object types that are boundaries/annotations and should NOT generate inventory */
const SKIP_TYPES: Set<FloorplanObjectType> = new Set([
  'fire_lane', 'road', 'path_of_travel', 'entrance',
  'distance_marker', 'neighbor_zone', 'custom',
  'stairs_ladder',
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
  /** Utility line coverage */
  totalUtilityLines: number
  utilityLinesLinkedInventory: number
  utilityLinesLinkedElectrical: number
  /** Inventory rows that have at least one component child */
  inventoryWithComponents: number
  inventoryTotal: number
  componentsTotal: number
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
  const [objRes, invAllRes, resRes, elecAllRes, linesRes, compRes] = await Promise.all([
    supabase.from('floorplan_objects').select('*').eq('floorplan_id', floorplanId),
    supabase.from('build_inventory').select('*'),
    supabase.from('build_resources').select('*').not('floorplan_object_id', 'is', null),
    supabase.from('electrical_load_items').select('*'),
    supabase.from('floorplan_utility_lines').select('id, utility_line_id:id, line_type').eq('floorplan_id', floorplanId),
    supabase.from('build_inventory_components').select('parent_inventory_id'),
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
    totalUtilityLines: ((linesRes.data || []) as { id: string }[]).length,
    utilityLinesLinkedInventory: allInventory.filter(r => (r as BuildInventoryRow & { utility_line_id?: string | null }).utility_line_id).length,
    utilityLinesLinkedElectrical: allElectrical.filter(r => (r as ElectricalLoadItemRow & { utility_line_id?: string | null }).utility_line_id).length,
    inventoryWithComponents: new Set(((compRes.data || []) as { parent_inventory_id: string }[]).map(r => r.parent_inventory_id)).size,
    inventoryTotal: allInventory.length,
    componentsTotal: ((compRes.data || []) as unknown[]).length,
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
      description: `Auto-synced from layout: ${obj.width_ft}W × ${obj.height_ft}L ft`,
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
 * Groups objects by type and creates ONE task per type with a count
 * (e.g. "Install 12 swamp coolers"). Default day is picked per
 * schedule category. Returns count of tasks created.
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

  // Group placed objects by type (skipping non-trackable types and those
  // that already have any linked schedule task).
  const objectsByType = new Map<FloorplanObjectType, FloorplanObjectRow[]>()
  const typesWithExistingTask = new Set<FloorplanObjectType>()
  for (const obj of objects) {
    if (SKIP_TYPES.has(obj.object_type)) continue
    if (!SCHEDULE_CATEGORY_MAP[obj.object_type]) continue
    if (linkedIds.has(obj.id)) {
      typesWithExistingTask.add(obj.object_type)
      continue
    }
    const arr = objectsByType.get(obj.object_type) || []
    arr.push(obj)
    objectsByType.set(obj.object_type, arr)
  }

  const { data: maxRow } = await supabase
    .from('build_schedule_items')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  let nextOrder = maxRow && maxRow.length > 0 ? (maxRow[0] as { sort_order: number }).sort_order + 1 : 0

  let created = 0
  for (const [objType, list] of objectsByType) {
    if (typesWithExistingTask.has(objType)) continue
    const category = SCHEDULE_CATEGORY_MAP[objType]!
    const day = CATEGORY_DEFAULT_DAY[category] ?? 'tuesday'
    const typeLabel = objectTypeLabel(objType)
    const count = list.length
    const representative = list[0]
    const { error } = await supabase.from('build_schedule_items').insert({
      title: count > 1 ? `Install ${count} × ${typeLabel}` : `Install ${representative.label || typeLabel}`,
      description: count > 1
        ? `Place and set up ${count} ${typeLabel.toLowerCase()} objects per layout.`
        : `Setup ${representative.label || typeLabel} (${representative.width_ft}W × ${representative.height_ft}L ft).`,
      day,
      category,
      floorplan_object_id: representative.id,
      sort_order: nextOrder++,
      is_delivery: false,
      completed: false,
    } as never)
    if (!error) created++
  }

  return created
}

// ============================================================
// Utility line geometry helpers
// ============================================================

/** Polyline length in feet from an array of grid coords. */
function polylineLengthFt(points: UtilityLinePoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    total += Math.sqrt(dx * dx + dy * dy)
  }
  return Math.round(total * 10) / 10
}

/** Inventory-row "name" we use for a utility line cable run. */
function utilityLineInventoryName(line: UtilityLineRow): string {
  const length = line.length_ft || polylineLengthFt(line.points)
  const gauge = line.wire_gauge || (line.line_type === 'power' ? '12/3 SOOW' : '3/4" hose')
  const kind = line.line_type === 'power' ? 'Power cable' : 'Water line'
  return `${kind} — ${gauge} × ${Math.ceil(length)} ft`
}

/**
 * Sync floorplan utility lines into build_inventory + electrical_load_items.
 * Each drawn line generates an inventory row for the cable/hose footage, and
 * (for power lines) an electrical_load_items row that documents the run.
 * Caches polyline length back onto the utility line row.
 */
export async function syncUtilityLines(floorplanId: string): Promise<{
  inventoryCreated: number
  electricalCreated: number
}> {
  const supabase = createClient()
  const [linesRes, invRes, elecRes] = await Promise.all([
    supabase.from('floorplan_utility_lines').select('*').eq('floorplan_id', floorplanId),
    supabase.from('build_inventory').select('id, utility_line_id'),
    supabase.from('electrical_load_items').select('id, utility_line_id'),
  ])
  const lines = (linesRes.data || []) as UtilityLineRow[]
  const linkedInv = new Set(((invRes.data || []) as { utility_line_id: string | null }[])
    .map(r => r.utility_line_id).filter(Boolean))
  const linkedElec = new Set(((elecRes.data || []) as { utility_line_id: string | null }[])
    .map(r => r.utility_line_id).filter(Boolean))

  const { data: maxInv } = await supabase
    .from('build_inventory').select('sort_order')
    .order('sort_order', { ascending: false }).limit(1)
  let invOrder = maxInv && maxInv.length > 0 ? (maxInv[0] as { sort_order: number }).sort_order + 1 : 0

  const { data: maxElec } = await supabase
    .from('electrical_load_items').select('sort_order')
    .order('sort_order', { ascending: false }).limit(1)
  let elecOrder = maxElec && maxElec.length > 0 ? (maxElec[0] as { sort_order: number }).sort_order + 1 : 0

  let inventoryCreated = 0
  let electricalCreated = 0

  for (const line of lines) {
    // Refresh cached length if missing/stale
    const computedLength = polylineLengthFt(line.points)
    if (Math.abs((line.length_ft || 0) - computedLength) > 0.5) {
      await supabase.from('floorplan_utility_lines')
        .update({ length_ft: computedLength } as never)
        .eq('id', line.id)
      line.length_ft = computedLength
    }

    if (!linkedInv.has(line.id)) {
      const category: InventoryCategory = line.line_type === 'power' ? 'electrical' : 'plumbing'
      const { error } = await supabase.from('build_inventory').insert({
        name: utilityLineInventoryName(line),
        category,
        description: `Auto-synced from layout utility line — ${line.label || line.line_type}`,
        quantity_expected: 1,
        size_l: `${Math.ceil(line.length_ft || computedLength)} ft`,
        utility_line_id: line.id,
        sort_order: invOrder++,
      } as never)
      if (!error) inventoryCreated++
    }

    if (line.line_type === 'power' && !linkedElec.has(line.id)) {
      const amps = line.amp_rating ?? 20
      const { error } = await supabase.from('electrical_load_items').insert({
        name: utilityLineInventoryName(line),
        location: line.label || 'Utility line',
        voltage: 120,
        amperage: 0,
        wattage: 0,
        plug_type: line.wire_gauge || 'standard',
        quantity: 1,
        total_amps: 0,
        total_wattage: 0,
        notes: `Cable run — carry capacity ${amps}A`,
        utility_line_id: line.id,
        sort_order: elecOrder++,
      } as never)
      if (!error) electricalCreated++
    }
  }

  return { inventoryCreated, electricalCreated }
}

/**
 * Seed component templates for inventory items that were auto-created from
 * the layout but have no children yet. Returns count of components created.
 */
export async function syncLayoutComponents(floorplanId: string): Promise<number> {
  const supabase = createClient()
  const [objRes, invRes, compRes] = await Promise.all([
    supabase.from('floorplan_objects').select('*').eq('floorplan_id', floorplanId),
    supabase.from('build_inventory').select('*'),
    supabase.from('build_inventory_components').select('parent_inventory_id'),
  ])
  const objects = (objRes.data || []) as FloorplanObjectRow[]
  const allInventory = (invRes.data || []) as BuildInventoryRow[]
  const parentsWithComponents = new Set(
    ((compRes.data || []) as { parent_inventory_id: string }[]).map(r => r.parent_inventory_id)
  )

  // Build inventory rows indexed by floorplan_object_id
  const invByObj = new Map<string, BuildInventoryRow>()
  for (const row of allInventory) {
    if (row.floorplan_object_id) invByObj.set(row.floorplan_object_id, row)
  }

  // Avoid duplicating templates for the same parent across multiple object
  // placements of the same type (one inventory row may cover many objects).
  const seededParents = new Set<string>()
  let created = 0
  for (const obj of objects) {
    const template = COMPONENT_TEMPLATES[obj.object_type]
    if (!template || template.length === 0) continue
    const parent = invByObj.get(obj.id)
    if (!parent) continue
    if (parentsWithComponents.has(parent.id)) continue
    if (seededParents.has(parent.id)) continue
    seededParents.add(parent.id)

    let order = 0
    for (const tmpl of template) {
      const { error } = await supabase.from('build_inventory_components').insert({
        parent_inventory_id: parent.id,
        name: tmpl.name,
        qty_per_parent: tmpl.qty_per_parent,
        unit: tmpl.unit,
        category: tmpl.category,
        size: tmpl.size ?? null,
        notes: tmpl.notes ?? null,
        have_qty: 0,
        sort_order: order++,
      } as never)
      if (!error) created++
    }
  }
  return created
}

/**
 * Run every sync at once: inventory, components, electrical, utility lines,
 * and schedule. Components MUST run after inventory so parent rows exist.
 */
export async function syncLayoutAll(floorplanId: string): Promise<{
  inventoryCreated: number
  electricalCreated: number
  scheduleCreated: number
  componentsCreated: number
  utilityInventoryCreated: number
  utilityElectricalCreated: number
}> {
  // 1) inventory rows first (some downstream syncs depend on these existing)
  const inventoryCreated = await syncLayoutToInventory(floorplanId)
  // 2) anything that doesn't depend on inventory can run in parallel
  const [electricalCreated, scheduleCreated, utility, componentsCreated] = await Promise.all([
    syncLayoutToElectrical(floorplanId),
    syncLayoutToSchedule(floorplanId),
    syncUtilityLines(floorplanId),
    syncLayoutComponents(floorplanId),
  ])
  return {
    inventoryCreated,
    electricalCreated,
    scheduleCreated,
    componentsCreated,
    utilityInventoryCreated: utility.inventoryCreated,
    utilityElectricalCreated: utility.electricalCreated,
  }
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
