import type { createClient } from '@/lib/supabase/server'
import type { PersonRow, UserProfileRow } from '@/types/database'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

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
