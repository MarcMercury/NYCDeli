'use server'

import { randomInt } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import { fetchApplicationTargetEvent, fetchOpsEvent } from '@/lib/active-event'
import { stageMeta, type DeliSupabase } from '@/lib/events'
import type { CamperRow, EventRow, PersonRow, UserRole } from '@/types/database'

/**
 * Promotion actions for the unified directory.
 *
 * Approving somebody used to mean flipping `user_profiles.role` and nothing
 * else — no login was created, no camper row, no roster entry — so an "approved"
 * applicant still could not sign in and never appeared on the roster. These
 * actions do the whole promotion as one unit so the three screens can never
 * disagree again.
 */

export type DirectoryResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

function fail(error: string): DirectoryResult<never> {
  return { success: false, error }
}

/** Unambiguous alphabet: no O/0, I/l/1, so it survives being read aloud. */
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export async function generatePassword(): Promise<string> {
  const block = (n: number) =>
    Array.from({ length: n }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join('')
  return `Deli-${block(4)}-${block(5)}`
}

export interface PromotionOutcome {
  personId: string
  email: string
  /** Only present when a brand new login was created or a reset was asked for. */
  password?: string
  camperId: string | null
  createdAccount: boolean
  /** Null when no event was writable — the login is still created. */
  eventName: string | null
}

/**
 * Applicant -> member, in one step: login, account role, camper record, roster
 * entry and application decision.
 */
export async function approvePersonAction(params: {
  personId: string
  eventId?: string | null
  role?: UserRole
  note?: string
}): Promise<DirectoryResult<PromotionOutcome>> {
  const { user: admin } = await requireAdmin()
  const service = createServiceClient() as unknown as DeliSupabase

  const { data: personData } = await service.from('people').select('*').eq('id', params.personId).maybeSingle()
  const person = personData as PersonRow | null
  if (!person) return fail('Person not found')

  const email = person.email.trim().toLowerCase()
  const event = await resolveEvent(service, params.eventId ?? null)

  const account = await ensureAccount(service, person, email)
  if (!account.ok) return fail(account.error)

  const camper = event ? await ensureCamper(service, person, event) : null

  await service
    .from('user_profiles')
    .update({
      role: params.role ?? 'user',
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
      denied_at: null,
      denied_reason: null,
      person_id: person.id,
      ...(camper ? { camper_id: camper.id } : {}),
    } as never)
    .eq('id', account.userId)

  await service
    .from('people')
    .update({ user_id: account.userId, status: 'member', last_active_at: new Date().toISOString() } as never)
    .eq('id', person.id)

  if (event) {
    const applicationId = await settleApplication(service, {
      personId: person.id,
      event,
      camperId: camper?.id ?? null,
      status: 'approved',
      adminId: admin.id,
      note: params.note,
    })

    await service.from('event_participants').upsert(
      {
        event_id: event.id,
        person_id: person.id,
        application_id: applicationId,
        camper_id: camper?.id ?? null,
        status: 'confirmed',
      } as never,
      { onConflict: 'event_id,person_id' }
    )
  }

  revalidateDirectory(event?.id)
  return {
    success: true,
    data: {
      personId: person.id,
      email,
      password: account.password,
      camperId: camper?.id ?? null,
      createdAccount: account.created,
      eventName: event?.name ?? null,
    },
  }
}

export async function denyPersonAction(params: {
  personId: string
  eventId?: string | null
  reason?: string
}): Promise<DirectoryResult> {
  const { user: admin } = await requireAdmin()
  const service = createServiceClient() as unknown as DeliSupabase

  const { data: personData } = await service.from('people').select('*').eq('id', params.personId).maybeSingle()
  const person = personData as PersonRow | null
  if (!person) return fail('Person not found')

  const reason = params.reason?.trim() || 'No reason provided'
  const event = await resolveEvent(service, params.eventId ?? null)

  if (person.user_id) {
    await service
      .from('user_profiles')
      .update({ role: 'pending', denied_at: new Date().toISOString(), denied_reason: reason } as never)
      .eq('id', person.user_id)
  }

  if (event) {
    await settleApplication(service, {
      personId: person.id,
      event,
      camperId: null,
      status: 'denied',
      adminId: admin.id,
      note: reason,
    })
  }

  await service.from('people').update({ status: 'inactive' } as never).eq('id', person.id)

  revalidateDirectory(event?.id)
  return { success: true }
}

/** Change what a person can reach without touching their application history. */
export async function setAccessRoleAction(personId: string, role: UserRole): Promise<DirectoryResult> {
  const { user: admin } = await requireAdmin()
  const supabase = await createClient()

  const { data: personData } = await supabase.from('people').select('user_id').eq('id', personId).maybeSingle()
  const userId = (personData as { user_id: string | null } | null)?.user_id
  if (!userId) return fail('This person has no login yet. Approve them first to create one.')

  const patch: Record<string, unknown> = { role }
  if (role !== 'pending') {
    patch.approved_at = new Date().toISOString()
    patch.approved_by = admin.id
    patch.denied_at = null
    patch.denied_reason = null
  }

  const { error } = await supabase.from('user_profiles').update(patch as never).eq('id', userId)
  if (error) return fail(error.message)

  revalidateDirectory()
  return { success: true }
}

/** Set a new password, generating one when the admin does not supply it. */
export async function resetPersonPasswordAction(
  personId: string,
  password?: string
): Promise<DirectoryResult<{ password: string }>> {
  await requireAdmin()
  const service = createServiceClient()

  const { data: personData } = await service.from('people').select('user_id').eq('id', personId).maybeSingle()
  const userId = (personData as { user_id: string | null } | null)?.user_id
  if (!userId) return fail('This person has no login yet.')

  const next = password?.trim() || (await generatePassword())
  if (next.length < 8) return fail('Password must be at least 8 characters')

  const { error } = await service.auth.admin.updateUserById(userId, {
    password: next,
    user_metadata: { must_change_password: true },
  })
  if (error) return fail(error.message)

  revalidateDirectory()
  return { success: true, data: { password: next } }
}

/** Put an already-approved person on an event's roster without re-approving. */
export async function addToEventRosterAction(personId: string, eventId: string): Promise<DirectoryResult> {
  await requireAdmin()
  const service = createServiceClient() as unknown as DeliSupabase

  const { data: personData } = await service.from('people').select('*').eq('id', personId).maybeSingle()
  const person = personData as PersonRow | null
  if (!person) return fail('Person not found')

  const event = await resolveEvent(service, eventId)
  if (!event) return fail('Event not found')

  const camper = await ensureCamper(service, person, event)
  const { error } = await service.from('event_participants').upsert(
    { event_id: event.id, person_id: person.id, camper_id: camper?.id ?? null, status: 'confirmed' } as never,
    { onConflict: 'event_id,person_id' }
  )
  if (error) return fail(error.message)

  revalidateDirectory(event.id)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Which event a promotion attaches to. An explicit choice always wins; with no
 * choice, prefer whichever event is taking applications and fall back to the
 * current ops event only while it is still writable. A closed event must never
 * silently gain new participants.
 */
async function resolveEvent(service: DeliSupabase, eventId: string | null): Promise<EventRow | null> {
  if (eventId) {
    const { data } = await service.from('events').select('*').eq('id', eventId).maybeSingle()
    return (data as EventRow | null) ?? null
  }

  const open = await fetchApplicationTargetEvent(service)
  if (open) return open

  const ops = await fetchOpsEvent(service)
  return ops && !stageMeta(ops.stage).readOnly ? ops : null
}

type AccountOutcome =
  | { ok: true; userId: string; password?: string; created: boolean }
  | { ok: false; error: string }

/**
 * Find or create the login. An existing password is never rotated here — an
 * approval must not lock out somebody who already signed in and changed it.
 */
async function ensureAccount(service: DeliSupabase, person: PersonRow, email: string): Promise<AccountOutcome> {
  if (person.user_id) return { ok: true, userId: person.user_id, created: false }

  const auth = (service as unknown as ReturnType<typeof createServiceClient>).auth.admin
  const password = await generatePassword()

  const { data, error } = await auth.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  })

  if (!error && data?.user) return { ok: true, userId: data.user.id, password, created: true }

  const alreadyExists =
    error?.message.includes('already been registered') || error?.message.includes('already exists')
  if (!alreadyExists) return { ok: false, error: error?.message ?? 'Could not create the login' }

  const { data: list } = await auth.listUsers({ perPage: 1000 })
  const existing = list?.users?.find(u => u.email?.toLowerCase() === email)
  if (!existing) return { ok: false, error: 'An account with that email exists but could not be loaded' }
  return { ok: true, userId: existing.id, created: false }
}

/**
 * Every event participant needs a camper row — it is what the layout, kitchen
 * and packing tools key off. Seeded from the person and the event dates; the
 * 11×11 footprint is the placeholder the admin screens already treat as
 * "tent not confirmed yet".
 */
async function ensureCamper(
  service: DeliSupabase,
  person: PersonRow,
  event: EventRow
): Promise<CamperRow | null> {
  const { data: existing } = await service
    .from('campers')
    .select('*')
    .eq('person_id', person.id)
    .eq('event_id', event.id)
    .maybeSingle()
  if (existing) return existing as CamperRow

  const { data: byEmail } = await service
    .from('campers')
    .select('*')
    .ilike('email', person.email)
    .is('event_id', null)
    .maybeSingle()
  if (byEmail) {
    const { data: adopted } = await service
      .from('campers')
      .update({ event_id: event.id, person_id: person.id } as never)
      .eq('id', (byEmail as CamperRow).id)
      .select('*')
      .single()
    return (adopted as CamperRow | null) ?? (byEmail as CamperRow)
  }

  const { data: created } = await service
    .from('campers')
    .insert({
      full_name: person.full_name,
      email: person.email.trim().toLowerCase(),
      playa_name: person.playa_name,
      phone: person.phone,
      emergency_contact_name: person.emergency_contact_name,
      emergency_contact_number: person.emergency_contact_number,
      emergency_contact_relationship: person.emergency_contact_relationship,
      dietary_restrictions: person.dietary_restrictions,
      allergies: person.allergies,
      arrival_date: event.start_date ?? new Date().toISOString().slice(0, 10),
      departure_date: event.end_date ?? event.start_date ?? new Date().toISOString().slice(0, 10),
      shelter_length_ft: 11,
      shelter_width_ft: 11,
      event_id: event.id,
      person_id: person.id,
    } as never)
    .select('*')
    .single()

  return (created as CamperRow | null) ?? null
}

async function settleApplication(
  service: DeliSupabase,
  params: {
    personId: string
    event: EventRow
    camperId: string | null
    status: 'approved' | 'denied'
    adminId: string
    note?: string
  }
): Promise<string | null> {
  const decision = {
    status: params.status,
    decided_at: new Date().toISOString(),
    decided_by: params.adminId,
    decision_note: params.note?.trim() || null,
    ...(params.camperId ? { camper_id: params.camperId } : {}),
  }

  const { data: existing } = await service
    .from('event_applications')
    .select('id')
    .eq('person_id', params.personId)
    .eq('event_id', params.event.id)
    .maybeSingle()

  if (existing) {
    const id = (existing as { id: string }).id
    await service.from('event_applications').update(decision as never).eq('id', id)
    return id
  }

  // Someone added straight to the roster still gets an application on file, so
  // the person's history reads the same way for everybody.
  const { data: created } = await service
    .from('event_applications')
    .insert({
      event_id: params.event.id,
      person_id: params.personId,
      source: 'admin',
      submitted_at: new Date().toISOString(),
      ...decision,
    } as never)
    .select('id')
    .single()

  return (created as { id: string } | null)?.id ?? null
}

function revalidateDirectory(eventId?: string) {
  revalidatePath('/admin')
  revalidatePath('/admin/people')
  revalidatePath('/campers')
  if (eventId) revalidatePath(`/admin/events/${eventId}`)
}
