'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import type { CamperUpdate, UserRole, UserProfileUpdate } from '@/types/database'

export type AdminActionResult = {
  success: boolean
  error?: string
  data?: unknown
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

export async function updateUserProfileAction(
  profileId: string,
  updates: UserProfileUpdate
): Promise<AdminActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('user_profiles')
    .update(updates as never)
    .eq('id', profileId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function linkCamperToProfileAction(
  profileId: string,
  camperEmail: string
): Promise<AdminActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  // Find camper by email
  const { data: camper } = await supabase
    .from('campers')
    .select('id')
    .eq('email', camperEmail)
    .single() as unknown as { data: { id: string } | null }

  if (!camper) return { success: false, error: 'No camper found with that email' }

  const { error } = await supabase
    .from('user_profiles')
    .update({ camper_id: camper.id } as never)
    .eq('id', profileId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateShiftPositionAction(
  positionId: string,
  updates: { role?: string; time?: string; category?: string; description?: string }
): Promise<AdminActionResult> {
  await requireAdmin()
  // Shift positions are hardcoded in the codebase, not in DB.
  // This action stores admin overrides in system_settings as JSON.
  const supabase = await createClient()

  const settingKey = 'shift_position_overrides'
  const { data: existing } = await supabase
    .from('system_settings')
    .select('*')
    .eq('key', settingKey)
    .single()

  let overrides: Record<string, typeof updates> = {}
  if (existing) {
    try { overrides = JSON.parse((existing as { value: string }).value) } catch { /* fresh */ }
    overrides[positionId] = { ...overrides[positionId], ...updates }
    const { error } = await supabase
      .from('system_settings')
      .update({ value: JSON.stringify(overrides), updated_at: new Date().toISOString() } as never)
      .eq('key', settingKey)
    if (error) return { success: false, error: error.message }
  } else {
    overrides[positionId] = updates
    const { error } = await supabase
      .from('system_settings')
      .insert({ key: settingKey, value: JSON.stringify(overrides) } as never)
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getShiftPositionOverridesAction(): Promise<AdminActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { data } = await supabase
    .from('system_settings')
    .select('*')
    .eq('key', 'shift_position_overrides')
    .single()

  if (!data) return { success: true, data: {} }
  try {
    return { success: true, data: JSON.parse((data as { value: string }).value) }
  } catch {
    return { success: true, data: {} }
  }
}

export async function adminResetPasswordAction(
  userId: string,
  newPassword: string
): Promise<AdminActionResult> {
  await requireAdmin()

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' }
  }

  const adminClient = createServiceClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}
