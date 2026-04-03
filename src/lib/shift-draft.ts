import { createClient } from '@/lib/supabase/client'
import type {
  ShiftDraftRow,
  ShiftDraftOrderRow,
  ShiftDraftPickRow,
  ShiftDraftOrderWithCamper,
  DraftStatus,
  DraftPickStatus,
} from '@/types/database'

// ==========================================
// Shift definitions (mirrors kitchen page)
// ==========================================

export interface DraftShiftPosition {
  id: string // unique key for draft picking
  category: string
  role: string
  description?: string
  time?: string
  note?: string
  countsDouble?: boolean
  requiresExp?: boolean
}

export interface DraftShiftCategory {
  name: string
  description?: string
  time?: string
  note?: string
  positions: DraftShiftPosition[]
}

let _posId = 0
function pos(category: string, role: string, time?: string, opts?: { countsDouble?: boolean; requiresExp?: boolean; note?: string; description?: string }): DraftShiftPosition {
  _posId++
  return { id: `pos-${_posId}`, category, role, time, ...opts }
}

export function getAllDraftShiftCategories(): DraftShiftCategory[] {
  _posId = 0
  return [
    {
      name: 'Deli Shifts (M–Sat)',
      note: 'Core daily shifts',
      positions: [
        pos('Deli Shifts', 'Kitchen Lead', undefined, { note: 'as needed', description: 'Oversees all kitchen operations; makes real-time calls on prep, service flow, and staffing' }),
        pos('Deli Shifts', 'Kitchen Supervisor', '8:30AM–12:30PM', { requiresExp: true, countsDouble: true, description: 'Opens the kitchen, manages morning prep and service; ensures food safety and quality standards' }),
        pos('Deli Shifts', 'Camp Manager Day', '10AM–4PM', { countsDouble: true, description: 'Runs daytime camp operations including supply runs, camper issues, and infrastructure' }),
        pos('Deli Shifts', 'Camp Manager Day Deputy', '10AM–1PM', { description: 'Supports the Day Camp Manager with errands, logistics, and camper coordination' }),
        pos('Deli Shifts', 'Camp Manager Day Deputy', '1PM–4PM', { description: 'Supports the Day Camp Manager with errands, logistics, and camper coordination' }),
        pos('Deli Shifts', 'Camp Manager Night', '4PM–10PM', { countsDouble: true, description: 'Manages evening camp operations, noise levels, safety, and overnight readiness' }),
        pos('Deli Shifts', 'Camp Manager Night Deputy', '4PM–7PM', { description: 'Assists Night Camp Manager with evening duties and closing procedures' }),
        pos('Deli Shifts', 'Camp Manager Night Deputy', '7PM–10PM', { description: 'Assists Night Camp Manager with evening duties and closing procedures' }),
      ],
    },
    {
      name: 'Prep Crew',
      time: '8:30–11:00 AM',
      positions: Array.from({ length: 5 }, () => pos('Prep Crew', 'Prep Crew', '8:30–11:00 AM', { description: 'Chops, slices, portions, and organizes ingredients for the day\u2019s deli service' })),
    },
    {
      name: 'Order Taker',
      time: '9:30–12:00',
      positions: [pos('Order Taker', 'Order Taker & Counter', '9:30–12:00', { note: 'Basically Entertainer', description: 'Takes customer orders at the counter with energy and flair \u2014 part cashier, part entertainer' })],
    },
    {
      name: 'Grill – Service Shift',
      time: '9:30–12:00',
      positions: [
        pos('Grill', 'Grill Lead', '9:30–12:00', { requiresExp: true, description: 'Runs the grill station; calls temps, manages ticket flow, and ensures food is cooked safely' }),
        pos('Grill', 'Grill', '9:30–12:00', { description: 'Works the flat-top and grill cooking eggs, bacon, and proteins to order' }),
        pos('Grill', 'Grill', '9:30–12:00', { description: 'Works the flat-top and grill cooking eggs, bacon, and proteins to order' }),
        pos('Grill', 'Grill', '9:30–12:00', { description: 'Works the flat-top and grill cooking eggs, bacon, and proteins to order' }),
      ],
    },
    {
      name: 'Assembly / Deli Service',
      time: '9:30–12:00',
      positions: [
        pos('Assembly', 'Assembly (Egg + Egg+Cheese)', '9:30–12:00', { description: 'Assembles egg and egg-and-cheese sandwiches fresh off the grill' }),
        pos('Assembly', 'Assembly (Schmearer)', '9:30–12:00', { description: 'Spreads cream cheese, butter, and condiments on bagels and rolls' }),
        pos('Assembly', 'Assembly (Bacon)', '9:30–12:00', { description: 'Handles bacon prep, portioning, and adding bacon to sandwich orders' }),
        pos('Assembly', 'Assembly (Coffee + Milk)', '9:30–12:00', { description: 'Brews and serves coffee and milk; keeps the beverage station stocked and clean' }),
        pos('Assembly', 'Assembly (Sandwich Counter)', '9:30–12:00', { description: 'Final sandwich assembly \u2014 wraps, bags, and hands completed orders to runners' }),
      ],
    },
    {
      name: 'Runner',
      time: '9:30–12:00',
      positions: [
        pos('Runner', 'Runner (Assist)', '9:30–12:00', { description: 'Delivers finished orders from the counter to customers and assists where needed' }),
        pos('Runner', 'Runner (Assist)', '9:30–12:00', { description: 'Delivers finished orders from the counter to customers and assists where needed' }),
      ],
    },
    {
      name: 'Security',
      time: '10:00–12:30',
      positions: [pos('Security', 'Security', '10:00–12:30', { description: 'Manages crowd flow, enforces line order, and keeps the deli perimeter safe and fun' })],
    },
    {
      name: 'Clean-up Crew',
      time: '12:00–2:30',
      positions: Array.from({ length: 5 }, () => pos('Clean-up Crew', 'Clean-up & Kitchen Reset', '12:00–2:30', { description: 'Deep cleans all stations, washes dishes, sanitizes surfaces, and resets the kitchen for the next day' })),
    },
    {
      name: 'Entertainers',
      time: '10:00–12:30',
      positions: [
        pos('Entertainers', 'Entertainer / Bike Manager', '10:00–12:30', { description: 'Manages the bike valet area and entertains the crowd while they wait' }),
        pos('Entertainers', 'Entertainer / Bike Manager', '10:00–12:30', { description: 'Manages the bike valet area and entertains the crowd while they wait' }),
        pos('Entertainers', 'Entertainer / Line Manager', '10:00–12:30', { description: 'Keeps the line moving and entertained with games, banter, or conversation' }),
        pos('Entertainers', 'Entertainer / Line Manager', '10:00–12:30', { description: 'Keeps the line moving and entertained with games, banter, or conversation' }),
      ],
    },
    {
      name: 'Music & DJs',
      time: '9:30–12:30',
      positions: [pos('Music & DJs', 'DJ', '9:30–12:30', { description: 'Provides the soundtrack for deli service \u2014 sets the vibe and keeps energy high' })],
    },
    {
      name: 'Deep Playa Food Service (Fri 9/4)',
      note: 'Soup for 1,000',
      positions: [
        pos('Deep Playa', 'Kitchen Lead', '3PM–6:30PM', { description: 'Leads kitchen operations for the deep playa soup service' }),
        pos('Deep Playa', 'Grill Lead', '3PM–6:30PM', { requiresExp: true, description: 'Runs the cooking station for the deep playa event' }),
        pos('Deep Playa', 'Volunteer Supervisor', '3PM–6:30PM', { description: 'Supervises 15\u201320 external volunteers from Camp Milk & Honey' }),
        pos('Deep Playa', 'Volunteer Supervisor', '3PM–6:30PM', { description: 'Supervises 15\u201320 external volunteers from Camp Milk & Honey' }),
        pos('Deep Playa', 'Volunteer Supervisor', '3PM–6:30PM', { description: 'Supervises 15\u201320 external volunteers from Camp Milk & Honey' }),
        pos('Deep Playa', 'Transport & Serving', '6:30PM–9PM', { description: 'Transports prepared food to deep playa and serves 1,000+ attendees' }),
        pos('Deep Playa', 'Transport & Serving', '6:30PM–9PM', { description: 'Transports prepared food to deep playa and serves 1,000+ attendees' }),
        pos('Deep Playa', 'Transport & Serving', '6:30PM–9PM', { description: 'Transports prepared food to deep playa and serves 1,000+ attendees' }),
        pos('Deep Playa', 'Transport & Serving', '6:30PM–9PM', { description: 'Transports prepared food to deep playa and serves 1,000+ attendees' }),
      ],
    },
    {
      name: 'Strike (Sun 9/6)',
      note: 'Teardown shifts',
      positions: [
        pos('Strike', 'Striker \u2013 Deco + Chill Tent', '8:30AM–11AM', { description: 'Tears down decorations and disassembles the public chill tent' }),
        pos('Strike', 'Striker \u2013 Deco + Chill Tent', '8:30AM–11AM', { description: 'Tears down decorations and disassembles the public chill tent' }),
        pos('Strike', 'Striker \u2013 Deco + Chill Tent', '8:30AM–11AM', { description: 'Tears down decorations and disassembles the public chill tent' }),
        pos('Strike', 'Striker \u2013 Deco + Chill Tent', '8:30AM–11AM', { description: 'Tears down decorations and disassembles the public chill tent' }),
        pos('Strike', 'Striker \u2013 Service Kitchen', '8:30AM–11AM', { description: 'Breaks down the service kitchen \u2014 packs equipment, cleans, and loads out' }),
        pos('Strike', 'Striker \u2013 Service Kitchen', '8:30AM–11AM', { description: 'Breaks down the service kitchen \u2014 packs equipment, cleans, and loads out' }),
        pos('Strike', 'Striker \u2013 Service Kitchen', '8:30AM–11AM', { description: 'Breaks down the service kitchen \u2014 packs equipment, cleans, and loads out' }),
        pos('Strike', 'Striker \u2013 Plumbing/Shower', '8:30AM–11AM', { description: 'Disconnects plumbing, drains lines, and disassembles the shower container' }),
        pos('Strike', 'Striker \u2013 Plumbing/Shower', '8:30AM–11AM', { description: 'Disconnects plumbing, drains lines, and disassembles the shower container' }),
        pos('Strike', 'Striker \u2013 Plumbing/Shower', '8:30AM–11AM', { description: 'Disconnects plumbing, drains lines, and disassembles the shower container' }),
        pos('Strike', 'Striker \u2013 Plumbing/Shower', '8:30AM–11AM', { description: 'Disconnects plumbing, drains lines, and disassembles the shower container' }),
        pos('Strike', 'Striker \u2013 Power', '8:30AM–11AM', { description: 'Disconnects electrical systems, coils cabling, and packs generators' }),
        pos('Strike', 'Striker \u2013 Power', '8:30AM–11AM', { description: 'Disconnects electrical systems, coils cabling, and packs generators' }),
        pos('Strike', 'Striker \u2013 Power', '8:30AM–11AM', { description: 'Disconnects electrical systems, coils cabling, and packs generators' }),
        pos('Strike', 'Striker \u2013 Power', '8:30AM–11AM', { description: 'Disconnects electrical systems, coils cabling, and packs generators' }),
        pos('Strike', 'Striker \u2013 Lighting/Shade/Bikes', '8:30AM–11AM', { description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks' }),
        pos('Strike', 'Striker \u2013 Lighting/Shade/Bikes', '8:30AM–11AM', { description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks' }),
        pos('Strike', 'Striker \u2013 Lighting/Shade/Bikes', '8:30AM–11AM', { description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks' }),
        pos('Strike', 'Striker \u2013 Lighting/Shade/Bikes', '8:30AM–11AM', { description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks' }),
        pos('Strike', 'Striker \u2013 Lighting/Shade/Bikes', '8:30AM–11AM', { description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks' }),
        pos('Strike', 'Striker \u2013 Lighting/Shade/Bikes', '8:30AM–11AM', { description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks' }),
        pos('Strike', 'Striker \u2013 Lighting/Shade/Bikes', '8:30AM–11AM', { description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks' }),
        pos('Strike', 'Striker \u2013 Lighting/Shade/Bikes', '8:30AM–11AM', { description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks' }),
        pos('Strike', 'Striker \u2013 Lighting/Shade/Bikes', '8:30AM–11AM', { description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks' }),
        pos('Strike', 'Striker \u2013 Lighting/Shade/Bikes', '8:30AM–11AM', { description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks' }),
      ],
    },
  ]
}

/** Flatten all positions into a single list */
export function getAllDraftPositions(): DraftShiftPosition[] {
  return getAllDraftShiftCategories().flatMap(c => c.positions)
}

// ==========================================
// Override types & helpers
// ==========================================

export interface ShiftPositionOverride {
  role?: string
  time?: string
  description?: string
  category?: string
  deleted?: boolean
}

export type ShiftOverrides = Record<string, unknown>

/** Check if a category is marked as deleted in overrides */
export function isCategoryDeleted(overrides: ShiftOverrides, categoryKey: string): boolean {
  return overrides[`_cat_deleted:${categoryKey}`] === true
}

/** Get position override (returns null if no override exists) */
export function getPositionOverride(overrides: ShiftOverrides, positionKey: string): ShiftPositionOverride | null {
  const ov = overrides[positionKey]
  if (!ov || typeof ov !== 'object') return null
  return ov as ShiftPositionOverride
}

/** Apply overrides (edits + deletions) to draft shift categories.
 *  Returns new arrays with overrides applied and deleted items removed. */
export function applyDraftOverrides(
  categories: DraftShiftCategory[],
  overrides: ShiftOverrides,
  prefix: string = 'deli'
): DraftShiftCategory[] {
  return categories
    .filter((_, catIdx) => !isCategoryDeleted(overrides, `${prefix}-${catIdx}`))
    .map((cat) => {
      const catIdx = categories.indexOf(cat)
      return {
        ...cat,
        positions: cat.positions
          .map((pos, posIdx) => {
            const key = `${prefix}-${catIdx}-${posIdx}`
            const ov = getPositionOverride(overrides, key)
            if (!ov) return pos
            if (ov.deleted) return null
            return {
              ...pos,
              ...(ov.role && { role: ov.role }),
              ...(ov.time && { time: ov.time }),
              ...(ov.description && { description: ov.description }),
            }
          })
          .filter((p): p is DraftShiftPosition => p !== null),
      }
    })
    .filter(cat => cat.positions.length > 0)
}

/** Apply overrides to plain ShiftCategory arrays (kitchen page format) */
export function applyShiftCategoryOverrides<T extends { positions: P[] }, P extends { role: string; time?: string; description?: string }>(
  categories: T[],
  overrides: ShiftOverrides,
  prefix: string
): T[] {
  return categories
    .filter((_, catIdx) => !isCategoryDeleted(overrides, `${prefix}-${catIdx}`))
    .map((cat) => {
      const catIdx = categories.indexOf(cat)
      return {
        ...cat,
        positions: cat.positions
          .map((pos, posIdx) => {
            const key = `${prefix}-${catIdx}-${posIdx}`
            const ov = getPositionOverride(overrides, key)
            if (!ov) return pos
            if (ov.deleted) return null
            return {
              ...pos,
              ...(ov.role && { role: ov.role }),
              ...(ov.time && { time: ov.time }),
              ...(ov.description && { description: ov.description }),
            }
          })
          .filter((p): p is P => p !== null),
      }
    })
    .filter(cat => cat.positions.length > 0)
}

// ==========================================
// Data fetching
// ==========================================

/** Fetch the active or most recent draft */
export async function fetchActiveDraft(): Promise<ShiftDraftRow | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('shift_drafts' as never)
    .select('*')
    .in('status' as never, ['setup', 'active', 'paused'] as never)
    .order('created_at' as never, { ascending: false })
    .limit(1)
    .single() as unknown as { data: ShiftDraftRow | null }
  return data
}

/** Fetch a specific draft by ID */
export async function fetchDraft(draftId: string): Promise<ShiftDraftRow | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('shift_drafts' as never)
    .select('*')
    .eq('id' as never, draftId)
    .single() as unknown as { data: ShiftDraftRow | null }
  return data
}

/** Fetch draft order with camper details */
export async function fetchDraftOrder(draftId: string): Promise<ShiftDraftOrderWithCamper[]> {
  const supabase = createClient()
  const { data: orders } = await supabase
    .from('shift_draft_order' as never)
    .select('*')
    .eq('draft_id' as never, draftId)
    .order('draft_position' as never) as unknown as { data: ShiftDraftOrderRow[] | null }

  if (!orders || orders.length === 0) return []

  const camperIds = orders.map(o => o.camper_id)
  const { data: campers } = await supabase
    .from('campers')
    .select('id, full_name, playa_name, email')
    .in('id', camperIds) as unknown as { data: { id: string; full_name: string; playa_name: string | null; email: string }[] | null }

  const camperMap = new Map((campers ?? []).map(c => [c.id, c]))

  return orders.map(o => ({
    ...o,
    camper: camperMap.get(o.camper_id) ?? null,
  }))
}

/** Fetch all picks for a draft */
export async function fetchDraftPicks(draftId: string): Promise<ShiftDraftPickRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('shift_draft_picks' as never)
    .select('*')
    .eq('draft_id' as never, draftId)
    .order('round_number' as never)
    .order('pick_index' as never) as unknown as { data: ShiftDraftPickRow[] | null }
  return data ?? []
}

// ==========================================
// Admin actions
// ==========================================

/** Create a new draft */
export async function createDraft(name: string, totalRounds: number, pickTimeLimitSeconds: number, createdBy: string): Promise<ShiftDraftRow> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shift_drafts' as never)
    .insert({
      name,
      total_rounds: totalRounds,
      pick_time_limit_seconds: pickTimeLimitSeconds,
      created_by: createdBy,
    } as never)
    .select('*')
    .single() as unknown as { data: ShiftDraftRow | null; error: Error | null }

  if (error) throw error
  return data!
}

/** Set the draft order (replaces existing) */
export async function setDraftOrder(draftId: string, camperIds: string[]): Promise<void> {
  const supabase = createClient()

  // Delete existing order
  await supabase
    .from('shift_draft_order' as never)
    .delete()
    .eq('draft_id' as never, draftId)

  // Insert new order
  const rows = camperIds.map((camperId, idx) => ({
    draft_id: draftId,
    camper_id: camperId,
    draft_position: idx + 1,
  }))

  const { error } = await supabase
    .from('shift_draft_order' as never)
    .insert(rows as never)

  if (error) throw error
}

/** Start the draft - creates pick records for round 1 and sets first person to 'picking' */
export async function startDraft(draftId: string): Promise<void> {
  const supabase = createClient()

  const order = await fetchDraftOrder(draftId)
  if (order.length === 0) throw new Error('No campers in draft order')

  // Create pick records for round 1
  const picks = order.map((o, idx) => ({
    draft_id: draftId,
    camper_id: o.camper_id,
    round_number: 1,
    pick_index: idx,
    status: idx === 0 ? 'picking' : 'pending',
    turn_started_at: idx === 0 ? new Date().toISOString() : null,
  }))

  const { error: picksError } = await supabase
    .from('shift_draft_picks' as never)
    .insert(picks as never)

  if (picksError) throw picksError

  // Update draft status
  const { error } = await supabase
    .from('shift_drafts' as never)
    .update({
      status: 'active',
      current_round: 1,
      current_pick_index: 0,
      started_at: new Date().toISOString(),
    } as never)
    .eq('id' as never, draftId)

  if (error) throw error
}

/** Advance to the next pick (admin can force-advance) */
export async function advanceDraft(draftId: string, skipReason?: 'skipped' | 'auto_skipped'): Promise<void> {
  const supabase = createClient()

  const draft = await fetchDraft(draftId)
  if (!draft || draft.status !== 'active') throw new Error('Draft is not active')

  const order = await fetchDraftOrder(draftId)

  // Mark current pick as skipped if needed
  if (skipReason) {
    await supabase
      .from('shift_draft_picks' as never)
      .update({
        status: skipReason,
        expired_at: new Date().toISOString(),
      } as never)
      .eq('draft_id' as never, draftId)
      .eq('round_number' as never, draft.current_round)
      .eq('pick_index' as never, draft.current_pick_index)
  }

  let nextIndex = draft.current_pick_index + 1
  let nextRound = draft.current_round

  // If we've gone through all campers in this round, start next round
  if (nextIndex >= order.length) {
    nextRound++
    nextIndex = 0

    if (nextRound > draft.total_rounds) {
      // Draft is complete
      await supabase
        .from('shift_drafts' as never)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        } as never)
        .eq('id' as never, draftId)
      return
    }

    // Create pick records for the new round
    const newPicks = order.map((o, idx) => ({
      draft_id: draftId,
      camper_id: o.camper_id,
      round_number: nextRound,
      pick_index: idx,
      status: idx === 0 ? 'picking' : 'pending',
      turn_started_at: idx === 0 ? new Date().toISOString() : null,
    }))

    await supabase
      .from('shift_draft_picks' as never)
      .insert(newPicks as never)
  } else {
    // Set next person's pick to 'picking'
    await supabase
      .from('shift_draft_picks' as never)
      .update({
        status: 'picking',
        turn_started_at: new Date().toISOString(),
      } as never)
      .eq('draft_id' as never, draftId)
      .eq('round_number' as never, nextRound)
      .eq('pick_index' as never, nextIndex)
  }

  // Update draft state
  await supabase
    .from('shift_drafts' as never)
    .update({
      current_round: nextRound,
      current_pick_index: nextIndex,
    } as never)
    .eq('id' as never, draftId)
}

/** Camper makes their pick */
export async function makePick(
  draftId: string,
  camperId: string,
  shiftCategory: string,
  shiftRole: string,
  shiftTime: string | null
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('shift_draft_picks' as never)
    .update({
      shift_category: shiftCategory,
      shift_role: shiftRole,
      shift_time: shiftTime,
      status: 'picked',
      picked_at: new Date().toISOString(),
    } as never)
    .eq('draft_id' as never, draftId)
    .eq('camper_id' as never, camperId)
    .eq('status' as never, 'picking')

  if (error) throw error

  // Auto-advance to next pick
  await advanceDraft(draftId)
}

/** Pause or resume the draft */
export async function toggleDraftPause(draftId: string, currentStatus: DraftStatus): Promise<void> {
  const supabase = createClient()
  const newStatus = currentStatus === 'active' ? 'paused' : 'active'
  const { error } = await supabase
    .from('shift_drafts' as never)
    .update({ status: newStatus } as never)
    .eq('id' as never, draftId)
  if (error) throw error
}

/** Delete a draft (setup only) */
export async function deleteDraft(draftId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('shift_drafts' as never)
    .delete()
    .eq('id' as never, draftId)
  if (error) throw error
}

/** Update draft settings */
export async function updateDraftSettings(
  draftId: string,
  updates: { name?: string; total_rounds?: number; pick_time_limit_seconds?: number }
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('shift_drafts' as never)
    .update(updates as never)
    .eq('id' as never, draftId)
  if (error) throw error
}
