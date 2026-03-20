import { createClient } from '@/lib/supabase/client'
import type {
  BuildStage,
  BuildGoal,
  BuildResource,
  BuildProcedure,
  BuildQuestion,
  BuildStageWithGoals,
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

export async function updateResourceStatus(resourceId: string, status: 'have' | 'need' | 'fix' | 'discard') {
  const supabase = createClient()
  const { error } = await supabase
    .from('build_resources')
    .update({ status } as never)
    .eq('id', resourceId)
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
}

export const RESOURCE_STATUS_COLORS: Record<string, string> = {
  have: 'bg-green-100 text-green-800 border-green-400',
  need: 'bg-red-100 text-red-800 border-red-400',
  fix: 'bg-yellow-100 text-yellow-800 border-yellow-400',
  discard: 'bg-gray-100 text-gray-500 border-gray-400 line-through',
}
