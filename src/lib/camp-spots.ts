import { createClient } from '@/lib/supabase/client'
import type { CampSpotRow, CampReservationRow, CampSpotWithReservation } from '@/types/database'

/** Fetch all spots with their active reservation + camper info */
export async function fetchSpotsWithReservations(): Promise<CampSpotWithReservation[]> {
  const supabase = createClient()

  const { data: spots, error: spotsError } = await supabase
    .from('camp_spots' as never)
    .select('*')
    .order('row_label' as never)
    .order('spot_number' as never) as unknown as { data: CampSpotRow[] | null; error: Error | null }

  if (spotsError) throw spotsError
  if (!spots) return []

  const { data: reservations, error: resError } = await supabase
    .from('camp_reservations' as never)
    .select('*') as unknown as { data: CampReservationRow[] | null; error: Error | null }

  if (resError) throw resError

  // Fetch camper info for reserved spots
  const camperIds = (reservations ?? [])
    .filter((r) => r.status === 'reserved')
    .map((r) => r.camper_id)

  const { data: campers } = camperIds.length > 0
    ? await supabase
        .from('campers')
        .select('id, full_name, playa_name, shelter_type, shelter_width_ft, shelter_length_ft')
        .in('id', camperIds) as { data: CampSpotWithReservation['camper'][] | null }
    : { data: [] as CampSpotWithReservation['camper'][] }

  const camperMap = new Map(
    (campers ?? []).map((c) => [c!.id, c])
  )

  const reservationBySpot = new Map(
    (reservations ?? [])
      .filter((r) => r.status === 'reserved')
      .map((r) => [r.spot_id, r])
  )

  return spots.map((spot) => {
    const res = reservationBySpot.get(spot.id)
    return {
      ...spot,
      reservation: res ?? null,
      camper: res ? (camperMap.get(res.camper_id) ?? null) : null,
    }
  })
}

/** Reserve a spot for a camper */
export async function reserveSpot(
  spotId: string,
  camperId: string,
  reservedBy?: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('camp_reservations' as never)
    .insert({
      spot_id: spotId,
      camper_id: camperId,
      status: 'reserved',
      reserved_by: reservedBy ?? camperId,
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
