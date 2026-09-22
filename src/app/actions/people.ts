'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { mirrorCamperToPerson, mirrorPersonToCampers, resolvePersonForUser } from '@/lib/person-resolver'
import type {
  CamperRow,
  PersonInsert,
  PersonRow,
  PersonSelfUpdate,
  PersonStatus,
  PersonUpdate,
} from '@/types/database'

export type PeopleActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

function fail(error: string): PeopleActionResult<never> {
  return { success: false, error }
}

/**
 * Personal information belongs to the person, not to an event. These actions
 * stay available whether or not the account is currently in an active event.
 */

/** Get (creating if needed) the signed-in member's permanent profile. */
export async function getMyPersonAction(): Promise<PeopleActionResult<PersonRow>> {
  const user = await requireAuth()
  const supabase = await createClient()
  const person = await resolvePersonForUser(supabase, user.id)
  if (!person) return fail('Could not load your NYC Deli profile.')
  return { success: true, data: person }
}

export async function updateMyPersonAction(patch: PersonSelfUpdate): Promise<PeopleActionResult<PersonRow>> {
  const user = await requireAuth()
  const supabase = await createClient()

  const person = await resolvePersonForUser(supabase, user.id)
  if (!person) return fail('Could not load your NYC Deli profile.')

  if (patch.full_name !== undefined && !patch.full_name?.trim()) {
    return fail('Name is required')
  }

  const { data, error } = await supabase
    .from('people')
    .update({ ...patch, last_active_at: new Date().toISOString() } as never)
    .eq('id', person.id)
    .select('*')
    .single()
  if (error) return fail(error.message)

  // Keep the camper row(s) and the profile bio in step with the edit.
  await mirrorPersonToCampers(supabase, data as PersonRow)

  revalidatePath('/profile')
  return { success: true, data: data as PersonRow }
}

/**
 * The reverse: called after the profile page saves camper details or a bio, so
 * the permanent record reflects whichever screen the member happened to use.
 */
export async function syncMyPersonFromCamperAction(): Promise<PeopleActionResult<PersonRow>> {
  const user = await requireAuth()
  const supabase = await createClient()

  const person = await resolvePersonForUser(supabase, user.id)
  if (!person) return fail('Could not load your NYC Deli profile.')

  const { data: camperData } = await supabase
    .from('campers')
    .select('*')
    .eq('person_id', person.id)
    .order('updated_at', { ascending: false })
    .limit(1)
  const camper = ((camperData as CamperRow[] | null) ?? [])[0] ?? null

  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('bio')
    .eq('id', user.id)
    .maybeSingle()

  await mirrorCamperToPerson(supabase, person.id, camper, (profileData as { bio: string | null } | null)?.bio)

  const { data } = await supabase.from('people').select('*').eq('id', person.id).maybeSingle()
  revalidatePath('/profile')
  return { success: true, data: (data as PersonRow | null) ?? person }
}

// ---------------------------------------------------------------------------
// Admin CRM
// ---------------------------------------------------------------------------

export async function createPersonAction(input: PersonInsert): Promise<PeopleActionResult<PersonRow>> {
  await requireAdmin()
  if (!input.full_name?.trim()) return fail('Name is required')
  if (!input.email?.trim()) return fail('Email is required')

  const supabase = await createClient()

  const { data: existing } = await supabase.from('people').select('*').ilike('email', input.email.trim()).maybeSingle()
  if (existing) return fail('Someone with that email already exists in the database.')

  const { data, error } = await supabase
    .from('people')
    .insert({ ...input, email: input.email.trim(), full_name: input.full_name.trim() } as never)
    .select('*')
    .single()
  if (error) return fail(error.message)

  revalidatePath('/admin/people')
  return { success: true, data: data as PersonRow }
}

export async function updatePersonAction(personId: string, patch: PersonUpdate): Promise<PeopleActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('people').update(patch as never).eq('id', personId)
  if (error) return fail(error.message)

  revalidatePath('/admin/people')
  revalidatePath(`/admin/people/${personId}`)
  return { success: true }
}

export async function setPersonStatusAction(personId: string, status: PersonStatus): Promise<PeopleActionResult> {
  return updatePersonAction(personId, { status })
}

export async function addPersonNoteAction(
  personId: string,
  body: string,
  eventId?: string | null
): Promise<PeopleActionResult> {
  const { user } = await requireAdmin()
  if (!body.trim()) return fail('Note cannot be empty')

  const supabase = await createClient()
  const { error } = await supabase.from('person_notes').insert({
    person_id: personId,
    event_id: eventId ?? null,
    author_id: user.id,
    body: body.trim(),
  } as never)
  if (error) return fail(error.message)

  revalidatePath(`/admin/people/${personId}`)
  return { success: true }
}

export async function togglePersonNotePinAction(noteId: string, pinned: boolean): Promise<PeopleActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('person_notes')
    .update({ is_pinned: pinned } as never)
    .eq('id', noteId)
    .select('person_id')
    .maybeSingle()
  if (error) return fail(error.message)

  if (data) revalidatePath(`/admin/people/${(data as { person_id: string }).person_id}`)
  return { success: true }
}

export async function deletePersonNoteAction(noteId: string): Promise<PeopleActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { data } = await supabase.from('person_notes').select('person_id').eq('id', noteId).maybeSingle()
  const { error } = await supabase.from('person_notes').delete().eq('id', noteId)
  if (error) return fail(error.message)

  if (data) revalidatePath(`/admin/people/${(data as { person_id: string }).person_id}`)
  return { success: true }
}
