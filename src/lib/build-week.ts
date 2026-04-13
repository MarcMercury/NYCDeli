import { createClient } from '@/lib/supabase/client'
import type {
  BuildStage,
  BuildGoal,
  BuildResource,
  BuildProcedure,
  BuildQuestion,
  BuildStageWithGoals,
  BuildInventory,
  BuildScheduleItem,
  ElectricalLoadConfig,
  ElectricalDistroBox,
  ElectricalLoadItem,
  Camper,
  UserProfile,
} from '@/types/database'

export type RosterMember = {
  id: string
  role: 'admin' | 'builder'
  email: string
  camper: Camper | null
}

export async function fetchBuildStages(): Promise<BuildStage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('build_stages')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data as BuildStage[]) || []
}

export async function fetchBuildGoals(): Promise<BuildGoal[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('build_goals')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data as BuildGoal[]) || []
}

export async function fetchBuildStagesWithGoals(): Promise<BuildStageWithGoals[]> {
  const [stages, goals] = await Promise.all([
    fetchBuildStages(),
    fetchBuildGoals(),
  ])
  return stages.map(stage => ({
    ...stage,
    goals: goals.filter(g => g.stage_id === stage.id),
  }))
}

export async function fetchBuildResources(): Promise<BuildResource[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('build_resources')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data as BuildResource[]) || []
}

export async function fetchBuildProcedures(): Promise<BuildProcedure[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('build_procedures')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data as BuildProcedure[]) || []
}

export async function fetchBuildQuestions(): Promise<BuildQuestion[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('build_questions')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data as BuildQuestion[]) || []
}

export async function fetchBuildWeekBuilders(): Promise<Camper[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('campers')
    .select('*')
    .eq('build_week_attending', true)
    .order('build_week_arrival_date')
  if (error) throw error
  return (data as Camper[]) || []
}

export async function fetchBuildWeekRoster(): Promise<RosterMember[]> {
  const supabase = createClient()
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id, email, role, camper_id')
    .in('role', ['admin', 'builder'])
    .order('role')
  if (error) throw error
  if (!profiles || profiles.length === 0) return []

  const camperIds = profiles
    .map((p: { camper_id: string | null }) => p.camper_id)
    .filter((id): id is string => id != null)

  let camperMap: Record<string, Camper> = {}
  if (camperIds.length > 0) {
    const { data: campers } = await supabase
      .from('campers')
      .select('*')
      .in('id', camperIds)
    if (campers) {
      camperMap = Object.fromEntries((campers as Camper[]).map(c => [c.id, c]))
    }
  }

  return profiles.map((p: { id: string; email: string; role: string; camper_id: string | null }) => ({
    id: p.id,
    role: p.role as 'admin' | 'builder',
    email: p.email,
    camper: p.camper_id ? camperMap[p.camper_id] || null : null,
  }))
}

export async function updateGoalStatus(goalId: string, status: 'pending' | 'active' | 'done') {
  const supabase = createClient()
  const { error } = await supabase
    .from('build_goals')
    .update({ status } as never)
    .eq('id', goalId)
  if (error) throw error
}

export async function updateQuestionStatus(questionId: string, status: 'open' | 'resolved' | 'deferred', resolution?: string) {
  const supabase = createClient()
  const update: Record<string, string> = { status }
  if (resolution !== undefined) update.resolution = resolution
  const { error } = await supabase
    .from('build_questions')
    .update(update as never)
    .eq('id', questionId)
  if (error) throw error
}

export async function createBuildQuestion(question: {
  question: string
  category: string
  context?: string
  is_pain_point?: boolean
}): Promise<BuildQuestion> {
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('build_questions')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = existing && existing.length > 0 ? (existing[0] as { sort_order: number }).sort_order + 1 : 0

  const { data, error } = await supabase
    .from('build_questions')
    .insert({ ...question, status: 'open', sort_order: nextOrder } as never)
    .select()
    .single()
  if (error) throw error
  return data as BuildQuestion
}

export async function updateBuildQuestion(questionId: string, updates: {
  question?: string
  category?: string
  context?: string | null
  is_pain_point?: boolean
}) {
  const supabase = createClient()
  const { error } = await supabase
    .from('build_questions')
    .update(updates as never)
    .eq('id', questionId)
  if (error) throw error
}

export async function deleteBuildQuestion(questionId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('build_questions')
    .delete()
    .eq('id', questionId)
  if (error) throw error
}

export async function updateResourceStatus(resourceId: string, status: 'have' | 'need' | 'fix' | 'discard') {
  const supabase = createClient()
  const { error } = await supabase
    .from('build_resources')
    .update({ status } as never)
    .eq('id', resourceId)
  if (error) throw error
}

export async function createBuildResource(resource: {
  name: string
  category: string
  description?: string
  quantity?: string
  status: string
  priority?: string
  stage_needed?: string | null
  notes?: string
}): Promise<BuildResource> {
  const supabase = createClient()
  // Get the max sort_order to put new item at the end
  const { data: existing } = await supabase
    .from('build_resources')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = existing && existing.length > 0 ? (existing[0] as { sort_order: number }).sort_order + 1 : 0

  const { data, error } = await supabase
    .from('build_resources')
    .insert({ ...resource, sort_order: nextOrder } as never)
    .select()
    .single()
  if (error) throw error
  return data as BuildResource
}

export async function updateBuildResource(resourceId: string, updates: {
  name?: string
  category?: string
  description?: string | null
  quantity?: string | null
  count?: number
  status?: string
  priority?: string | null
  stage_needed?: string | null
  confirmed_working?: boolean
  notes?: string | null
}) {
  const supabase = createClient()
  const { error } = await supabase
    .from('build_resources')
    .update(updates as never)
    .eq('id', resourceId)
  if (error) throw error
}

export async function deleteBuildResource(resourceId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('build_resources')
    .delete()
    .eq('id', resourceId)
  if (error) throw error
}

// ── Inventory CRUD ──

export async function fetchBuildInventory(): Promise<BuildInventory[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('build_inventory')
    .select('*')
    .order('category')
    .order('sort_order')
  if (error) throw error
  return (data as BuildInventory[]) || []
}

export async function createInventoryItem(item: {
  name: string
  category: string
  description?: string
  size_w?: string
  size_l?: string
  quantity_expected: number
  notes?: string
  floorplan_object_id?: string | null
}): Promise<BuildInventory> {
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('build_inventory')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = existing && existing.length > 0 ? (existing[0] as { sort_order: number }).sort_order + 1 : 0

  const { data, error } = await supabase
    .from('build_inventory')
    .insert({ ...item, sort_order: nextOrder } as never)
    .select()
    .single()
  if (error) throw error
  return data as BuildInventory
}

export async function updateInventoryItem(itemId: string, updates: {
  name?: string
  category?: string
  description?: string | null
  size_w?: string | null
  size_l?: string | null
  quantity_expected?: number
  quantity_actual?: number
  verified?: boolean
  verified_by?: string | null
  verified_at?: string | null
  confirmed_working?: boolean
  notes?: string | null
  floorplan_object_id?: string | null
}) {
  const supabase = createClient()
  const { error } = await supabase
    .from('build_inventory')
    .update(updates as never)
    .eq('id', itemId)
  if (error) throw error
}

export async function deleteInventoryItem(itemId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('build_inventory')
    .delete()
    .eq('id', itemId)
  if (error) throw error
}

export const STAGE_ICONS: Record<string, string> = {
  planning: '📋',
  monday: '📍',
  tuesday: '🔨',
  wednesday: '🏗️',
  thursday: '⚡',
  friday: '🎉',
}

export const CATEGORY_ICONS: Record<string, string> = {
  infrastructure: '⚡',
  shelter: '⛺',
  kitchen: '🍳',
  logistics: '�',
  safety: '🛡️',
  layout: '📐',
  decoration: '🎨',
  personal: '🧑',
  shade_structure: '⛱️',
  tool: '🔧',
  large_equipment: '🚛',
  container: '📦',
  av_equip: '🔊',
  electrical: '⚡',
  plumbing: '🚿',
  furniture: '🛋️',
  other: '🏷️',
}

export const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: 'bg-blue-100 text-blue-800 border-blue-300',
  shelter: 'bg-orange-100 text-orange-800 border-orange-300',
  kitchen: 'bg-red-100 text-red-800 border-red-300',
  logistics: 'bg-slate-100 text-slate-800 border-slate-300',
  safety: 'bg-green-100 text-green-800 border-green-300',
  layout: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  decoration: 'bg-pink-100 text-pink-800 border-pink-300',
  personal: 'bg-gray-100 text-gray-800 border-gray-300',
  shade_structure: 'bg-amber-100 text-amber-800 border-amber-300',
  tool: 'bg-slate-100 text-slate-800 border-slate-300',
  large_equipment: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  container: 'bg-violet-100 text-violet-800 border-violet-300',
  av_equip: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  electrical: 'bg-blue-100 text-blue-800 border-blue-300',
  plumbing: 'bg-teal-100 text-teal-800 border-teal-300',
  furniture: 'bg-stone-100 text-stone-800 border-stone-300',
  other: 'bg-gray-100 text-gray-800 border-gray-300',
}

export const RESOURCE_STATUS_COLORS: Record<string, string> = {
  have: 'bg-green-100 text-green-800 border-green-400',
  need: 'bg-red-100 text-red-800 border-red-400',
  fix: 'bg-yellow-100 text-yellow-800 border-yellow-400',
  discard: 'bg-gray-100 text-gray-500 border-gray-400 line-through',
}

export const INVENTORY_CATEGORY_ICONS: Record<string, string> = {
  shade_structure: '⛱️',
  tool: '🔧',
  large_equipment: '🚛',
  container: '📦',
  kitchen: '🍳',
  av_equip: '🔊',
  electrical: '⚡',
  plumbing: '🚿',
  furniture: '🛋️',
  layout: '📐',
  other: '🏷️',
}

// ==========================================
// Build Schedule
// ==========================================

export const BUILD_SCHEDULE_DAYS = [
  'pre_build', 'saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
] as const

export const BUILD_SCHEDULE_DAY_LABELS: Record<string, string> = {
  pre_build: 'PRE-Build Week',
  saturday: 'Saturday',
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
}

export const SCHEDULE_CATEGORY_ICONS: Record<string, string> = {
  delivery: '🚚',
  infrastructure: '🏗️',
  shade: '⛱️',
  kitchen: '🍳',
  electrical: '⚡',
  plumbing: '🚿',
  layout: '📐',
  decoration: '🎨',
  logistics: '📦',
  safety: '🛡️',
  other: '🏷️',
}

export const SCHEDULE_CATEGORY_COLORS: Record<string, string> = {
  delivery: 'bg-purple-100 text-purple-800',
  infrastructure: 'bg-blue-100 text-blue-800',
  shade: 'bg-amber-100 text-amber-800',
  kitchen: 'bg-red-100 text-red-800',
  electrical: 'bg-yellow-100 text-yellow-800',
  plumbing: 'bg-teal-100 text-teal-800',
  layout: 'bg-orange-100 text-orange-800',
  decoration: 'bg-pink-100 text-pink-800',
  logistics: 'bg-slate-100 text-slate-800',
  safety: 'bg-green-100 text-green-800',
  other: 'bg-gray-100 text-gray-800',
}

export async function fetchBuildSchedule(): Promise<BuildScheduleItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('build_schedule_items')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data as BuildScheduleItem[]) || []
}

export async function createScheduleItem(
  item: Omit<BuildScheduleItem, 'id' | 'created_at' | 'updated_at'>
): Promise<BuildScheduleItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('build_schedule_items')
    .insert(item as never)
    .select()
    .single()
  if (error) throw error
  return data as BuildScheduleItem
}

export async function updateScheduleItem(
  id: string,
  updates: Partial<Omit<BuildScheduleItem, 'id' | 'created_at' | 'updated_at'>>
): Promise<BuildScheduleItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('build_schedule_items')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as BuildScheduleItem
}

export async function deleteScheduleItem(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('build_schedule_items')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function reorderScheduleItems(
  items: { id: string; sort_order: number; day: string }[]
): Promise<void> {
  const supabase = createClient()
  for (const item of items) {
    const { error } = await supabase
      .from('build_schedule_items')
      .update({ sort_order: item.sort_order, day: item.day } as never)
      .eq('id', item.id)
    if (error) throw error
  }
}

// ==========================================
// Electrical Load Calculator
// ==========================================

export async function fetchElectricalConfig(): Promise<ElectricalLoadConfig | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('electrical_load_config')
    .select('*')
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data as ElectricalLoadConfig | null
}

export async function updateElectricalConfig(id: string, updates: { generator_kw: number }): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('electrical_load_config')
    .update(updates as never)
    .eq('id', id)
  if (error) throw error
}

export async function fetchDistroBoxes(): Promise<ElectricalDistroBox[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('electrical_distro_boxes')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data as ElectricalDistroBox[]) || []
}

export async function createDistroBox(box: {
  name: string
  max_amps: number
  voltage?: number
  notes?: string
}): Promise<ElectricalDistroBox> {
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('electrical_distro_boxes')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = existing && existing.length > 0 ? (existing[0] as { sort_order: number }).sort_order + 1 : 0

  const { data, error } = await supabase
    .from('electrical_distro_boxes')
    .insert({ ...box, voltage: box.voltage ?? 120, sort_order: nextOrder } as never)
    .select()
    .single()
  if (error) throw error
  return data as ElectricalDistroBox
}

export async function updateDistroBox(id: string, updates: {
  name?: string
  max_amps?: number
  voltage?: number
  notes?: string | null
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('electrical_distro_boxes')
    .update(updates as never)
    .eq('id', id)
  if (error) throw error
}

export async function deleteDistroBox(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('electrical_distro_boxes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function fetchElectricalLoadItems(): Promise<ElectricalLoadItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('electrical_load_items')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data as ElectricalLoadItem[]) || []
}

export async function createElectricalLoadItem(item: {
  name: string
  location?: string
  voltage?: number
  amperage: number
  wattage: number
  plug_type?: string
  quantity: number
  total_amps: number
  total_wattage: number
  notes?: string
  distro_box_id?: string | null
  floorplan_object_id?: string | null
}): Promise<ElectricalLoadItem> {
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('electrical_load_items')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = existing && existing.length > 0 ? (existing[0] as { sort_order: number }).sort_order + 1 : 0

  const { data, error } = await supabase
    .from('electrical_load_items')
    .insert({
      ...item,
      voltage: item.voltage ?? 120,
      plug_type: item.plug_type ?? 'standard',
      sort_order: nextOrder,
    } as never)
    .select()
    .single()
  if (error) throw error
  return data as ElectricalLoadItem
}

export async function updateElectricalLoadItem(id: string, updates: {
  name?: string
  location?: string | null
  voltage?: number
  amperage?: number
  wattage?: number
  plug_type?: string
  quantity?: number
  total_amps?: number
  total_wattage?: number
  notes?: string | null
  distro_box_id?: string | null
  floorplan_object_id?: string | null
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('electrical_load_items')
    .update(updates as never)
    .eq('id', id)
  if (error) throw error
}

export async function deleteElectricalLoadItem(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('electrical_load_items')
    .delete()
    .eq('id', id)
  if (error) throw error
}
