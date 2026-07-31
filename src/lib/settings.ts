import { createClient } from '@/lib/supabase/client'

/**
 * Central registry of admin-editable system settings. This is the single source
 * of truth for the grouped Settings UI and for typed reads across the app.
 * Only keys listed here are surfaced in the admin Settings form — internal keys
 * (e.g. shift_position_overrides, last_published_draft_id) stay hidden.
 */

export type SettingType = 'date' | 'number' | 'boolean' | 'text'

export interface SettingDef {
  key: string
  label: string
  help?: string
  type: SettingType
  group: SettingGroup
}

export type SettingGroup =
  | 'Event Timeline'
  | 'Registration & Intake'
  | 'Camp Geometry'
  | 'Camp Selection'

export const MAINTENANCE_KEY = 'maintenance_mode'

export const SETTINGS_SCHEMA: SettingDef[] = [
  // Event Timeline — drives the homepage countdown and date-gated copy
  { key: 'burn_start_date', label: 'Burn Start Date', type: 'date', group: 'Event Timeline', help: 'Gate opens / event start. Drives the homepage countdown.' },
  { key: 'burn_end_date', label: 'Burn End Date', type: 'date', group: 'Event Timeline' },
  { key: 'build_week_start', label: 'Build Week Start', type: 'date', group: 'Event Timeline' },

  // Registration & Intake
  { key: 'registration_deadline', label: 'Registration Deadline', type: 'date', group: 'Registration & Intake' },
  { key: 'intake_open', label: 'Intake Open', type: 'boolean', group: 'Registration & Intake', help: 'When off, new registrations are closed.' },

  // Camp Geometry — drives the layout viewer
  { key: 'camp_width_ft', label: 'Camp Width (ft)', type: 'number', group: 'Camp Geometry' },
  { key: 'camp_length_ft', label: 'Camp Length (ft)', type: 'number', group: 'Camp Geometry' },
  { key: 'min_tent_spacing_ft', label: 'Min Tent Spacing (ft)', type: 'number', group: 'Camp Geometry' },

  // Camp Selection
  { key: 'camp_selection_enabled', label: 'Camp Selection Enabled', type: 'boolean', group: 'Camp Selection', help: 'Let campers pick their own spot.' },
  { key: 'camp_selection_open_date', label: 'Camp Selection Open Date', type: 'date', group: 'Camp Selection' },
]

export const SETTING_GROUPS: SettingGroup[] = [
  'Event Timeline',
  'Registration & Intake',
  'Camp Geometry',
  'Camp Selection',
]

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

// ---- Typed convenience getters used by feature code -------------------------

export interface CampDimensions {
  widthFt: number
  lengthFt: number
  minSpacingFt: number
}

const CAMP_DIMENSION_DEFAULTS: CampDimensions = {
  widthFt: 150,
  lengthFt: 300,
  minSpacingFt: 3,
}

function toNumber(value: string | undefined, fallback: number): number {
  const n = value != null ? Number(value) : NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Camp dimensions for the layout viewer, falling back to legacy constants. */
export async function fetchCampDimensions(): Promise<CampDimensions> {
  const map = await fetchSettingsMap()
  return {
    widthFt: toNumber(map.camp_width_ft, CAMP_DIMENSION_DEFAULTS.widthFt),
    lengthFt: toNumber(map.camp_length_ft, CAMP_DIMENSION_DEFAULTS.lengthFt),
    minSpacingFt: toNumber(map.min_tent_spacing_ft, CAMP_DIMENSION_DEFAULTS.minSpacingFt),
  }
}

/** Burn start date as a Date, or null if unset/invalid. */
export async function fetchBurnStartDate(): Promise<Date | null> {
  const map = await fetchSettingsMap()
  const raw = map.burn_start_date
  if (!raw) return null
  // Anchor bare dates to Black Rock City time (PDT) at midnight.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00-07:00` : raw
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}
