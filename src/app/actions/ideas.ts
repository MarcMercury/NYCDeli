'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireApproved } from '@/lib/auth'
import type { DeliIdeaInsert, DeliPostType } from '@/types/database'

export type IdeaActionResult = {
  success: boolean
  error?: string
}

export async function submitIdeaAction(
  data: { title: string; body: string; category: string; postType?: DeliPostType }
): Promise<IdeaActionResult> {
  const { user, profile } = await requireApproved()

  if (!data.title.trim() || !data.body.trim()) {
    return { success: false, error: 'Title and description are required' }
  }

  if (data.title.length > 200) {
    return { success: false, error: 'Title must be under 200 characters' }
  }

  if (data.body.length > 5000) {
    return { success: false, error: 'Description must be under 5000 characters' }
  }

  const postType: DeliPostType = data.postType === 'question' ? 'question' : 'idea'

  const supabase = await createClient()

  const insert: DeliIdeaInsert = {
    user_id: user.id,
    author_name: profile.email,
    author_email: profile.email,
    post_type: postType,
    category: data.category || 'general',
    title: data.title.trim(),
    body: data.body.trim(),
  }

  const { error } = await supabase
    .from('deli_ideas')
    .insert(insert as never)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function markIdeaReadAction(
  ideaId: string,
  isRead: boolean
): Promise<IdeaActionResult> {
  const { user } = await requireAdmin()

  const supabase = await createClient()

  const { error } = await supabase
    .from('deli_ideas')
    .update({
      is_read: isRead,
      read_at: isRead ? new Date().toISOString() : null,
      read_by: isRead ? user.id : null,
    } as never)
    .eq('id', ideaId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function respondToQuestionAction(
  ideaId: string,
  response: string
): Promise<IdeaActionResult> {
  const { user } = await requireAdmin()

  const trimmed = response.trim()
  if (!trimmed) {
    return { success: false, error: 'Response cannot be empty' }
  }
  if (trimmed.length > 5000) {
    return { success: false, error: 'Response must be under 5000 characters' }
  }

  const supabase = await createClient()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('deli_ideas')
    .update({
      admin_response: trimmed,
      responded_at: now,
      responded_by: user.id,
      is_read: true,
      read_at: now,
      read_by: user.id,
    } as never)
    .eq('id', ideaId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function clearQuestionResponseAction(
  ideaId: string
): Promise<IdeaActionResult> {
  await requireAdmin()

  const supabase = await createClient()

  const { error } = await supabase
    .from('deli_ideas')
    .update({
      admin_response: null,
      responded_at: null,
      responded_by: null,
    } as never)
    .eq('id', ideaId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
