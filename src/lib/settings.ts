import { createClient } from '@/lib/supabase/client'

/**
 * Organisation-wide settings — the ones that are true whether or not an event
 * is running.
 *
 * Anything that describes a single event (registration window, camp footprint,
 * camp selection) lives in `event_settings`; see src/lib/event-settings.ts.
 * `maintenance_mode` must stay here: proxy.ts reads it with an unauthenticated
 * client on every request, before any event is known.
 */

export const MAINTENANCE_KEY = 'maintenance_mode'

/** Fetch every system setting as a plain key -> value map. */
export async function fetchSettingsMap(): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data, error } = await supabase.from('system_settings').select('key, value')
  if (error || !data) return {}
  const map: Record<string, string> = {}
  for (const row of data as { key: string; value: string }[]) {
    map[row.key] = row.value
  }
  return map
}

/** Read a single boolean setting (defaults to `fallback` if missing/invalid). */
export async function fetchBooleanSetting(key: string, fallback = false): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  const value = (data as { value?: string } | null)?.value
  if (value === undefined) return fallback
  return value === 'true'
}
