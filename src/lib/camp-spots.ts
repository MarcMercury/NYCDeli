import { createClient } from '@/lib/supabase/client'
import type { CampSpotRow, CampReservationRow, CampSpotWithReservation, CampSpotCamperInfo, FloorplanObjectRow } from '@/types/database'

/** Fetch all spots with their active reservations + camper info (supports tent sharing) */
export async function fetchSpotsWithReservations(): Promise<CampSpotWithReservation[]> {
  const supabase = createClient()

  // Spots and reservations are independent — fetch them in parallel.
  const [spotsRes, reservationsRes] = await Promise.all([
    supabase
      .from('camp_spots' as never)
      .select('*')
      .order('row_label' as never)
      .order('spot_number' as never) as unknown as Promise<{ data: CampSpotRow[] | null; error: Error | null }>,
    supabase
      .from('camp_reservations' as never)
      .select('*')
      .eq('status' as never, 'reserved') as unknown as Promise<{ data: CampReservationRow[] | null; error: Error | null }>,
  ])

  const { data: spots, error: spotsError } = spotsRes
  if (spotsError) throw spotsError
  if (!spots) return []

  const { data: reservations, error: resError } = reservationsRes
  if (resError) throw resError

  // Fetch camper info for all active reservations
  const camperIds = (reservations ?? []).map((r) => r.camper_id)

  const uniqueCamperIds = [...new Set(camperIds)]

  const { data: campers } = uniqueCamperIds.length > 0
    ? await supabase
        .from('campers')
        .select('id, full_name, playa_name, shelter_type, shelter_width_ft, shelter_length_ft')
        .in('id', uniqueCamperIds) as { data: CampSpotCamperInfo[] | null }
    : { data: [] as CampSpotCamperInfo[] }

  const camperMap = new Map(
    (campers ?? []).map((c) => [c!.id, c])
  )

  // Group reservations by spot (supports multiple per spot for tent sharing)
  const reservationsBySpot = new Map<string, CampReservationRow[]>()
  for (const r of (reservations ?? [])) {
    const existing = reservationsBySpot.get(r.spot_id) ?? []
    existing.push(r)
    reservationsBySpot.set(r.spot_id, existing)
  }

  return spots.map((spot) => {
    const spotReservations = reservationsBySpot.get(spot.id) ?? []
    const spotCampers = spotReservations
      .map((r) => camperMap.get(r.camper_id))
      .filter((c): c is CampSpotCamperInfo => c != null)
    // Primary reservation (first / is_primary=true) for backward-compat
    const primaryRes = spotReservations.find(r => r.is_primary) ?? spotReservations[0] ?? null
    return {
      ...spot,
      // Legacy single fields (backward compat)
      reservation: primaryRes,
      camper: primaryRes ? (camperMap.get(primaryRes.camper_id) ?? null) : null,
      // New array fields for tent sharing
      reservations: spotReservations,
      campers: spotCampers,
    }
  })
}

/** Reserve a spot for a camper (releases any existing reservation first).
 *  Supports tent sharing: multiple campers can reserve the same spot up to max_occupants. */
export async function reserveSpot(
  spotId: string,
  camperId: string,
  reservedBy?: string
): Promise<void> {
  const supabase = createClient()

  // Check how many active reservations this spot already has
  const { data: existingRes } = await supabase
    .from('camp_reservations' as never)
    .select('*')
    .eq('spot_id' as never, spotId)
    .eq('status' as never, 'reserved') as unknown as { data: CampReservationRow[] | null }

  // Fetch the spot to check max_occupants
  const { data: spotData } = await supabase
    .from('camp_spots' as never)
    .select('max_occupants')
    .eq('id' as never, spotId)
    .single() as unknown as { data: { max_occupants: number } | null }

  const maxOccupants = spotData?.max_occupants ?? 2
  const currentCount = (existingRes ?? []).length

  // Don't count this camper if they already have a reservation on this spot
  const alreadyOnSpot = (existingRes ?? []).some(r => r.camper_id === camperId)

  if (!alreadyOnSpot && currentCount >= maxOccupants) {
    throw new Error(`This spot is full (${currentCount}/${maxOccupants} occupants).`)
  }

  // Release any existing reservation for this camper on OTHER spots
  await supabase
    .from('camp_reservations' as never)
    .delete()
    .eq('camper_id' as never, camperId)
    .eq('status' as never, 'reserved')

  // First reservation on the spot = primary
  const isPrimary = currentCount === 0 || (alreadyOnSpot && currentCount === 1)

  const { error } = await supabase
    .from('camp_reservations' as never)
    .insert({
      spot_id: spotId,
      camper_id: camperId,
      status: 'reserved',
      reserved_by: reservedBy ?? camperId,
      is_primary: isPrimary,
    } as never)

  if (error) throw error
}

/** Release a reservation (camper de-selects) */
export async function releaseReservation(reservationId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('camp_reservations' as never)
    .delete()
    .eq('id' as never, reservationId)

  if (error) throw error
}

/** Admin: move a camper to a different spot */
export async function adminMoveReservation(
  oldReservationId: string,
  newSpotId: string,
  camperId: string,
  adminId: string,
  adminNotes?: string
): Promise<void> {
  const supabase = createClient()

  const { error: deleteError } = await supabase
    .from('camp_reservations' as never)
    .delete()
    .eq('id' as never, oldReservationId)

  if (deleteError) throw deleteError

  const { error: insertError } = await supabase
    .from('camp_reservations' as never)
    .insert({
      spot_id: newSpotId,
      camper_id: camperId,
      status: 'reserved',
      reserved_by: adminId,
      admin_notes: adminNotes ?? 'Moved by admin',
    } as never)

  if (insertError) throw insertError
}

/** Admin: force-assign a camper to a spot */
export async function adminAssignSpot(
  spotId: string,
  camperId: string,
  adminId: string,
  adminNotes?: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('camp_reservations' as never)
    .insert({
      spot_id: spotId,
      camper_id: camperId,
      status: 'reserved',
      reserved_by: adminId,
      admin_notes: adminNotes ?? 'Assigned by admin',
    } as never)

  if (error) throw error
}

/** Admin: remove a reservation entirely */
export async function adminRemoveReservation(reservationId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('camp_reservations' as never)
    .delete()
    .eq('id' as never, reservationId)

  if (error) throw error
}

/** Check if camp selection is enabled */
export async function isCampSelectionEnabled(): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('key', 'camp_selection_enabled')
    .single()

  if (error || !data) return false
  return (data as { value: string }).value === 'true'
}

/** Get camp selection open date */
export async function getCampSelectionOpenDate(): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('key', 'camp_selection_open_date')
    .single()

  if (error || !data) return null
  return (data as { value: string }).value
}

/** Toggle camp selection on/off */
export async function toggleCampSelection(enabled: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('system_settings')
    .update({ value: enabled ? 'true' : 'false' } as never)
    .eq('key', 'camp_selection_enabled')

  if (error) throw error
}

/** Update camp selection open date */
export async function updateCampSelectionDate(date: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('system_settings')
    .update({ value: date } as never)
    .eq('key', 'camp_selection_open_date')

  if (error) throw error
}

/** Check if a tent fits in a spot */
export function doesTentFitSpot(
  tentWidth: number,
  tentLength: number,
  spot: { min_tent_width_ft: number; max_tent_width_ft: number; min_tent_length_ft: number; max_tent_length_ft: number }
): { fits: boolean; reason?: string } {
  if (tentWidth > spot.max_tent_width_ft) {
    return { fits: false, reason: `Your tent is too wide (${tentWidth}ft). Max width for this spot: ${spot.max_tent_width_ft}ft.` }
  }
  if (tentWidth < spot.min_tent_width_ft) {
    return { fits: false, reason: `Your tent is too narrow (${tentWidth}ft). Min width for this spot: ${spot.min_tent_width_ft}ft.` }
  }
  if (tentLength > spot.max_tent_length_ft) {
    return { fits: false, reason: `Your tent is too long (${tentLength}ft). Max length for this spot: ${spot.max_tent_length_ft}ft.` }
  }
  if (tentLength < spot.min_tent_length_ft) {
    return { fits: false, reason: `Your tent is too short (${tentLength}ft). Min length for this spot: ${spot.min_tent_length_ft}ft.` }
  }
  return { fits: true }
}

/** Fetch all campers (for admin dropdown) */
export async function fetchAllCampers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('campers')
    .select('id, full_name, playa_name, shelter_type, shelter_width_ft, shelter_length_ft, email')
    .order('full_name')

  if (error) throw error
  return data ?? []
}

/**
 * Sync camp_spots from reservable floorplan objects.
 * - Deletes orphaned spots (no reservation and no matching object)
 * - Creates missing spots for new objects
 * - Updates existing linked spots with current positions/sizes
 * Returns the count of created, updated, and deleted spots.
 */
export async function syncSpotsFromFloorplan(
  objects: FloorplanObjectRow[]
): Promise<{ created: number; updated: number; deleted: number }> {
  const supabase = createClient()

  const reservable = objects.filter(o => o.properties?.reservable)

  // Fetch existing spots
  const { data: existingSpots } = await supabase
    .from('camp_spots' as never)
    .select('*') as unknown as { data: CampSpotRow[] | null }

  const spots = existingSpots ?? []

  if (reservable.length === 0) {
    // Delete all unreserved spots
    const unreserved = spots.filter(s => !s.floorplan_object_id)
    for (const s of unreserved) {
      await supabase.from('camp_spots' as never).delete().eq('id' as never, s.id)
    }
    return { created: 0, updated: 0, deleted: unreserved.length }
  }

  const reservableIds = new Set(reservable.map(o => o.id))
  const matchedSpotIds = new Set<string>()
  let created = 0
  let updated = 0
  let deleted = 0

  // Build a set of used (row_label, spot_number) pairs from ALL existing spots
  const usedLabels = new Set<string>()
  for (const s of spots) {
    if (s.row_label && s.spot_number) {
      usedLabels.add(`${s.row_label}-${s.spot_number}`)
    }
  }

  // Sort reservable objects for consistent labeling (top-to-bottom, left-to-right)
  const sorted = [...reservable].sort((a, b) => {
    const rowA = Math.floor(a.y / 20)
    const rowB = Math.floor(b.y / 20)
    if (rowA !== rowB) return rowA - rowB
    return a.x - b.x
  })

  // Assign row labels (A, B, C, ...) based on Y position clusters
  let currentRow = -1
  let rowLabel = 'A'
  const rowThreshold = 20

  for (const obj of sorted) {
    const objRow = Math.floor(obj.y / rowThreshold)
    if (objRow !== currentRow) {
      if (currentRow >= 0) {
        rowLabel = String.fromCharCode(rowLabel.charCodeAt(0) + 1)
      }
      currentRow = objRow
    }

    // Find existing spot linked to this object
    const existing = spots.find(
      s => !matchedSpotIds.has(s.id) && s.floorplan_object_id === obj.id
    )

    if (existing) {
      matchedSpotIds.add(existing.id)
      await supabase
        .from('camp_spots' as never)
        .update({
          x_position: obj.x,
          y_position: obj.y,
          spot_width_ft: obj.width_ft,
          spot_length_ft: obj.height_ft,
          max_tent_width_ft: obj.width_ft,
          max_tent_length_ft: obj.height_ft,
        } as never)
        .eq('id' as never, existing.id)
      updated++
    } else {
      // Find the next available spot_number for this row_label
      let spotNum = 1
      while (usedLabels.has(`${rowLabel}-${spotNum}`)) {
        spotNum++
      }
      usedLabels.add(`${rowLabel}-${spotNum}`)

      // Create new spot linked to this object
      const { error } = await supabase
        .from('camp_spots' as never)
        .insert({
          row_label: rowLabel,
          spot_number: spotNum,
          floorplan_object_id: obj.id,
          x_position: obj.x,
          y_position: obj.y,
          spot_width_ft: obj.width_ft,
          spot_length_ft: obj.height_ft,
          size_category: obj.width_ft <= 8 ? 'small' : obj.width_ft <= 12 ? 'medium' : 'large',
          min_tent_width_ft: 4,
          max_tent_width_ft: obj.width_ft,
          min_tent_length_ft: 4,
          max_tent_length_ft: obj.height_ft,
          has_power: false,
          has_shade: false,
          is_accessible: false,
          is_available: true,
        } as never)

      if (error) {
        console.error('Failed to create camp spot:', error)
      } else {
        created++
      }
    }
  }

  // Delete orphaned spots (not linked to any current reservable object, no reservation)
  const { data: reservations } = await supabase
    .from('camp_reservations' as never)
    .select('spot_id') as unknown as { data: { spot_id: string }[] | null }

  const reservedSpotIds = new Set((reservations ?? []).map(r => r.spot_id))

  for (const spot of spots) {
    if (matchedSpotIds.has(spot.id)) continue
    if (reservedSpotIds.has(spot.id)) continue
    // Spot is unlinked and unreserved — delete it
    if (!spot.floorplan_object_id || !reservableIds.has(spot.floorplan_object_id)) {
      await supabase.from('camp_spots' as never).delete().eq('id' as never, spot.id)
      deleted++
    }
  }

  return { created, updated, deleted }
}
