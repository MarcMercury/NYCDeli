import { createClient } from '@/lib/supabase/client'
import type { DeliSupabase } from '@/lib/events'

/**
 * Settings that describe one event rather than the organisation.
 *
 * These lived in `system_settings`, which meant the 2026 camp footprint and
 * registration deadline would quietly become 2027's. They now live in
 * `event_settings` keyed by event, and reads fall back to the old global row so
 * nothing breaks while an event has no override of its own.
 *
 * Deliberately NOT here: `maintenance_mode` (proxy.ts reads it with an
 * unauthenticated client on every request, before any event is known) and
 * `home_ctas` (org-level). Those stay in `system_settings`.
 */

export type EventSettingType = 'date' | 'number' | 'boolean' | 'text'

export type EventSettingGroup = 'Applications & Intake' | 'Camp Geometry' | 'Camp Selection'

export interface EventSettingDef {
  key: string
  label: string
  help?: string
  type: EventSettingType
  group: EventSettingGroup
  /** Used when neither the event nor the global table has a value. */
  fallback: string
}

export const EVENT_SETTINGS_SCHEMA: EventSettingDef[] = [
  {
    key: 'registration_deadline',
    label: 'Registration Deadline',
    type: 'date',
    group: 'Applications & Intake',
    fallback: '',
    help: 'Shown to applicants. The hard gate is the event stage plus Applications Open.',
  },
  {
    key: 'intake_open',
    label: 'Intake Form Open',
    type: 'boolean',
    group: 'Applications & Intake',
    fallback: 'false',
    help: 'When off, the public intake form stops accepting new registrations for this event.',
  },
  { key: 'camp_width_ft', label: 'Camp Width (ft)', type: 'number', group: 'Camp Geometry', fallback: '150' },
  { key: 'camp_length_ft', label: 'Camp Length (ft)', type: 'number', group: 'Camp Geometry', fallback: '300' },
  { key: 'min_tent_spacing_ft', label: 'Min Tent Spacing (ft)', type: 'number', group: 'Camp Geometry', fallback: '3' },
  {
    key: 'camp_selection_enabled',
    label: 'Camp Selection Enabled',
    type: 'boolean',
    group: 'Camp Selection',
    fallback: 'false',
    help: 'Let campers pick their own spot for this event.',
  },
  {
    key: 'camp_selection_open_date',
    label: 'Camp Selection Open Date',
    type: 'date',
    group: 'Camp Selection',
    fallback: '',
  },
]

export const EVENT_SETTING_GROUPS: EventSettingGroup[] = [
  'Applications & Intake',
  'Camp Geometry',
  'Camp Selection',
]

export const EVENT_SETTING_KEYS: string[] = EVENT_SETTINGS_SCHEMA.map(def => def.key)

function db(client?: DeliSupabase): DeliSupabase {
  return client ?? (createClient() as DeliSupabase)
}

export type EventSettingsMap = Record<string, string>

/**
 * Resolved settings for one event: the event's own values layered over the
 * legacy global values, layered over the schema defaults.
 */
export async function fetchEventSettings(
  eventId: string | null,
  client?: DeliSupabase
): Promise<EventSettingsMap> {
  const supabase = db(client)

  const [globalRes, eventRes] = await Promise.all([
    supabase.from('system_settings').select('key, value').in('key', EVENT_SETTING_KEYS),
    eventId
      ? supabase.from('event_settings').select('key, value').eq('event_id', eventId)
      : Promise.resolve({ data: [] as { key: string; value: string }[] }),
  ])

  const map: EventSettingsMap = {}
  for (const def of EVENT_SETTINGS_SCHEMA) map[def.key] = def.fallback
  for (const row of (globalRes.data as { key: string; value: string }[] | null) ?? []) map[row.key] = row.value
  for (const row of (eventRes.data as { key: string; value: string }[] | null) ?? []) map[row.key] = row.value
  return map
}

/** Only the values this event actually overrides, for the admin form. */
export async function fetchEventSettingOverrides(
  eventId: string,
  client?: DeliSupabase
): Promise<EventSettingsMap> {
  const { data } = await db(client).from('event_settings').select('key, value').eq('event_id', eventId)
  const map: EventSettingsMap = {}
  for (const row of (data as { key: string; value: string }[] | null) ?? []) map[row.key] = row.value
  return map
}

export function settingBoolean(map: EventSettingsMap, key: string): boolean {
  return map[key] === 'true'
}

export function settingNumber(map: EventSettingsMap, key: string, fallback: number): number {
  const n = Number(map[key])
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export interface CampDimensions {
  widthFt: number
  lengthFt: number
  minSpacingFt: number
}

export function campDimensions(map: EventSettingsMap): CampDimensions {
  return {
    widthFt: settingNumber(map, 'camp_width_ft', 150),
    lengthFt: settingNumber(map, 'camp_length_ft', 300),
    minSpacingFt: settingNumber(map, 'min_tent_spacing_ft', 3),
  }
}
