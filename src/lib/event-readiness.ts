import { createClient } from '@/lib/supabase/client'
import { scopeToEvent } from '@/lib/active-event'
import { hasFeature, stageMeta } from '@/lib/events'
import type { DeliSupabase } from '@/lib/events'
import type { EventRow, EventStage } from '@/types/database'

/**
 * Stage readiness.
 *
 * An event moves forward when the work of the current stage is actually done —
 * not when someone remembers what "done" meant. Each stage declares the things
 * that must be true before the next one makes sense, computed live from the
 * same tables the ops screens use.
 */

export interface ReadinessCheck {
  key: string
  label: string
  /** Current state in the event's own numbers. */
  detail: string
  done: boolean
  /** Required checks block advancing; the rest are advisories. */
  required: boolean
  href?: string
}

export interface EventReadiness {
  stage: EventStage
  checks: ReadinessCheck[]
  blockers: ReadinessCheck[]
  done: number
  total: number
}

interface Counts {
  applications: number
  undecidedApplications: number
  participants: number
  confirmedParticipants: number
  floorplans: number
  scheduleItems: number
  inventory: number
  inventoryVerified: number
  draftsPublished: number
  calendarItems: number
  feedback: number
  photoAlbums: number
}

function db(client?: DeliSupabase): DeliSupabase {
  return client ?? (createClient() as DeliSupabase)
}

async function fetchCounts(event: EventRow, client?: DeliSupabase): Promise<Counts> {
  const supabase = db(client)
  const head = { count: 'exact' as const, head: true }
  const scoped = <Q extends { or(f: string): Q }>(q: Q) => scopeToEvent(q, event.id)

  const [
    applications,
    undecided,
    participants,
    confirmed,
    floorplans,
    scheduleItems,
    inventory,
    inventoryVerified,
    drafts,
    calendarItems,
    feedback,
    photoAlbums,
  ] = await Promise.all([
    supabase.from('event_applications').select('id', head).eq('event_id', event.id),
    supabase.from('event_applications').select('id', head).eq('event_id', event.id)
      .in('status', ['draft', 'submitted', 'under_review']),
    supabase.from('event_participants').select('id', head).eq('event_id', event.id),
    supabase.from('event_participants').select('id', head).eq('event_id', event.id)
      .in('status', ['confirmed', 'attended']),
    scoped(supabase.from('floorplan_configs').select('id', head).eq('is_active', true)),
    scoped(supabase.from('build_schedule_items').select('id', head)),
    scoped(supabase.from('build_inventory').select('id', head)),
    scoped(supabase.from('build_inventory').select('id', head).eq('verified', true)),
    supabase.from('shift_drafts').select('id', head).eq('status', 'drafted'),
    supabase.from('camp_events').select('id', head).eq('event_id', event.id),
    supabase.from('event_feedback').select('id', head).eq('event_id', event.id),
    supabase.from('event_photo_albums').select('id', head).eq('event_id', event.id),
  ])

  return {
    applications: applications.count ?? 0,
    undecidedApplications: undecided.count ?? 0,
    participants: participants.count ?? 0,
    confirmedParticipants: confirmed.count ?? 0,
    floorplans: floorplans.count ?? 0,
    scheduleItems: scheduleItems.count ?? 0,
    inventory: inventory.count ?? 0,
    inventoryVerified: inventoryVerified.count ?? 0,
    draftsPublished: drafts.count ?? 0,
    calendarItems: calendarItems.count ?? 0,
    feedback: feedback.count ?? 0,
    photoAlbums: photoAlbums.count ?? 0,
  }
}

function buildChecks(event: EventRow, c: Counts): ReadinessCheck[] {
  const admin = `/admin/events/${event.id}`
  const feature = (key: Parameters<typeof hasFeature>[1]) => hasFeature(event, key)
  const checks: ReadinessCheck[] = []
  const add = (check: ReadinessCheck) => checks.push(check)

  switch (event.stage) {
    case 'development':
      add({
        key: 'dates', label: 'Dates are set', required: true,
        detail: event.start_date ? `Starts ${event.start_date}` : 'No start date yet',
        done: Boolean(event.start_date), href: `${admin}?tab=details`,
      })
      add({
        key: 'description', label: 'Description written', required: true,
        detail: event.description ? 'Written' : 'Empty — applicants have nothing to read',
        done: Boolean(event.description?.trim()), href: `${admin}?tab=details`,
      })
      add({
        key: 'modules', label: 'Modules chosen', required: true,
        detail: `${Object.values(event.features ?? {}).filter(Boolean).length} turned on`,
        done: Object.values(event.features ?? {}).some(Boolean), href: `${admin}?tab=modules`,
      })
      if (feature('applications')) {
        add({
          key: 'form', label: 'Application form defined', required: false,
          detail: event.application_schema?.length
            ? `${event.application_schema.length} questions`
            : 'Using the default questions',
          done: Boolean(event.application_schema?.length), href: `${admin}?tab=applications`,
        })
      }
      break

    case 'application':
      add({
        key: 'public', label: 'Listed publicly', required: true,
        detail: event.is_public ? 'Visible on /events' : 'Hidden — nobody can find it',
        done: event.is_public, href: `${admin}?tab=details`,
      })
      add({
        key: 'open', label: 'Applications open', required: true,
        detail: event.applications_open ? 'Accepting applications' : 'Closed',
        done: event.applications_open, href: admin,
      })
      add({
        key: 'received', label: 'Applications received', required: false,
        detail: `${c.applications} submitted`,
        done: c.applications > 0, href: `${admin}?tab=applications`,
      })
      add({
        key: 'calendar', label: 'Key dates on the calendar', required: false,
        detail: `${c.calendarItems} item${c.calendarItems === 1 ? '' : 's'}`,
        done: c.calendarItems > 0, href: '/events?view=calendar',
      })
      break

    case 'prep':
      add({
        key: 'decided', label: 'Applications reviewed', required: true,
        detail: c.undecidedApplications === 0
          ? 'All decided'
          : `${c.undecidedApplications} still waiting on a decision`,
        done: c.undecidedApplications === 0, href: `${admin}?tab=applications`,
      })
      add({
        key: 'roster', label: 'Roster started', required: true,
        detail: `${c.participants} participant${c.participants === 1 ? '' : 's'}`,
        done: c.participants > 0, href: `${admin}?tab=participants`,
      })
      if (feature('layout')) {
        add({
          key: 'layout', label: 'Camp layout drafted', required: false,
          detail: c.floorplans > 0 ? 'Active floorplan exists' : 'No active floorplan',
          done: c.floorplans > 0, href: '/admin/layout-builder',
        })
      }
      if (feature('build_week')) {
        add({
          key: 'build', label: 'Build schedule started', required: false,
          detail: `${c.scheduleItems} task${c.scheduleItems === 1 ? '' : 's'}`,
          done: c.scheduleItems > 0, href: '/build-week',
        })
      }
      break

    case 'finalization':
      add({
        key: 'closed', label: 'Applications closed', required: true,
        detail: event.applications_open ? 'Still open' : 'Closed',
        done: !event.applications_open, href: admin,
      })
      add({
        key: 'decided', label: 'Every application decided', required: true,
        detail: c.undecidedApplications === 0 ? 'All decided' : `${c.undecidedApplications} undecided`,
        done: c.undecidedApplications === 0, href: `${admin}?tab=applications`,
      })
      add({
        key: 'confirmed', label: 'Roster confirmed', required: true,
        detail: `${c.confirmedParticipants} of ${c.participants} confirmed`,
        done: c.participants > 0 && c.confirmedParticipants === c.participants,
        href: `${admin}?tab=participants`,
      })
      if (feature('layout')) {
        add({
          key: 'layout', label: 'Layout finalized', required: true,
          detail: c.floorplans > 0 ? 'Active floorplan set' : 'No active floorplan',
          done: c.floorplans > 0, href: '/admin/layout-builder',
        })
      }
      if (feature('shift_draft')) {
        add({
          key: 'draft', label: 'Shifts drafted', required: false,
          detail: c.draftsPublished > 0 ? 'A draft has been published' : 'No published draft',
          done: c.draftsPublished > 0, href: '/admin/shift-draft',
        })
      }
      if (feature('build_week')) {
        add({
          key: 'build', label: 'Build schedule filled in', required: false,
          detail: `${c.scheduleItems} task${c.scheduleItems === 1 ? '' : 's'}`,
          done: c.scheduleItems > 0, href: '/build-week',
        })
      }
      if (feature('inventory')) {
        add({
          key: 'inventory', label: 'Inventory verified', required: false,
          detail: `${c.inventoryVerified} of ${c.inventory} verified`,
          done: c.inventory > 0 && c.inventoryVerified === c.inventory, href: '/build-week',
        })
      }
      break

    case 'build':
      if (feature('build_week')) {
        add({
          key: 'build', label: 'Build schedule published', required: true,
          detail: `${c.scheduleItems} task${c.scheduleItems === 1 ? '' : 's'}`,
          done: c.scheduleItems > 0, href: '/build-week',
        })
      }
      if (feature('inventory')) {
        add({
          key: 'inventory', label: 'Inventory checked off', required: false,
          detail: `${c.inventoryVerified} of ${c.inventory} verified`,
          done: c.inventory > 0 && c.inventoryVerified === c.inventory, href: '/build-week',
        })
      }
      if (feature('layout')) {
        add({
          key: 'layout', label: 'Layout available onsite', required: false,
          detail: c.floorplans > 0 ? 'Active floorplan set' : 'No active floorplan',
          done: c.floorplans > 0, href: '/admin/layout-builder',
        })
      }
      break

    case 'live':
      add({
        key: 'roster', label: 'Roster reflects who actually showed', required: false,
        detail: `${c.confirmedParticipants} of ${c.participants} confirmed`,
        done: c.participants > 0 && c.confirmedParticipants === c.participants,
        href: `${admin}?tab=participants`,
      })
      break

    case 'post_event':
      add({
        key: 'feedback', label: 'Feedback collected', required: false,
        detail: `${c.feedback} response${c.feedback === 1 ? '' : 's'} from ${c.participants} participants`,
        done: c.feedback > 0, href: `${admin}?tab=wrap_up`,
      })
      add({
        key: 'retro', label: 'Lessons learned written up', required: true,
        detail: event.retro_notes?.trim() ? 'Captured' : 'Nothing written yet',
        done: Boolean(event.retro_notes?.trim()), href: `${admin}?tab=wrap_up`,
      })
      add({
        key: 'photos', label: 'Photo drives linked', required: false,
        detail: `${c.photoAlbums} album${c.photoAlbums === 1 ? '' : 's'}`,
        done: c.photoAlbums > 0, href: `${admin}?tab=photos`,
      })
      add({
        key: 'attendance', label: 'Attendance recorded', required: false,
        detail: `${c.confirmedParticipants} of ${c.participants} marked`,
        done: c.participants > 0 && c.confirmedParticipants === c.participants,
        href: `${admin}?tab=participants`,
      })
      break

    case 'closed':
      break
  }

  return checks
}

export async function fetchEventReadiness(
  event: EventRow,
  client?: DeliSupabase
): Promise<EventReadiness> {
  const counts = await fetchCounts(event, client)
  const checks = buildChecks(event, counts)
  return {
    stage: event.stage,
    checks,
    blockers: checks.filter(check => check.required && !check.done),
    done: checks.filter(check => check.done).length,
    total: checks.length,
  }
}

/** What the admin is being asked to finish before the next stage opens. */
export function readinessHeadline(readiness: EventReadiness): string {
  if (readiness.total === 0) return stageMeta(readiness.stage).adminFocus
  if (readiness.blockers.length > 0) {
    return `${readiness.blockers.length} thing${readiness.blockers.length === 1 ? '' : 's'} left before this event can move on.`
  }
  return readiness.done === readiness.total
    ? 'Everything for this stage is done — ready to advance.'
    : 'Required work is done. The rest is optional polish.'
}
