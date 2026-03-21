'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import type { CamperUpdate, UserRole } from '@/types/database'

export type AdminActionResult = {
  success: boolean
  error?: string
}

export async function updateCamperAction(
  camperId: string,
  updates: CamperUpdate
): Promise<AdminActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('campers')
    .update(updates as never)
    .eq('id', camperId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deleteCamperAction(
  camperId: string
): Promise<AdminActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('campers')
    .delete()
    .eq('id', camperId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateTaskStatusAction(
  taskId: string,
  status: 'pending' | 'active' | 'done'
): Promise<AdminActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('build_tasks')
    .update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    } as never)
    .eq('id', taskId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateSettingAction(
  key: string,
  value: string
): Promise<AdminActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('system_settings')
    .update({ value, updated_at: new Date().toISOString() } as never)
    .eq('key', key)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateUserRoleAction(
  profileId: string,
  newRole: UserRole
): Promise<AdminActionResult> {
  await requireAdmin()

  // Prevent non-admin from escalating roles (defense in depth)
  if (!['user', 'admin', 'pending'].includes(newRole)) {
    return { success: false, error: 'Invalid role' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('user_profiles')
    .update({ role: newRole } as never)
    .eq('id', profileId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
