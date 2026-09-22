'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { FEATURE_PRESETS, slugify, stageMeta } from '@/lib/events'
import { resolvePersonForUser } from '@/lib/person-resolver'
import type {
  ApplicationStatus,
  EventFeatures,
  EventInsert,
  EventKind,
  EventRow,
  EventStage,
  EventUpdate,
} from '@/types/database'

export type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string }

function ok<T>(data?: T): ActionResult<T> {
  return { success: true, data }
}

function fail(error: string): ActionResult<never> {
  return { success: false, error }
}

function revalidateEvent(slug?: string) {
  revalidatePath('/admin/events')
  revalidatePath('/events')
  revalidatePath('/calendar')
  revalidatePath('/')
  if (slug) revalidatePath(`/events/${slug}`)
}

// ---------------------------------------------------------------------------
// Event lifecycle
// ---------------------------------------------------------------------------

export interface CreateEventInput {
  name: string
  kind: EventKind
  year?: number | null
  tagline?: string
  description?: string
  locationName?: string
  startDate?: string | null
  endDate?: string | null
  buildStartDate?: string | null
  isPublic?: boolean
  features?: EventFeatures
}

export async function createEventAction(input: CreateEventInput): Promise<ActionResult<EventRow>> {
  const { user } = await requireAdmin()
  const name = input.name?.trim()
  if (!name) return fail('Event name is required')

  const supabase = await createClient()
  const baseSlug = slugify(input.year ? `${name}-${input.year}` : name) || 'event'

  // Slugs are the public URL; disambiguate rather than rejecting duplicates.
  let slug = baseSlug
  for (let attempt = 2; attempt <= 20; attempt++) {
    const { data: clash } = await supabase.from('events').select('id').eq('slug', slug).maybeSingle()
    if (!clash) break
    slug = `${baseSlug}-${attempt}`
  }

  const insert: EventInsert = {
    slug,
    name,
    kind: input.kind,
    year: input.year ?? (input.startDate ? Number(input.startDate.slice(0, 4)) : null),
    tagline: input.tagline?.trim() || null,
    description: input.description?.trim() || null,
    location_name: input.locationName?.trim() || null,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    build_start_date: input.buildStartDate || null,
    stage: 'development',
    is_public: input.isPublic ?? false,
    features: input.features ?? FEATURE_PRESETS[input.kind] ?? FEATURE_PRESETS.other,
    created_by: user.id,
  }

  const { data, error } = await supabase.from('events').insert(insert as never).select('*').single()
  if (error) return fail(error.message)

  await supabase.from('event_stage_history').insert({
    event_id: (data as EventRow).id,
    from_stage: null,
    to_stage: 'development',
    changed_by: user.id,
    note: 'Event created.',
  } as never)

  revalidateEvent(slug)
  return ok(data as EventRow)
}

export async function updateEventAction(eventId: string, patch: EventUpdate): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { data: existing } = await supabase.from('events').select('stage, slug').eq('id', eventId).maybeSingle()
  const event = existing as Pick<EventRow, 'stage' | 'slug'> | null
  if (!event) return fail('Event not found')
  if (stageMeta(event.stage).readOnly) {
    return fail('This event is closed. Reopen it before making changes.')
  }

  const { error } = await supabase.from('events').update(patch as never).eq('id', eventId)
  if (error) return fail(error.message)

  revalidateEvent(patch.slug ?? event.slug)
  return ok()
}

export async function setEventStageAction(
  eventId: string,
  stage: EventStage,
  note?: string
): Promise<ActionResult> {
  const { user } = await requireAdmin()
  const supabase = await createClient()

  const { data: existing } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle()
  const event = existing as EventRow | null
  if (!event) return fail('Event not found')
  if (event.stage === stage) return ok()

  const meta = stageMeta(stage)
  const patch: EventUpdate = {
    stage,
    // Stages that can't take applications close the door automatically.
    applications_open: meta.acceptsApplications ? event.applications_open : false,
    // Leaving `closed` restores an editable event.
    closed_at: stage === 'closed' ? new Date().toISOString() : null,
    closed_by: stage === 'closed' ? user.id : null,
  }
  if (meta.publiclyListable && stage !== 'development') patch.is_public = true

  const { error } = await supabase.from('events').update(patch as never).eq('id', eventId)
  if (error) return fail(error.message)

  await supabase.from('event_stage_history').insert({
    event_id: eventId,
    from_stage: event.stage,
    to_stage: stage,
    changed_by: user.id,
    note: note?.trim() || null,
  } as never)

  revalidateEvent(event.slug)
  return ok()
}

/**
 * Formally close an event. The event becomes read-only history; every person
 * keeps their account, profile and participation record.
 */
export async function closeEventAction(eventId: string, note?: string): Promise<ActionResult> {
  const { user } = await requireAdmin()
  const supabase = await createClient()

  const { data: existing } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle()
  const event = existing as EventRow | null
  if (!event) return fail('Event not found')

  // Confirmed participants who were never marked up become attendance history.
  await supabase
    .from('event_participants')
    .update({ status: 'attended' } as never)
    .eq('event_id', eventId)
    .in('status', ['confirmed', 'invited', 'tentative'])

  // Undecided applications don't linger forever on a closed event.
  await supabase
    .from('event_applications')
    .update({ status: 'withdrawn', decided_at: new Date().toISOString(), decided_by: user.id } as never)
    .eq('event_id', eventId)
    .in('status', ['draft', 'submitted', 'under_review'])

  const { error } = await supabase
    .from('events')
    .update({
      stage: 'closed',
      applications_open: false,
      is_flagship: false,
      closed_at: new Date().toISOString(),
      closed_by: user.id,
    } as never)
    .eq('id', eventId)
  if (error) return fail(error.message)

  await supabase.from('event_stage_history').insert({
    event_id: eventId,
    from_stage: event.stage,
    to_stage: 'closed',
    changed_by: user.id,
    note: note?.trim() || 'Event closed and archived.',
  } as never)

  revalidateEvent(event.slug)
  return ok()
}

export async function reopenEventAction(eventId: string, stage: EventStage = 'post_event'): Promise<ActionResult> {
  if (stage === 'closed') return fail('Pick a stage to reopen into')
  return setEventStageAction(eventId, stage, 'Event reopened.')
}

/** Make this the event the app foregrounds (at most one at a time). */
export async function setFlagshipEventAction(eventId: string | null): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  // A partial unique index enforces one flagship, so clear before setting.
  const { error: clearError } = await supabase
    .from('events')
    .update({ is_flagship: false } as never)
    .eq('is_flagship', true)
  if (clearError) return fail(clearError.message)

  if (eventId) {
    const { error } = await supabase.from('events').update({ is_flagship: true } as never).eq('id', eventId)
    if (error) return fail(error.message)
  }

  revalidateEvent()
  return ok()
}

export async function setApplicationsOpenAction(eventId: string, open: boolean): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { data: existing } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle()
  const event = existing as EventRow | null
  if (!event) return fail('Event not found')
  if (open && !stageMeta(event.stage).acceptsApplications) {
    return fail(`Applications can't be opened during the ${stageMeta(event.stage).label} stage.`)
  }

  const { error } = await supabase
    .from('events')
    .update({
      applications_open: open,
      is_public: open ? true : event.is_public,
      applications_open_at: open && !event.applications_open_at ? new Date().toISOString() : event.applications_open_at,
    } as never)
    .eq('id', eventId)
  if (error) return fail(error.message)

  revalidateEvent(event.slug)
  return ok()
}

export async function setEventFeaturesAction(eventId: string, features: EventFeatures): Promise<ActionResult> {
  return updateEventAction(eventId, { features })
}

export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { count } = await supabase
    .from('event_participants')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
  if ((count ?? 0) > 0) {
    return fail('This event has participants. Close and archive it instead of deleting.')
  }

  const { error } = await supabase.from('events').delete().eq('id', eventId)
  if (error) return fail(error.message)

  revalidateEvent()
  return ok()
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export async function applyToEventAction(
  eventId: string,
  responses: Record<string, unknown>,
  submit = true
): Promise<ActionResult<{ applicationId: string }>> {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle()
  const event = eventData as EventRow | null
  if (!event) return fail('Event not found')
  if (!event.applications_open || !stageMeta(event.stage).acceptsApplications) {
    return fail('Applications are not open for this event.')
  }

  const person = await resolvePersonForUser(supabase, user.id)
  if (!person) return fail('Could not resolve your NYC Deli profile.')

  // Prior participation is what makes someone a returning applicant.
  const { count: priorEvents } = await supabase
    .from('event_participants')
    .select('id', { count: 'exact', head: true })
    .eq('person_id', person.id)
    .neq('event_id', eventId)

  const { data: existing } = await supabase
    .from('event_applications')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('person_id', person.id)
    .maybeSingle()

  const payload = {
    responses,
    is_returning: (priorEvents ?? 0) > 0,
    status: (submit ? 'submitted' : 'draft') as ApplicationStatus,
    submitted_at: submit ? new Date().toISOString() : null,
  }

  if (existing) {
    const row = existing as { id: string; status: ApplicationStatus }
    if (!['draft', 'submitted', 'under_review'].includes(row.status)) {
      return fail('Your application has already been decided.')
    }
    const { error } = await supabase.from('event_applications').update(payload as never).eq('id', row.id)
    if (error) return fail(error.message)
    revalidateEvent(event.slug)
    return ok({ applicationId: row.id })
  }

  const { data, error } = await supabase
    .from('event_applications')
    .insert({ event_id: eventId, person_id: person.id, source: 'web', ...payload } as never)
    .select('id')
    .single()
  if (error) return fail(error.message)

  revalidateEvent(event.slug)
  return ok({ applicationId: (data as { id: string }).id })
}

export async function decideApplicationAction(
  applicationId: string,
  status: Extract<ApplicationStatus, 'approved' | 'denied' | 'waitlisted' | 'under_review'>,
  note?: string
): Promise<ActionResult> {
  const { user } = await requireAdmin()
  const supabase = await createClient()

  const { data: appData } = await supabase
    .from('event_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle()
  const application = appData as { id: string; event_id: string; person_id: string; camper_id: string | null } | null
  if (!application) return fail('Application not found')

  const { error } = await supabase
    .from('event_applications')
    .update({
      status,
      decided_at: status === 'under_review' ? null : new Date().toISOString(),
      decided_by: user.id,
      decision_note: note?.trim() || null,
    } as never)
    .eq('id', applicationId)
  if (error) return fail(error.message)

  // Approval is what turns an applicant into an operational participant.
  if (status === 'approved') {
    const { error: participantError } = await supabase
      .from('event_participants')
      .upsert(
        {
          event_id: application.event_id,
          person_id: application.person_id,
          application_id: application.id,
          camper_id: application.camper_id,
          status: 'confirmed',
        } as never,
        { onConflict: 'event_id,person_id' }
      )
    if (participantError) return fail(participantError.message)

    await supabase.from('people').update({ status: 'member' } as never).eq('id', application.person_id)
  }

  await syncAccountWithDecision(supabase, application.person_id, application.camper_id, status, user.id, note)

  revalidatePath('/admin/events')
  revalidatePath(`/admin/events/${application.event_id}`)
  revalidatePath('/admin/applicants')
  return ok()
}

/**
 * Keep the legacy `user_profiles` approval gate in step with an application
 * decision. Until the pending-role flow is retired these are two views of the
 * same judgement, and they must not disagree.
 */
async function syncAccountWithDecision(
  supabase: Awaited<ReturnType<typeof createClient>>,
  personId: string,
  camperId: string | null,
  status: ApplicationStatus,
  adminId: string,
  note?: string
) {
  const { data: personData } = await supabase.from('people').select('user_id').eq('id', personId).maybeSingle()
  const userId = (personData as { user_id: string | null } | null)?.user_id
  if (!userId) return

  if (status === 'approved') {
    await supabase
      .from('user_profiles')
      .update({
        role: 'user',
        approved_at: new Date().toISOString(),
        approved_by: adminId,
        denied_at: null,
        denied_reason: null,
        ...(camperId ? { camper_id: camperId } : {}),
      } as never)
      .eq('id', userId)
      .eq('role', 'pending')
  } else if (status === 'denied') {
    await supabase
      .from('user_profiles')
      .update({
        role: 'pending',
        denied_at: new Date().toISOString(),
        denied_reason: note?.trim() || 'No reason provided',
      } as never)
      .eq('id', userId)
  }
}

/**
 * The reverse bridge: an approve/deny done on the legacy applicants screen is
 * recorded against the person's application for the current event.
 */
export async function syncApplicantDecisionAction(
  email: string,
  decision: 'approved' | 'denied',
  note?: string
): Promise<ActionResult> {
  const { user } = await requireAdmin()
  const supabase = await createClient()

  const { data: personData } = await supabase.from('people').select('id').ilike('email', email.trim()).maybeSingle()
  const person = personData as { id: string } | null
  if (!person) return ok()

  const { data: appData } = await supabase
    .from('event_applications')
    .select('id, event_id, camper_id')
    .eq('person_id', person.id)
    .in('status', ['draft', 'submitted', 'under_review', 'waitlisted'])
    .order('created_at', { ascending: false })
    .limit(1)
  const application = ((appData as { id: string; event_id: string; camper_id: string | null }[] | null) ?? [])[0]
  if (!application) return ok()

  const { error } = await supabase
    .from('event_applications')
    .update({
      status: decision,
      decided_at: new Date().toISOString(),
      decided_by: user.id,
      decision_note: note?.trim() || null,
    } as never)
    .eq('id', application.id)
  if (error) return fail(error.message)

  if (decision === 'approved') {
    await supabase.from('event_participants').upsert(
      {
        event_id: application.event_id,
        person_id: person.id,
        application_id: application.id,
        camper_id: application.camper_id,
        status: 'confirmed',
      } as never,
      { onConflict: 'event_id,person_id' }
    )
    await supabase.from('people').update({ status: 'member' } as never).eq('id', person.id)
  }

  revalidatePath(`/admin/events/${application.event_id}`)
  return ok()
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export async function addParticipantAction(
  eventId: string,
  personId: string,
  role: 'camper' | 'lead' | 'builder' | 'guest' | 'vendor' = 'camper'
): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('event_participants')
    .upsert({ event_id: eventId, person_id: personId, role, status: 'confirmed' } as never, {
      onConflict: 'event_id,person_id',
    })
  if (error) return fail(error.message)

  revalidatePath(`/admin/events/${eventId}`)
  return ok()
}

export async function updateParticipantAction(
  participantId: string,
  patch: { status?: string; role?: string; paid?: boolean; teams?: string[]; notes?: string | null }
): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_participants')
    .update(patch as never)
    .eq('id', participantId)
    .select('event_id')
    .maybeSingle()
  if (error) return fail(error.message)

  if (data) revalidatePath(`/admin/events/${(data as { event_id: string }).event_id}`)
  return ok()
}

export async function removeParticipantAction(participantId: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { data } = await supabase
    .from('event_participants')
    .select('event_id')
    .eq('id', participantId)
    .maybeSingle()

  const { error } = await supabase.from('event_participants').delete().eq('id', participantId)
  if (error) return fail(error.message)

  if (data) revalidatePath(`/admin/events/${(data as { event_id: string }).event_id}`)
  return ok()
}

// ---------------------------------------------------------------------------
// Post-event wrap-up
// ---------------------------------------------------------------------------

export interface EventFeedbackInput {
  rating?: number | null
  whatWorked?: string
  whatDidnt?: string
  suggestions?: string
  wouldReturn?: boolean | null
  isAnonymous?: boolean
}

export async function submitEventFeedbackAction(
  eventId: string,
  input: EventFeedbackInput
): Promise<ActionResult> {
  const user = await requireAuth()
  const supabase = await createClient()

  const person = await resolvePersonForUser(supabase, user.id)
  if (!person) return fail('Could not resolve your NYC Deli profile.')

  const { data: eventData } = await supabase.from('events').select('stage').eq('id', eventId).maybeSingle()
  const stage = (eventData as { stage: EventStage } | null)?.stage
  if (!stage) return fail('Event not found')
  if (stage !== 'post_event') {
    return fail('Feedback is only open while the event is wrapping up.')
  }

  const { error } = await supabase.from('event_feedback').upsert(
    {
      event_id: eventId,
      person_id: person.id,
      rating: input.rating ?? null,
      what_worked: input.whatWorked?.trim() || null,
      what_didnt: input.whatDidnt?.trim() || null,
      suggestions: input.suggestions?.trim() || null,
      would_return: input.wouldReturn ?? null,
      is_anonymous: input.isAnonymous ?? false,
    } as never,
    { onConflict: 'event_id,person_id' }
  )
  if (error) return fail(error.message)

  revalidatePath(`/admin/events/${eventId}`)
  return ok()
}

export async function saveRetroNotesAction(eventId: string, notes: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  // Deliberately allowed on a closed event: lessons often land after archival.
  const { error } = await supabase
    .from('events')
    .update({ retro_notes: notes.trim() || null } as never)
    .eq('id', eventId)
  if (error) return fail(error.message)

  revalidatePath(`/admin/events/${eventId}`)
  return ok()
}
