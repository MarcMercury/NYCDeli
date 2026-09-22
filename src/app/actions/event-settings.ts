'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { EVENT_SETTING_KEYS } from '@/lib/event-settings'

export type EventSettingResult = { success: true } | { success: false; error: string }

export async function updateEventSettingAction(
  eventId: string,
  key: string,
  value: string
): Promise<EventSettingResult> {
  await requireAdmin()

  if (!EVENT_SETTING_KEYS.includes(key)) {
    return { success: false, error: `"${key}" is not an event setting.` }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('event_settings')
    .upsert({ event_id: eventId, key, value } as never, { onConflict: 'event_id,key' })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/admin/events/${eventId}`)
  revalidatePath('/intake')
  revalidatePath('/map')
  return { success: true }
}
