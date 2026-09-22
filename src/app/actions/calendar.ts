'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import type { CampEventInsert, CampEventRow, CampEventUpdate } from '@/types/database'

export type CalendarActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

function fail(error: string): CalendarActionResult<never> {
  return { success: false, error }
}

function revalidateCalendar() {
  revalidatePath('/calendar')
  revalidatePath('/admin/calendar')
  revalidatePath('/')
}

/** Camp calendar items live at the NYC Deli level; `event_id` is optional. */
export async function createCalendarItemAction(
  input: CampEventInsert
): Promise<CalendarActionResult<CampEventRow>> {
  const { user, profile } = await requireAdmin()
  if (!input.title?.trim()) return fail('Title is required')
  if (!input.event_date) return fail('Date is required')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('camp_events')
    .insert({
      ...input,
      title: input.title.trim(),
      created_by: profile.email,
      created_by_user_id: user.id,
    } as never)
    .select('*')
    .single()
  if (error) return fail(error.message)

  revalidateCalendar()
  return { success: true, data: data as CampEventRow }
}

export async function updateCalendarItemAction(
  id: string,
  patch: CampEventUpdate
): Promise<CalendarActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('camp_events').update(patch as never).eq('id', id)
  if (error) return fail(error.message)

  revalidateCalendar()
  return { success: true }
}

export async function deleteCalendarItemAction(id: string): Promise<CalendarActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('camp_events').delete().eq('id', id)
  if (error) return fail(error.message)

  revalidateCalendar()
  return { success: true }
}
