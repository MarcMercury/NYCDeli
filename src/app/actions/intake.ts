'use server'

import { createServiceClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { fetchApplicationTargetEvent, fetchOpsEvent } from '@/lib/active-event'
import { camperIntakeSchema, type CamperIntakeData } from '@/lib/validations'
import { stageMeta, type DeliSupabase } from '@/lib/events'
import type { CamperRow, EventRow, PersonRow } from '@/types/database'

export type IntakeResult =
  | { success: true; alreadyRegistered?: boolean }
  | { success: false; error: string }

/**
 * Intake is where a stranger becomes three linked records: a permanent `people`
 * profile, an `event_applications` row against a specific event, and the
 * operational `campers` row that the Burning Man tooling drives off.
 *
 * Runs with the service role because an applicant may not have a confirmed
 * session yet (Supabase may require email confirmation), so every field is
 * re-validated here rather than trusted from the client.
 */
export async function submitIntakeAction(input: CamperIntakeData): Promise<IntakeResult> {
  const parsed = camperIntakeSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Some answers are invalid.' }
  }
  const data = parsed.data
  const email = data.email.trim().toLowerCase()

  const service = createServiceClient() as unknown as DeliSupabase

  const { data: existing } = await service.from('campers').select('id').ilike('email', email).maybeSingle()
  if (existing) return { success: true, alreadyRegistered: true }

  // Attach to whatever event is accepting applications. If none is (the org is
  // in the Information stage), still capture the person and their answers —
  // they just aren't added to an archived event's roster.
  const openEvent = await fetchApplicationTargetEvent(service)
  const opsEvent = openEvent ?? (await fetchOpsEvent(service))
  const target = openEvent ?? (opsEvent && !stageMeta(opsEvent.stage).readOnly ? opsEvent : null)

  const person = await upsertPersonFromIntake(service, email, data)

  const camperInsert = {
    ...data,
    email,
    shelter_height_ft: data.shelter_height_ft || null,
    playa_name: data.playa_name || null,
    phone: data.phone || null,
    special_requests: data.special_requests || null,
    tools_bringing: data.tools_bringing || [],
    vehicle_info: data.vehicle_info || null,
    custom_skills: data.custom_skills || null,
    tent_make_model: data.tent_make_model || null,
    tent_entrance_count: data.tent_entrance_count || null,
    tent_opening_side: data.tent_opening_side || null,
    sharing_tent_with: data.sharing_tent_with || null,
    sharing_tent_with_2: data.sharing_tent_with_2 || null,
    event_id: target?.id ?? null,
    person_id: person?.id ?? null,
  }

  const { data: camper, error } = await service
    .from('campers')
    .insert(camperInsert as never)
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }

  if (person && target) {
    await createApplication(service, target, person, (camper as Pick<CamperRow, 'id'>).id, data)
  }

  // Link the auth account created moments ago, if the signup produced a session.
  await linkSignedInAccount(person?.id ?? null, email)

  return { success: true }
}

async function upsertPersonFromIntake(
  service: DeliSupabase,
  email: string,
  data: CamperIntakeData
): Promise<PersonRow | null> {
  const contact = {
    full_name: data.full_name.trim(),
    playa_name: data.playa_name || null,
    phone: data.phone || null,
    emergency_contact_name: data.emergency_contact_name || null,
    emergency_contact_number: data.emergency_contact_number || null,
    emergency_contact_relationship: data.emergency_contact_relationship || null,
    dietary_restrictions: data.dietary_restrictions || null,
    allergies: data.allergies || null,
    medical_notes: [data.medical_conditions, data.medications].filter(Boolean).join('\n') || null,
  }

  const { data: existing } = await service.from('people').select('*').ilike('email', email).maybeSingle()

  if (existing) {
    const person = existing as PersonRow
    // A returning member's own answers are newer than what we had on file.
    const { data: updated } = await service
      .from('people')
      .update({ ...contact, status: 'applicant', last_active_at: new Date().toISOString() } as never)
      .eq('id', person.id)
      .select('*')
      .single()
    return (updated as PersonRow | null) ?? person
  }

  const { data: created } = await service
    .from('people')
    .insert({ ...contact, email, status: 'applicant' } as never)
    .select('*')
    .single()
  return (created as PersonRow | null) ?? null
}

async function createApplication(
  service: DeliSupabase,
  event: EventRow,
  person: PersonRow,
  camperId: string,
  data: CamperIntakeData
) {
  const { count: priorEvents } = await service
    .from('event_participants')
    .select('id', { count: 'exact', head: true })
    .eq('person_id', person.id)
    .neq('event_id', event.id)

  await service.from('event_applications').upsert(
    {
      event_id: event.id,
      person_id: person.id,
      camper_id: camperId,
      status: 'submitted',
      source: 'intake',
      is_returning: (priorEvents ?? 0) > 0,
      submitted_at: new Date().toISOString(),
      responses: {
        burn_count: data.burn_count ?? null,
        what_attracted_you: data.what_attracted_you ?? null,
        referral_source: data.referral_source ?? null,
        character_references: data.character_references ?? null,
        first_burn_hopes: data.first_burn_hopes ?? null,
        skills: data.skills ?? [],
        build_week_attending: data.build_week_attending,
        kitchen_participation: data.kitchen_participation,
        volunteer_commitment: data.volunteer_commitment,
      },
    } as never,
    { onConflict: 'event_id,person_id' }
  )
}

/** Best-effort: signup may not produce a session when confirmation is required. */
async function linkSignedInAccount(personId: string | null, email: string) {
  if (!personId) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email?.toLowerCase() !== email) return

  const service = createServiceClient() as unknown as DeliSupabase
  await service.from('people').update({ user_id: user.id } as never).eq('id', personId)
  await service.from('user_profiles').update({ person_id: personId } as never).eq('id', user.id)
}
