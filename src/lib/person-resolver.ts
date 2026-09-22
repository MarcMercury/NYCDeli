import type { createClient } from '@/lib/supabase/server'
import type { CamperRow, PersonRow, UserProfileRow } from '@/types/database'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

/**
 * Fields that describe the human rather than their role at one event. They
 * exist on both `people` (permanent) and `campers` (per-event) and must agree —
 * editing a phone number in one place and not the other is how a camp ends up
 * calling a dead number at 3am.
 */
const SHARED_FIELDS = [
  'full_name',
  'playa_name',
  'phone',
  'emergency_contact_name',
  'emergency_contact_number',
  'emergency_contact_relationship',
  'dietary_restrictions',
  'allergies',
] as const

/** Push the permanent profile down onto every camper row for this person. */
export async function mirrorPersonToCampers(supabase: ServerSupabase, person: PersonRow) {
  const patch: Record<string, unknown> = {}
  for (const field of SHARED_FIELDS) {
    if (person[field] !== undefined) patch[field] = person[field]
  }

  await supabase.from('campers').update(patch as never).eq('person_id', person.id)

  if (person.user_id) {
    await supabase.from('user_profiles').update({ bio: person.bio } as never).eq('id', person.user_id)
  }
}

/** Pull edits made on the camper/bio side back up onto the permanent profile. */
export async function mirrorCamperToPerson(
  supabase: ServerSupabase,
  personId: string,
  camper: CamperRow | null,
  bio?: string | null
) {
  const patch: Record<string, unknown> = {}

  if (camper) {
    for (const field of SHARED_FIELDS) {
      patch[field] = camper[field]
    }
    // Medical only travels camper -> person; splitting it back would lose data.
    patch.medical_notes =
      [camper.medical_conditions, camper.medications].filter(Boolean).join('\n') || null
  }
  if (bio !== undefined) patch.bio = bio

  if (Object.keys(patch).length === 0) return
  await supabase.from('people').update(patch as never).eq('id', personId)
}

/**
 * Resolve — and if necessary create — the permanent `people` record behind a
 * signed-in account.
 *
 * Order matters: `people.user_id`, then `user_profiles.person_id`, then email.
 * The email fallback is what lets someone who applied to a past event under a
 * different account be recognised as the same person instead of forking into a
 * duplicate CRM record.
 */
export async function resolvePersonForUser(
  supabase: ServerSupabase,
  userId: string
): Promise<PersonRow | null> {
  const { data: byUser } = await supabase.from('people').select('*').eq('user_id', userId).maybeSingle()
  if (byUser) return byUser as PersonRow

  const { data: profileData } = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle()
  const profile = profileData as UserProfileRow | null
  if (!profile) return null

  if (profile.person_id) {
    const { data: byProfile } = await supabase.from('people').select('*').eq('id', profile.person_id).maybeSingle()
    if (byProfile) return byProfile as PersonRow
  }

  const { data: byEmail } = await supabase.from('people').select('*').ilike('email', profile.email).maybeSingle()
  if (byEmail) {
    const person = byEmail as PersonRow
    await supabase.from('people').update({ user_id: userId } as never).eq('id', person.id)
    await supabase.from('user_profiles').update({ person_id: person.id } as never).eq('id', userId)
    return person
  }

  // Fall back to the camper row's name so a fresh CRM record isn't nameless.
  let fullName = profile.email.split('@')[0]
  if (profile.camper_id) {
    const { data: camper } = await supabase
      .from('campers')
      .select('full_name')
      .eq('id', profile.camper_id)
      .maybeSingle()
    const name = (camper as { full_name?: string } | null)?.full_name
    if (name) fullName = name
  }

  const { data: created } = await supabase
    .from('people')
    .insert({
      user_id: userId,
      email: profile.email,
      full_name: fullName,
      bio: profile.bio,
      status: profile.role === 'pending' ? 'applicant' : 'member',
    } as never)
    .select('*')
    .single()

  if (created) {
    await supabase.from('user_profiles').update({ person_id: (created as PersonRow).id } as never).eq('id', userId)
  }
  return (created as PersonRow | null) ?? null
}
