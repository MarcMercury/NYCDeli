import type { FloorplanObjectRow, FloorplanConfigRow, FrontageSide } from '@/types/database'

export type ValidationSeverity = 'pass' | 'warn' | 'fail'

export interface ValidationResult {
  id: string
  label: string
  severity: ValidationSeverity
  message: string
  objectIds?: string[]
}

// Types that are hard-sided structures (for spacing check)
const HARD_STRUCTURES = new Set([
  'tent', 'shade_structure', 'common_area', 'stage', 'bar', 'kitchen',
  'storage', 'refrigerated_truck', 'shower_container', 'pc_container',
])

// Types that are combustible
const COMBUSTIBLE_TYPES = new Set([
  'tent', 'shade_structure', 'common_area', 'stage', 'bar', 'kitchen',
  'storage', 'trash_receptacle', 'table', 'custom',
])

// Gets the center point of an object
function center(obj: FloorplanObjectRow): { cx: number; cy: number } {
  return { cx: obj.x + obj.width_ft / 2, cy: obj.y + obj.height_ft / 2 }
}

// Returns distance between centers of two objects
function distBetween(a: FloorplanObjectRow, b: FloorplanObjectRow): number {
  const ac = center(a)
  const bc = center(b)
  return Math.sqrt((ac.cx - bc.cx) ** 2 + (ac.cy - bc.cy) ** 2)
}

// Returns the minimum edge-to-edge gap between two axis-aligned rectangles
function edgeGap(a: FloorplanObjectRow, b: FloorplanObjectRow): number {
  const ax1 = a.x, ax2 = a.x + a.width_ft, ay1 = a.y, ay2 = a.y + a.height_ft
  const bx1 = b.x, bx2 = b.x + b.width_ft, by1 = b.y, by2 = b.y + b.height_ft

  const dx = Math.max(0, Math.max(ax1 - bx2, bx1 - ax2))
  const dy = Math.max(0, Math.max(ay1 - by2, by1 - ay2))
  return Math.sqrt(dx * dx + dy * dy)
}

// Distance from an object's nearest edge to a specific camp border
function distToBorder(
  obj: FloorplanObjectRow,
  side: FrontageSide,
  config: FloorplanConfigRow
): number {
  switch (side) {
    case 'north': return obj.y
    case 'south': return config.length_ft - (obj.y + obj.height_ft)
    case 'west': return obj.x
    case 'east': return config.width_ft - (obj.x + obj.width_ft)
  }
}

// Minimum distance from object to any frontage border
function distToNearestFrontage(
  obj: FloorplanObjectRow,
  config: FloorplanConfigRow
): number {
  const sides = config.frontage_sides || []
  if (sides.length === 0) return Infinity
  return Math.min(...sides.map(s => distToBorder(obj, s, config)))
}

// Minimum distance from object to any fire lane object
function distToNearestFireLane(
  obj: FloorplanObjectRow,
  fireLanes: FloorplanObjectRow[]
): number {
  if (fireLanes.length === 0) return Infinity
  return Math.min(...fireLanes.map(lane => edgeGap(obj, lane)))
}

// Distance from object to nearest camp border (any side)
function distToNearestBorder(
  obj: FloorplanObjectRow,
  config: FloorplanConfigRow
): number {
  return Math.min(
    obj.x,
    obj.y,
    config.width_ft - (obj.x + obj.width_ft),
    config.length_ft - (obj.y + obj.height_ft)
  )
}

// Max depth from any frontage border (deepest point in camp)
function maxDepthFromFrontage(config: FloorplanConfigRow): number {
  const sides = config.frontage_sides || []
  if (sides.length === 0) return Math.max(config.width_ft, config.length_ft)

  const depths: number[] = []
  for (const side of sides) {
    switch (side) {
      case 'north': case 'south': depths.push(config.length_ft); break
      case 'east': case 'west': depths.push(config.width_ft); break
    }
  }
  return Math.min(...depths)
}

export function runValidation(
  objects: FloorplanObjectRow[],
  config: FloorplanConfigRow
): ValidationResult[] {
  const results: ValidationResult[] = []
  const frontage = config.frontage_sides || []
  const fireLanes = objects.filter(o => o.object_type === 'fire_lane')
  const generators = objects.filter(o => o.object_type === 'generator')
  const fuelStorage = objects.filter(o => o.object_type === 'fuel_storage')
  const propaneStorage = objects.filter(o => o.object_type === 'propane_storage')
  const flameEffects = objects.filter(o => o.object_type === 'flame_effect' || o.object_type === 'fire_pit')
  const extinguishers = objects.filter(o => o.object_type === 'fire_extinguisher')
  const entrances = objects.filter(o => o.object_type === 'entrance')
  const kitchens = objects.filter(o => ['kitchen', 'grill', 'prep_area', 'service_area'].includes(o.object_type))
  const hardStructures = objects.filter(o => HARD_STRUCTURES.has(o.object_type))
  const stages = objects.filter(o => o.object_type === 'stage')
  const bars = objects.filter(o => o.object_type === 'bar')
  const bikeParking = objects.filter(o => o.object_type === 'bike_parking')
  const pcContainers = objects.filter(o => o.object_type === 'pc_container')

  // 1. Entrance exists
  results.push({
    id: 'entrance-exists',
    label: 'Camp Entrance',
    severity: entrances.length > 0 ? 'pass' : 'fail',
    message: entrances.length > 0
      ? `${entrances.length} entrance(s) placed`
      : 'No entrance placed — layout must show camp entrance',
    objectIds: entrances.map(o => o.id),
  })

  // 2. Frontage marked
  results.push({
    id: 'frontage-marked',
    label: 'Frontage Designated',
    severity: frontage.length > 0 ? 'pass' : 'fail',
    message: frontage.length > 0
      ? `Frontage: ${frontage.join(', ')}`
      : 'No frontage marked — designate which border(s) face the street',
  })

  // 3. Fire lane (if needed)
  const depth = maxDepthFromFrontage(config)
  const needsFireLane = depth > 125
  if (needsFireLane) {
    const hasFireLane = fireLanes.length > 0
    results.push({
      id: 'fire-lane-required',
      label: 'Fire Lane Required',
      severity: hasFireLane ? 'pass' : 'fail',
      message: hasFireLane
        ? `${fireLanes.length} fire lane(s) placed — depth is ${depth}ft`
        : `Camp depth is ${depth}ft (>125ft) — 20ft fire/service lane required`,
      objectIds: fireLanes.map(o => o.id),
    })
  }

  // 4. Fire lane width check
  const narrowLanes = fireLanes.filter(l => Math.min(l.width_ft, l.height_ft) < 20)
  if (fireLanes.length > 0) {
    results.push({
      id: 'fire-lane-width',
      label: 'Fire Lane Width',
      severity: narrowLanes.length === 0 ? 'pass' : 'fail',
      message: narrowLanes.length === 0
        ? 'All fire lanes are 20ft+ wide'
        : `${narrowLanes.length} fire lane(s) narrower than 20ft`,
      objectIds: narrowLanes.map(o => o.id),
    })
  }

  // 5. Generator placement — within 20ft of frontage or fire lane
  const badGens: FloorplanObjectRow[] = []
  for (const gen of generators) {
    const distFrontage = distToNearestFrontage(gen, config)
    const distLane = distToNearestFireLane(gen, fireLanes)
    if (Math.min(distFrontage, distLane) > 20) {
      badGens.push(gen)
    }
  }
  if (generators.length > 0) {
    results.push({
      id: 'generator-placement',
      label: 'Generator Access',
      severity: badGens.length === 0 ? 'pass' : 'warn',
      message: badGens.length === 0
        ? `All ${generators.length} generator(s) within 20ft of frontage/fire lane`
        : `${badGens.length} generator(s) >20ft from frontage/fire lane — fuel trucks can't reach`,
      objectIds: badGens.map(o => o.id),
    })
  }

  // 6. Generator not on neighbor border
  const borderGens = generators.filter(g => distToNearestBorder(g, config) < 5)
  if (generators.length > 0) {
    results.push({
      id: 'generator-border',
      label: 'Generator Border Buffer',
      severity: borderGens.length === 0 ? 'pass' : 'warn',
      message: borderGens.length === 0
        ? 'No generators near camp borders'
        : `${borderGens.length} generator(s) within 5ft of camp edge — don't exhaust on neighbors`,
      objectIds: borderGens.map(o => o.id),
    })
  }

  // 7. Fuel storage 10ft clearance zone
  const fuelViolations: string[] = []
  for (const fuel of [...fuelStorage, ...propaneStorage]) {
    for (const obj of objects) {
      if (obj.id === fuel.id) continue
      if (!COMBUSTIBLE_TYPES.has(obj.object_type)) continue
      if (edgeGap(fuel, obj) < 10) {
        fuelViolations.push(obj.id)
      }
    }
  }
  if (fuelStorage.length + propaneStorage.length > 0) {
    results.push({
      id: 'fuel-clearance',
      label: 'Fuel 10ft Clearance',
      severity: fuelViolations.length === 0 ? 'pass' : 'fail',
      message: fuelViolations.length === 0
        ? 'No combustibles within 10ft of fuel storage'
        : `${fuelViolations.length} object(s) within 10ft of fuel — must be clear`,
      objectIds: fuelViolations,
    })
  }

  // 8. Propane/liquid fuel 20ft separation
  const fuelPairViolations: string[] = []
  for (const liquid of fuelStorage) {
    for (const propane of propaneStorage) {
      if (edgeGap(liquid, propane) < 20) {
        fuelPairViolations.push(liquid.id, propane.id)
      }
    }
  }
  if (fuelStorage.length > 0 && propaneStorage.length > 0) {
    results.push({
      id: 'fuel-propane-separation',
      label: 'Fuel/Propane 20ft Separation',
      severity: fuelPairViolations.length === 0 ? 'pass' : 'fail',
      message: fuelPairViolations.length === 0
        ? 'Liquid fuel and propane are 20ft+ apart'
        : 'Liquid fuel and propane storage are too close — need 20ft separation',
      objectIds: [...new Set(fuelPairViolations)],
    })
  }

  // 9. Fuel-to-fuel 50ft separation (between designated storage areas)
  const allFuel = [...fuelStorage, ...propaneStorage]
  const fuelClusterViolations: string[] = []
  for (let i = 0; i < allFuel.length; i++) {
    for (let j = i + 1; j < allFuel.length; j++) {
      if (allFuel[i].properties?.fuel_type === allFuel[j].properties?.fuel_type) {
        if (edgeGap(allFuel[i], allFuel[j]) < 50) {
          fuelClusterViolations.push(allFuel[i].id, allFuel[j].id)
        }
      }
    }
  }
  if (allFuel.length > 1) {
    results.push({
      id: 'fuel-fuel-separation',
      label: 'Fuel Area 50ft Separation',
      severity: fuelClusterViolations.length === 0 ? 'pass' : 'warn',
      message: fuelClusterViolations.length === 0
        ? 'Fuel storage areas are 50ft+ apart'
        : 'Some fuel storage areas are within 50ft of each other',
      objectIds: [...new Set(fuelClusterViolations)],
    })
  }

  // 10. Flame effect / fire pit 20ft clearance
  const flameViolations: string[] = []
  for (const flame of flameEffects) {
    for (const obj of objects) {
      if (obj.id === flame.id) continue
      if (!COMBUSTIBLE_TYPES.has(obj.object_type)) continue
      if (edgeGap(flame, obj) < 20) {
        flameViolations.push(obj.id)
      }
    }
  }
  if (flameEffects.length > 0) {
    results.push({
      id: 'flame-clearance',
      label: 'Flame Effect 20ft Clearance',
      severity: flameViolations.length === 0 ? 'pass' : 'warn',
      message: flameViolations.length === 0
        ? 'No combustibles within 20ft of flame effects/fire pits'
        : `${flameViolations.length} object(s) within 20ft of flame/fire — should be clear`,
      objectIds: flameViolations,
    })
  }

  // 11. Fire extinguisher coverage
  const hazardAreas = [...kitchens, ...generators, ...fuelStorage, ...propaneStorage, ...flameEffects]
  const uncoveredHazards: string[] = []
  for (const hazard of hazardAreas) {
    const nearestExt = extinguishers.reduce((min, ext) => {
      const d = distBetween(hazard, ext)
      return d < min ? d : min
    }, Infinity)
    if (nearestExt > 20) {
      uncoveredHazards.push(hazard.id)
    }
  }
  if (hazardAreas.length > 0) {
    results.push({
      id: 'extinguisher-coverage',
      label: 'Fire Extinguisher Coverage',
      severity: uncoveredHazards.length === 0 ? 'pass' : 'warn',
      message: uncoveredHazards.length === 0
        ? 'All hazard areas have fire extinguisher within 20ft'
        : `${uncoveredHazards.length} hazard area(s) without nearby fire extinguisher`,
      objectIds: uncoveredHazards,
    })
  }

  // 12. Structure spacing (5ft between hard structures)
  const spacingViolations: string[] = []
  for (let i = 0; i < hardStructures.length; i++) {
    for (let j = i + 1; j < hardStructures.length; j++) {
      const gap = edgeGap(hardStructures[i], hardStructures[j])
      if (gap > 0 && gap < 5) {
        spacingViolations.push(hardStructures[i].id, hardStructures[j].id)
      }
    }
  }
  if (hardStructures.length > 1) {
    results.push({
      id: 'structure-spacing',
      label: 'Structure 5ft Spacing',
      severity: spacingViolations.length === 0 ? 'pass' : 'warn',
      message: spacingViolations.length === 0
        ? 'All hard structures have 5ft+ gap'
        : `${new Set(spacingViolations).size} structure(s) within 5ft of another — fire hazard`,
      objectIds: [...new Set(spacingViolations)],
    })
  }

  // 13. Bike parking (if events area exists)
  if (stages.length > 0 || bars.length > 0) {
    results.push({
      id: 'bike-parking',
      label: 'Bike Parking',
      severity: bikeParking.length > 0 ? 'pass' : 'warn',
      message: bikeParking.length > 0
        ? `${bikeParking.length} bike parking area(s) for event visitors`
        : 'Camp has stage/bar but no bike parking — crowds need a place to park',
      objectIds: bikeParking.map(o => o.id),
    })
  }

  // 14. PC container documentation
  for (const pc of pcContainers) {
    const hasNumber = !!pc.properties?.pc_number
    const hasDoor = !!pc.properties?.door_direction
    results.push({
      id: `pc-container-${pc.id}`,
      label: `PC Container: ${pc.label}`,
      severity: hasNumber && hasDoor ? 'pass' : 'warn',
      message: hasNumber && hasDoor
        ? `PC#${pc.properties?.pc_number} — door: ${pc.properties?.door_direction}`
        : `Missing ${!hasNumber ? 'PC#' : ''}${!hasNumber && !hasDoor ? ' and ' : ''}${!hasDoor ? 'door direction' : ''} — required for submission`,
      objectIds: [pc.id],
    })
  }

  // 15. Fuel within 50ft of road for propane delivery
  const roads = objects.filter(o => o.object_type === 'road')
  if (propaneStorage.length > 0 && roads.length > 0) {
    const farPropane = propaneStorage.filter(p => {
      const nearestRoad = Math.min(...roads.map(r => edgeGap(p, r)))
      const nearestFrontage = distToNearestFrontage(p, config)
      return Math.min(nearestRoad, nearestFrontage) > 50
    })
    results.push({
      id: 'propane-road-access',
      label: 'Propane Delivery Access',
      severity: farPropane.length === 0 ? 'pass' : 'warn',
      message: farPropane.length === 0
        ? 'All propane storage within 50ft of road/frontage'
        : `${farPropane.length} propane storage(s) >50ft from road — delivery trucks can't reach`,
      objectIds: farPropane.map(o => o.id),
    })
  }

  return results
}

// Safety zone data for rendering on canvas
export interface SafetyZone {
  objectId: string
  cx: number
  cy: number
  radii: Array<{ radius: number; color: string; label: string }>
}

export function computeSafetyZones(objects: FloorplanObjectRow[]): SafetyZone[] {
  const zones: SafetyZone[] = []

  for (const obj of objects) {
    const c = center(obj)

    if (obj.object_type === 'fuel_storage') {
      zones.push({
        objectId: obj.id,
        cx: c.cx,
        cy: c.cy,
        radii: [
          { radius: 10, color: '#ef4444', label: '10ft — no combustibles' },
          { radius: 20, color: '#f97316', label: '20ft — propane separation' },
          { radius: 50, color: '#facc15', label: '50ft — fuel-to-fuel' },
        ],
      })
    }

    if (obj.object_type === 'propane_storage') {
      zones.push({
        objectId: obj.id,
        cx: c.cx,
        cy: c.cy,
        radii: [
          { radius: 10, color: '#ef4444', label: '10ft — no combustibles' },
          { radius: 20, color: '#f97316', label: '20ft — liquid fuel separation' },
          { radius: 50, color: '#facc15', label: '50ft — fuel-to-fuel' },
        ],
      })
    }

    if (obj.object_type === 'flame_effect' || obj.object_type === 'fire_pit') {
      zones.push({
        objectId: obj.id,
        cx: c.cx,
        cy: c.cy,
        radii: [
          { radius: 20, color: '#ef4444', label: '20ft — no combustibles' },
        ],
      })
    }
  }

  return zones
}
