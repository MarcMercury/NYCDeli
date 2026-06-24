import { createClient } from '@/lib/supabase/client'
import type {
  ShiftDraftRow,
  ShiftDraftOrderRow,
  ShiftDraftOrderWithCamper,
  ShiftOfferingRow,
  ShiftDraftRankingRow,
  ShiftDraftAssignmentRow,
  DraftPool,
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
  const repeat = (n: number, make: () => DraftShiftPosition) => Array.from({ length: n }, make)
  return [
    {
      name: 'DELI SHIFTS',
      note: 'Mon–Sat daily shifts',
      positions: [
        pos('DELI SHIFTS', 'Kitchen Lead', 'As needed', { description: 'Oversees all kitchen operations; makes real-time calls on prep, service flow, and staffing' }),
        pos('DELI SHIFTS', 'Kitchen Supervisor', '8:30AM–12:30PM', { requiresExp: true, countsDouble: true, description: 'Opens the kitchen, manages morning prep and service; ensures food safety and quality standards' }),
        pos('DELI SHIFTS', 'Camp Manager Day', '10AM–4PM', { countsDouble: true, description: 'Runs daytime camp operations including supply runs, camper issues, and infrastructure' }),
        pos('DELI SHIFTS', 'Camp Manager Day Deputy', '10AM–1PM', { description: 'Supports the Day Camp Manager with errands, logistics, and camper coordination' }),
        pos('DELI SHIFTS', 'Camp Manager Day Deputy', '1PM–4PM', { description: 'Supports the Day Camp Manager with errands, logistics, and camper coordination' }),
        pos('DELI SHIFTS', 'Camp Manager Night', '4PM–10PM', { countsDouble: true, description: 'Manages evening camp operations, noise levels, safety, and overnight readiness' }),
        pos('DELI SHIFTS', 'Camp Manager Night Deputy', '4PM–7PM', { description: 'Assists Night Camp Manager with evening duties and closing procedures' }),
        pos('DELI SHIFTS', 'Camp Manager Night Deputy', '7PM–10PM', { description: 'Assists Night Camp Manager with evening duties and closing procedures' }),
        ...repeat(5, () => pos('DELI SHIFTS', 'Prep Crew', '8:30–11:00 AM', { description: 'Chops, slices, portions, and organizes ingredients for the day\u2019s deli service' })),
        pos('DELI SHIFTS', 'Order Taker & Counter', '9:30–12:00', { description: 'Takes customer orders at the counter with energy and flair \u2014 part cashier, part entertainer' }),
        pos('DELI SHIFTS', 'Grill Lead', '9:30–12:00', { requiresExp: true, description: 'Runs the grill station; calls temps, manages ticket flow, and ensures food is cooked safely' }),
        ...repeat(3, () => pos('DELI SHIFTS', 'Grill', '9:30–12:00', { description: 'Works the flat-top and grill cooking eggs, bacon, and proteins to order' })),
        ...repeat(5, () => pos('DELI SHIFTS', 'Food Assembly', '9:30–12:00', { description: 'Supports the full deli assembly line, including egg and egg-and-cheese sandwich assembly, schmearing bagels and rolls, bacon prep and portioning, coffee/milk service, beverage station upkeep, final sandwich wrapping, bagging, and handing completed orders to runners.' })),
        ...repeat(2, () => pos('DELI SHIFTS', 'Runner (Assist)', '9:30–12:00', { description: 'Delivers finished orders from the counter to customers and assists where needed' })),
        pos('DELI SHIFTS', 'Security', '10:00–12:30', { description: 'Manages crowd flow, enforces line order, and keeps the deli perimeter safe and fun' }),
        ...repeat(5, () => pos('DELI SHIFTS', 'Clean-up & Kitchen Reset', '12:00–2:30', { description: 'Deep cleans all stations, washes dishes, sanitizes surfaces, and resets the kitchen for the next day' })),
        ...repeat(2, () => pos('DELI SHIFTS', 'Entertainer/Crowd Control', '10:00–12:30', { description: 'Manages the bike valet area and entertains the crowd while they wait, Keeps the line moving and entertained with games, banter, or conversation' })),
        pos('DELI SHIFTS', 'DJ', '9:30–12:30', { description: 'Provides the soundtrack for deli service \u2014 sets the vibe and keeps energy high' }),
      ],
    },
    {
      name: 'SPECIAL EVENT SHIFTS',
      note: 'Deep Playa — Fri 9/4',
      positions: [
        pos('SPECIAL EVENT SHIFTS', 'Kitchen Lead (Deep Playa)', '3PM–6:30PM', { description: 'Leads kitchen operations for the deep playa soup service' }),
        pos('SPECIAL EVENT SHIFTS', 'Grill Lead (Deep Playa)', '3PM–6:30PM', { requiresExp: true, description: 'Runs the cooking station for the deep playa event' }),
        ...repeat(3, () => pos('SPECIAL EVENT SHIFTS', 'Volunteer Supervisor', '3PM–6:30PM', { description: 'Supervises 15\u201320 external volunteers from Camp Milk & Honey' })),
        ...repeat(4, () => pos('SPECIAL EVENT SHIFTS', 'Transport & Serving', '6:30PM–9PM', { description: 'Transports prepared food to deep playa and serves 1,000+ attendees' })),
      ],
    },
    {
      name: 'STRIKE SHIFTS (Sunday 9/6)',
      note: 'Teardown shifts',
      positions: [
        ...repeat(4, () => pos('STRIKE SHIFTS (Sunday 9/6)', 'Striker \u2013 Deco + Chill Tent', '8:30AM–11AM', { description: 'Tears down decorations and disassembles the public chill tent' })),
        ...repeat(4, () => pos('STRIKE SHIFTS (Sunday 9/6)', 'Striker \u2013 Service Kitchen', '8:30AM–11AM', { description: 'Breaks down the service kitchen \u2014 packs equipment, cleans, and loads out' })),
        ...repeat(4, () => pos('STRIKE SHIFTS (Sunday 9/6)', 'Striker \u2013 Plumbing/Shower', '8:30AM–11AM', { description: 'Disconnects plumbing, drains lines, and disassembles the shower container' })),
        ...repeat(4, () => pos('STRIKE SHIFTS (Sunday 9/6)', 'Striker \u2013 Power', '8:30AM–11AM', { description: 'Disconnects electrical systems, coils cabling, and packs generators' })),
        ...repeat(8, () => pos('STRIKE SHIFTS (Sunday 9/6)', 'Striker \u2013 Lighting/Shade/Bikes', '8:30AM–11AM', { description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks' })),
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
// Auto-Draft data layer (RPC-backed)
// ==========================================
//
// All write paths go through SECURITY DEFINER RPCs in migration 053.
// Reads use Supabase's PostgREST with RLS enforcing the policies.

// Helper: typed wrapper for RPC calls (Database type's Functions union doesn't
// always satisfy supabase-js v2's overload picker, so we cast through unknown).
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient()
  const { data, error } = await (supabase.rpc as unknown as (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>)(name, args)
  if (error) throw error
  return data as T
}

const STATUSES_OPEN = ['open', 'frozen', 'drafted'] as const

/** Fetch the most recent non-archived draft. */
export async function fetchActiveDraft(): Promise<ShiftDraftRow | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('shift_drafts')
    .select('*')
    .in('status', STATUSES_OPEN as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as ShiftDraftRow | null) ?? null
}

/** Fetch a specific draft by ID. */
export async function fetchDraft(draftId: string): Promise<ShiftDraftRow | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('shift_drafts')
    .select('*')
    .eq('id', draftId)
    .maybeSingle()
  return (data as ShiftDraftRow | null) ?? null
}

/** List all drafts (admin overview). */
export async function fetchAllDrafts(): Promise<ShiftDraftRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('shift_drafts')
    .select('*')
    .order('created_at', { ascending: false })
  return (data as ShiftDraftRow[] | null) ?? []
}

export interface CreateDraftInput {
  name: string
  deli_quota?: number
  special_quota?: number
  strike_quota?: number
  snake_start_round?: number
  created_by: string
}

/** Create a new draft (admin). */
export async function createDraft(input: CreateDraftInput): Promise<ShiftDraftRow> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shift_drafts')
    .insert({
      name: input.name,
      status: 'open',
      deli_quota: input.deli_quota ?? 4,
      special_quota: input.special_quota ?? 0,
      strike_quota: input.strike_quota ?? 1,
      snake_start_round: input.snake_start_round ?? 3,
      created_by: input.created_by,
    } as never)
    .select('*')
    .single()
  if (error) throw error
  return data as ShiftDraftRow
}

/** Update top-level draft settings. */
export async function updateDraftSettings(
  draftId: string,
  updates: Partial<Pick<ShiftDraftRow, 'name' | 'deli_quota' | 'special_quota' | 'strike_quota' | 'snake_start_round'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('shift_drafts').update(updates as never).eq('id', draftId)
  if (error) throw error
}

/** Delete a draft (cascades to offerings/order/rankings/assignments). */
export async function deleteDraft(draftId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('shift_drafts').delete().eq('id', draftId)
  if (error) throw error
}

// -------- Offerings --------

export async function fetchOfferings(draftId: string): Promise<ShiftOfferingRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('shift_offerings')
    .select('*')
    .eq('draft_id', draftId)
    .order('pool')
    .order('sort_order')
  return (data as ShiftOfferingRow[] | null) ?? []
}

export async function seedDefaultOfferings(draftId: string): Promise<number> {
  const data = await rpc<number>('seed_default_shift_offerings', { p_draft_id: draftId })
  return data ?? 0
}

export type OfferingDraft = Omit<ShiftOfferingRow, 'id' | 'created_at' | 'updated_at'>

export async function upsertOffering(
  offering: Partial<ShiftOfferingRow> & { id?: string; draft_id: string }
): Promise<ShiftOfferingRow> {
  const supabase = createClient()
  if (offering.id) {
    const { id, ...rest } = offering
    const { data, error } = await supabase
      .from('shift_offerings')
      .update(rest as never)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as ShiftOfferingRow
  }
  const { data, error } = await supabase
    .from('shift_offerings')
    .insert(offering as never)
    .select('*')
    .single()
  if (error) throw error
  return data as ShiftOfferingRow
}

export async function deleteOffering(offeringId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('shift_offerings').delete().eq('id', offeringId)
  if (error) throw error
}

// -------- Draft order (camper priority) --------

export async function fetchDraftOrder(draftId: string): Promise<ShiftDraftOrderWithCamper[]> {
  const supabase = createClient()
  const { data: orders } = await supabase
    .from('shift_draft_order')
    .select('*')
    .eq('draft_id', draftId)
    .order('draft_position')
  const list = (orders as ShiftDraftOrderRow[] | null) ?? []
  if (list.length === 0) return []

  const camperIds = list.map((o) => o.camper_id)
  const { data: campers } = await supabase
    .from('campers')
    .select('id, full_name, playa_name, email')
    .in('id', camperIds)
  const camperList = (campers as { id: string; full_name: string; playa_name: string | null; email: string }[] | null) ?? []
  const camperMap = new Map(camperList.map((c) => [c.id, c]))

  return list.map((o) => ({ ...o, camper: camperMap.get(o.camper_id) ?? null }))
}

export async function setDraftOrder(draftId: string, camperIds: string[]): Promise<void> {
  const supabase = createClient()
  await supabase.from('shift_draft_order').delete().eq('draft_id', draftId)
  if (camperIds.length === 0) return
  const rows = camperIds.map((camper_id, idx) => ({
    draft_id: draftId,
    camper_id,
    draft_position: idx + 1,
  }))
  const { error } = await supabase.from('shift_draft_order').insert(rows as never)
  if (error) throw error
}

// -------- Rankings --------

export async function fetchMyRankings(draftId: string, camperId: string): Promise<ShiftDraftRankingRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('shift_draft_rankings')
    .select('*')
    .eq('draft_id', draftId)
    .eq('camper_id', camperId)
    .order('rank')
  return (data as ShiftDraftRankingRow[] | null) ?? []
}

export async function fetchAllRankings(draftId: string): Promise<ShiftDraftRankingRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('shift_draft_rankings')
    .select('*')
    .eq('draft_id', draftId)
    .order('camper_id')
    .order('rank')
  return (data as ShiftDraftRankingRow[] | null) ?? []
}

export async function upsertCamperRanking(
  draftId: string,
  offeringId: string,
  rank: number,
  camperId?: string
): Promise<ShiftDraftRankingRow> {
  return rpc<ShiftDraftRankingRow>('upsert_camper_ranking', {
    p_draft_id: draftId,
    p_offering_id: offeringId,
    p_rank: rank,
    p_camper_id: camperId ?? null,
  })
}

export async function clearCamperRanking(draftId: string, offeringId: string, camperId?: string): Promise<void> {
  await rpc<unknown>('clear_camper_ranking', {
    p_draft_id: draftId,
    p_offering_id: offeringId,
    p_camper_id: camperId ?? null,
  })
}

export async function compactCamperRankings(draftId: string, camperId?: string): Promise<number> {
  const data = await rpc<number>('compact_camper_rankings', {
    p_draft_id: draftId,
    p_camper_id: camperId ?? null,
  })
  return data ?? 0
}

// -------- Freeze / publish --------

export async function freezeDraftRankings(draftId: string): Promise<ShiftDraftRow> {
  return rpc<ShiftDraftRow>('freeze_draft_rankings', { p_draft_id: draftId })
}

export async function unfreezeDraftRankings(draftId: string): Promise<ShiftDraftRow> {
  return rpc<ShiftDraftRow>('unfreeze_draft_rankings', { p_draft_id: draftId })
}

export async function publishDraft(draftId: string): Promise<ShiftDraftRow> {
  return rpc<ShiftDraftRow>('publish_draft', { p_draft_id: draftId })
}

// -------- Auto-draft execution --------

export interface AutoDraftPlannedAssignment {
  camper_id: string
  offering_id: string
  slot_index: number
  source: 'ranked' | 'random_fill' | 'manual'
  assigned_round: number | null
  rank_used: number | null
  category: string
  role: string
  time_label: string | null
  day_label: string | null
  day_date: string | null
  pool: DraftPool
  camper_name: string
  camper_playa_name: string | null
}

export interface AutoDraftResult {
  draft_id: string
  seed: number
  dry_run: boolean
  count: number
  assignments: AutoDraftPlannedAssignment[]
}

export async function runAutoDraft(
  draftId: string,
  opts?: { seed?: number; dryRun?: boolean }
): Promise<AutoDraftResult> {
  return rpc<AutoDraftResult>('run_auto_draft', {
    p_draft_id: draftId,
    p_seed: opts?.seed ?? null,
    p_dry_run: opts?.dryRun ?? false,
  })
}

// -------- Assignments --------

export async function fetchAssignments(draftId: string): Promise<ShiftDraftAssignmentRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('shift_draft_assignments')
    .select('*')
    .eq('draft_id', draftId)
  return (data as ShiftDraftAssignmentRow[] | null) ?? []
}

export async function swapAssignments(assignmentA: string, assignmentB: string): Promise<void> {
  await rpc<unknown>('swap_assignments', {
    p_assignment_a: assignmentA,
    p_assignment_b: assignmentB,
  })
}

/** Ad-hoc move: reassign a single assignment to a different offering (admin only).
 *  Caller supplies a free slot_index for the target offering (max existing + 1). */
export async function moveAssignment(
  assignmentId: string,
  targetOfferingId: string,
  newSlotIndex: number
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('shift_draft_assignments')
    .update({ offering_id: targetOfferingId, slot_index: newSlotIndex, source: 'manual' } as never)
    .eq('id', assignmentId)
  if (error) throw error
}

/** Remove a single assignment (admin only). */
export async function removeAssignment(assignmentId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('shift_draft_assignments')
    .delete()
    .eq('id', assignmentId)
  if (error) throw error
}
