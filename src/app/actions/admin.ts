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
  if (!['user', 'builder', 'admin', 'pending'].includes(newRole)) {
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

/** Helper to load and save shift overrides JSON */
async function loadShiftOverrides(): Promise<{ overrides: Record<string, unknown>; exists: boolean }> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('system_settings')
    .select('*')
    .eq('key', 'shift_position_overrides')
    .single()

  let overrides: Record<string, unknown> = {}
  if (existing) {
    try { overrides = JSON.parse((existing as { value: string }).value) } catch { /* fresh */ }
  }
  return { overrides, exists: !!existing }
}

async function saveShiftOverrides(overrides: Record<string, unknown>, exists: boolean): Promise<AdminActionResult> {
  const supabase = await createClient()
  const settingKey = 'shift_position_overrides'

  if (exists) {
    const { error } = await supabase
      .from('system_settings')
      .update({ value: JSON.stringify(overrides), updated_at: new Date().toISOString() } as never)
      .eq('key', settingKey)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('system_settings')
      .insert({ key: settingKey, value: JSON.stringify(overrides) } as never)
    if (error) return { success: false, error: error.message }
  }
  return { success: true }
}

/** Delete (soft) a single shift position by marking it deleted in overrides */
export async function deleteShiftPositionAction(
  positionKey: string
): Promise<AdminActionResult> {
  await requireAdmin()
  const { overrides, exists } = await loadShiftOverrides()
  overrides[positionKey] = { ...(overrides[positionKey] as Record<string, unknown> || {}), deleted: true }
  return saveShiftOverrides(overrides, exists)
}

/** Restore a previously deleted shift position */
export async function restoreShiftPositionAction(
  positionKey: string
): Promise<AdminActionResult> {
  await requireAdmin()
  const { overrides, exists } = await loadShiftOverrides()
  const posOverride = overrides[positionKey] as Record<string, unknown> | undefined
  if (posOverride) {
    delete posOverride.deleted
    // If no other overrides remain, remove the key entirely
    if (Object.keys(posOverride).length === 0) {
      delete overrides[positionKey]
    }
  }
  return saveShiftOverrides(overrides, exists)
}

/** Delete (soft) an entire shift category */
export async function deleteShiftCategoryAction(
  categoryKey: string
): Promise<AdminActionResult> {
  await requireAdmin()
  const { overrides, exists } = await loadShiftOverrides()
  overrides[`_cat_deleted:${categoryKey}`] = true
  return saveShiftOverrides(overrides, exists)
}

/** Restore a previously deleted shift category */
export async function restoreShiftCategoryAction(
  categoryKey: string
): Promise<AdminActionResult> {
  await requireAdmin()
  const { overrides, exists } = await loadShiftOverrides()
  delete overrides[`_cat_deleted:${categoryKey}`]
  return saveShiftOverrides(overrides, exists)
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

// ─── CSV Camper Import ─────────────────────────────────────────────

interface CamperCSVRow {
  email: string
  full_name: string
  phone: string | null
  shelter_type: string
  shelter_length_ft: number
  shelter_width_ft: number
  shelter_height_ft: number | null
  vehicle_info: string | null
  emergency_contact: string | null
  emergency_contact_name: string | null
  emergency_contact_number: string | null
  emergency_contact_relationship: string | null
  medical_conditions: string | null
  medications: string | null
  allergies: string | null
  dietary_restrictions: string | null
  custom_skills: string | null
  burn_count: string | null
  what_attracted_you: string | null
  referral_source: string | null
  character_references: string | null
  first_burn_hopes: string | null
  volunteer_commitment: boolean
  sober_shifts: boolean
  background_check_consent: boolean
  notes: string | null
}

function parseCSVText(text: string): string[][] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') { inQuotes = !inQuotes; current += ch }
    else if (ch === '\n' && !inQuotes) { lines.push(current); current = '' }
    else if (ch === '\r' && !inQuotes) { /* skip */ }
    else { current += ch }
  }
  if (current.trim()) lines.push(current)

  return lines.map(line => {
    const fields: string[] = []
    let field = '', q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (q && line[i + 1] === '"') { field += '"'; i++ }
        else { q = !q }
      } else if (ch === ',' && !q) { fields.push(field); field = '' }
      else { field += ch }
    }
    fields.push(field)
    return fields
  })
}

function parseTentDims(str: string): { shelter_type: string; length: number; width: number; height: number | null } {
  if (!str || str.trim() === '' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'test') {
    return { shelter_type: 'tent', length: 10, width: 10, height: null }
  }
  const lower = str.toLowerCase()
  if (lower.includes('rv')) return { shelter_type: 'rv', length: 20, width: 8, height: 10 }
  if (lower.includes('shiftpod') || lower.includes('shift pod') || lower.includes('shifted'))
    return { shelter_type: 'shiftpod', ...extractDims(str) }
  return { shelter_type: lower.includes('no bake') || lower.includes('nobake') ? 'tent' : 'tent', ...extractDims(str) }
}

function extractDims(str: string): { length: number; width: number; height: number | null } {
  const s = str.replace(/'/g, '').replace(/"/g, '').replace(/ft/gi, '').replace(/feet/gi, '')
  let m = s.match(/(\d+\.?\d*)\s*[xX×*]\s*(\d+\.?\d*)\s*[xX×*]\s*(\d+\.?\d*)/)
  if (m) {
    const nums = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])].sort((a, b) => b - a)
    return { length: Math.min(nums[0], 20), width: Math.min(nums[1], 15), height: Math.min(nums[2], 15) }
  }
  m = s.match(/(\d+\.?\d*)\s*[xX×*]\s*(\d+\.?\d*)/)
  if (m) {
    let l = parseFloat(m[1]), w = parseFloat(m[2])
    if (w > l) [l, w] = [w, l]
    return { length: Math.min(l, 20), width: Math.min(w, 15), height: null }
  }
  const numbers = s.match(/\d+\.?\d*/g)
  if (numbers && numbers.length >= 2) {
    const nums = numbers.map(Number).sort((a, b) => b - a)
    return { length: Math.min(nums[0], 20), width: Math.min(nums[1], 15), height: nums[2] ? Math.min(nums[2], 15) : null }
  }
  return { length: 10, width: 10, height: null }
}

function parseEmergencyContactField(raw: string): { name: string | null; number: string | null; relationship: string | null } {
  if (!raw || raw.trim() === '' || raw.toLowerCase() === 'test') return { name: null, number: null, relationship: null }
  const phoneMatch = raw.match(/[\+]?[\d\s\-\(\)]{7,}/)
  const phone = phoneMatch ? phoneMatch[0].trim() : null
  let namepart = raw
  if (phone) namepart = raw.replace(phone, '').replace(/[,\-–—:]+\s*$/, '').trim()
  const relKeywords = ['mom', 'mother', 'dad', 'father', 'sister', 'brother', 'wife', 'husband', 'partner', 'spouse', 'friend', 'cousin']
  let relationship: string | null = null
  for (const kw of relKeywords) {
    if (namepart.toLowerCase().includes(kw)) { relationship = kw.charAt(0).toUpperCase() + kw.slice(1); break }
  }
  const name = namepart.replace(/[\(\)]/g, '').replace(/[,\-–—:]+\s*$/, '').trim() || null
  return { name, number: phone, relationship }
}

function buildCamperFromCSV(headers: string[], fields: string[]): CamperCSVRow {
  const get = (sub: string) => {
    const idx = headers.findIndex(h => h.toLowerCase().includes(sub.toLowerCase()))
    return idx >= 0 ? (fields[idx] || '').trim() : ''
  }

  const tentRaw = get('Tent Size')
  const tent = parseTentDims(tentRaw)
  const ec = parseEmergencyContactField(get('Emergency Contact'))
  const vehicleRaw = get('bring a vehicle')
  const vehicleInfo = vehicleRaw.toLowerCase().includes('want to talk') ? `Wants to bring vehicle. Tent info: ${tentRaw || 'N/A'}` : null
  const sharingRaw = get('sharing your tent')
  const sharing = sharingRaw && !['no', 'n/a', 'heck no', 'only me!'].includes(sharingRaw.toLowerCase().trim()) ? sharingRaw.trim() : null
  const tellBrian = get('like to ask or tell Brian')
  const burnCountRaw = get('How many burns')
  const burnCount = burnCountRaw ? (burnCountRaw.match(/\d+/)?.[0] || burnCountRaw) : null
  const clean = (v: string) => (v && !['no', 'n/a', 'test', 'none', 'nope', 'nah'].includes(v.toLowerCase().trim())) ? v : null

  let notes = ''
  if (sharing) notes += `Tent sharing with: ${sharing}. `
  if (vehicleInfo) notes += vehicleInfo + '. '
  if (tellBrian && !['test', 'n/a', 'no'].includes(tellBrian.toLowerCase().trim())) notes += `Note to Brian: ${tellBrian}`

  let shelterType = tent.shelter_type
  if (tentRaw.toLowerCase().includes('rv') || vehicleRaw.toLowerCase().includes('rv')) shelterType = 'rv'

  return {
    email: get('Email Address').toLowerCase(),
    full_name: get('Full Name'),
    phone: get('Phone Number') || null,
    shelter_type: shelterType,
    shelter_length_ft: tent.length,
    shelter_width_ft: tent.width,
    shelter_height_ft: tent.height,
    vehicle_info: vehicleInfo,
    emergency_contact: get('Emergency Contact') || null,
    emergency_contact_name: ec.name,
    emergency_contact_number: ec.number,
    emergency_contact_relationship: ec.relationship,
    medical_conditions: clean(get('medical conditions')),
    medications: clean(get('medication')),
    allergies: clean(get('allergies')),
    dietary_restrictions: clean(get('dietary')),
    custom_skills: clean(get('professional qualification')),
    burn_count: burnCount,
    what_attracted_you: clean(get('What attracted')),
    referral_source: clean(get('first time with NYC Deli please list who')),
    character_references: clean(get('character references')),
    first_burn_hopes: clean(get('first Burning Man')),
    volunteer_commitment: get('willing to volunteer').includes('Yes'),
    sober_shifts: get('willing to be sober').includes('Yes'),
    background_check_consent: get('background-checked').includes('Yes'),
    notes: notes.trim() || null,
  }
}

export async function importCampersFromCSVAction(
  csvContent: string,
  defaultPassword: string = 'NYCDeli2026!'
): Promise<AdminActionResult> {
  await requireAdmin()

  if (!defaultPassword || defaultPassword.length < 8) {
    return { success: false, error: 'Default password must be at least 8 characters' }
  }

  const adminClient = createServiceClient()
  const rows = parseCSVText(csvContent)
  if (rows.length < 2) return { success: false, error: 'CSV has no data rows' }

  const headers = rows[0]
  const dataRows = rows.slice(1).filter(r => r.length > 1 && r[1])

  const results: { processed: number; errors: string[] } = { processed: 0, errors: [] }

  for (const fields of dataRows) {
    const camper = buildCamperFromCSV(headers, fields)
    if (!camper.email || !camper.full_name) {
      results.errors.push(`Skipped row: missing email or name`)
      continue
    }

    try {
      // 1. Create auth user
      let userId: string
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: camper.email,
        password: defaultPassword,
        email_confirm: true,
      })

      if (authError) {
        if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
          const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
          const existing = listData?.users?.find(u => u.email?.toLowerCase() === camper.email)
          if (!existing) { results.errors.push(`${camper.full_name}: user exists but not found`); continue }
          userId = existing.id
        } else {
          results.errors.push(`${camper.full_name}: ${authError.message}`)
          continue
        }
      } else {
        userId = authData.user.id
      }

      // 2. Upsert camper record
      const { data: camperData, error: camperError } = await adminClient
        .from('campers')
        .upsert({
          full_name: camper.full_name,
          email: camper.email,
          phone: camper.phone,
          arrival_date: '2026-08-30',
          arrival_method: 'car' as const,
          departure_date: '2026-09-07',
          early_arrival: false,
          shelter_type: camper.shelter_type as 'tent' | 'shiftpod' | 'rv' | 'vehicle' | 'other',
          shelter_length_ft: camper.shelter_length_ft,
          shelter_width_ft: camper.shelter_width_ft,
          shelter_height_ft: camper.shelter_height_ft,
          vehicle_info: camper.vehicle_info,
          emergency_contact: camper.emergency_contact,
          emergency_contact_name: camper.emergency_contact_name,
          emergency_contact_number: camper.emergency_contact_number,
          emergency_contact_relationship: camper.emergency_contact_relationship,
          medical_conditions: camper.medical_conditions,
          medications: camper.medications,
          allergies: camper.allergies,
          dietary_restrictions: camper.dietary_restrictions,
          custom_skills: camper.custom_skills,
          burn_count: camper.burn_count,
          what_attracted_you: camper.what_attracted_you,
          referral_source: camper.referral_source,
          character_references: camper.character_references,
          first_burn_hopes: camper.first_burn_hopes,
          volunteer_commitment: camper.volunteer_commitment,
          sober_shifts: camper.sober_shifts,
          background_check_consent: camper.background_check_consent,
          notes: camper.notes,
          kitchen_participation: true,
          preferred_shift_types: ['any'],
          strike_participation: true,
          skills: [],
          tools_bringing: [],
        } as never, { onConflict: 'email' })
        .select('id')
        .single()

      if (camperError) { results.errors.push(`${camper.full_name}: camper upsert - ${camperError.message}`); continue }

      // 3. Link profile → camper, approve as 'user'
      const camperId = (camperData as { id: string })?.id
      if (camperId) {
        await adminClient
          .from('user_profiles')
          .update({
            role: 'user',
            camper_id: camperId,
            approved_at: new Date().toISOString(),
            approved_by: userId,
          } as never)
          .eq('id', userId)
      }

      results.processed++
    } catch (err) {
      results.errors.push(`${camper.full_name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return {
    success: true,
    data: {
      total: dataRows.length,
      processed: results.processed,
      errors: results.errors,
    },
  }
}
