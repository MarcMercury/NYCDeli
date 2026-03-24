import { createClient } from '@/lib/supabase/client'
import type {
  BuildStage,
  BuildGoal,
  BuildResource,
  BuildProcedure,
  BuildQuestion,
  BuildStageWithGoals,
  BuildInventory,
  Camper,
} from '@/types/database'

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
  logistics: '📦',
  safety: '🛡️',
  layout: '📐',
  decoration: '🎨',
  personal: '🧑',
  shade_structure: '⛱️',
  tool: '🔧',
  large_equipment: '🚛',
  container: '📦',
  kitchen_item: '🍳',
  av_equip: '🔊',
  electrical: '⚡',
  plumbing: '🚿',
  furniture: '🛋️',
  other: '🏷️',
  bm_utility: '🔶',
}

export const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: 'bg-blue-100 text-blue-800 border-blue-300',
  shelter: 'bg-orange-100 text-orange-800 border-orange-300',
  kitchen: 'bg-red-100 text-red-800 border-red-300',
  logistics: 'bg-purple-100 text-purple-800 border-purple-300',
  safety: 'bg-green-100 text-green-800 border-green-300',
  layout: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  decoration: 'bg-pink-100 text-pink-800 border-pink-300',
  personal: 'bg-gray-100 text-gray-800 border-gray-300',
  shade_structure: 'bg-amber-100 text-amber-800 border-amber-300',
  tool: 'bg-slate-100 text-slate-800 border-slate-300',
  large_equipment: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  container: 'bg-violet-100 text-violet-800 border-violet-300',
  kitchen_item: 'bg-red-100 text-red-800 border-red-300',
  av_equip: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  electrical: 'bg-blue-100 text-blue-800 border-blue-300',
  plumbing: 'bg-teal-100 text-teal-800 border-teal-300',
  furniture: 'bg-stone-100 text-stone-800 border-stone-300',
  other: 'bg-gray-100 text-gray-800 border-gray-300',
  bm_utility: 'bg-orange-100 text-orange-800 border-orange-300',
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
  kitchen_item: '🍳',
  av_equip: '🔊',
  electrical: '⚡',
  plumbing: '🚿',
  furniture: '🛋️',
  other: '🏷️',
  bm_utility: '🔶',
}
