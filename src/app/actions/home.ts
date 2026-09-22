'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { HOME_CTA_KEY, type HomeCtaConfig } from '@/lib/home-cta'

export type HomeActionResult = { success: true } | { success: false; error: string }

export async function saveHomeCtaConfigAction(config: HomeCtaConfig): Promise<HomeActionResult> {
  const { user } = await requireAdmin()

  for (const button of config.buttons) {
    if (button.enabled && (!button.label.trim() || !button.href.trim())) {
      return { success: false, error: 'Every enabled button needs a label and a link.' }
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('system_settings').upsert(
    {
      key: HOME_CTA_KEY,
      value: JSON.stringify(config),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'key' }
  )
  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  return { success: true }
}
