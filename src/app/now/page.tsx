'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getOpsEvent, withOpsScope } from '@/lib/active-event'
import { fetchCalendar, formatCalendarTime } from '@/lib/calendar'
import { eventDateLabel, stageMeta } from '@/lib/events'
import {
  formatShiftWindow,
  readCachedSnapshot,
  snapshotAge,
  upcomingShifts,
  writeCachedSnapshot,
  type NowContact,
  type NowShift,
  type NowSnapshot,
} from '@/lib/now-snapshot'
import { cn } from '@/lib/utils'
import type { CamperRow, EventRow, FloorplanObjectRow, KitchenRole, KitchenShift, ScheduleAssignment } from '@/types/database'

/**
 * The onsite view. During build and the event itself this is the whole app:
 * where you sleep, when you work, who to call. It renders from a local cache
 * first so it still works when the playa has no signal.
 */
export default function NowPage() {
  const [snapshot, setSnapshot] = useState<NowSnapshot | null>(null)
  const [stale, setStale] = useState(false)
  const [refreshing, setRefreshing] = useState(true)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    const cached = readCachedSnapshot()
    if (cached) {
      setSnapshot(cached)
      setStale(true)
    }

    try {
      const fresh = await buildSnapshot()
      setSnapshot(fresh)
      setStale(false)
      writeCachedSnapshot(fresh)
    } catch {
      // Offline or the request failed — whatever was cached stays on screen.
      setStale(true)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    startTransition(() => { load() })
  }, [load])

  if (!snapshot) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <p className="font-bold uppercase tracking-wider text-gray-500">
          {refreshing ? 'Loading…' : 'Nothing cached yet. Connect once to download your info.'}
        </p>
      </div>
    )
  }

  const shifts = upcomingShifts(snapshot.shifts)
  const meta = snapshot.event ? stageMeta(snapshot.event.stage) : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 print:max-w-none">
      <header className="border-b-4 border-black pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-black uppercase tracking-wider">
            {snapshot.event?.name ?? 'NYC Deli Rats'}
          </h1>
          <button
            onClick={() => { setRefreshing(true); load() }}
            className="text-xs font-bold uppercase tracking-wider border-2 border-black px-3 py-1 print:hidden"
          >
            {refreshing ? 'Syncing…' : 'Refresh'}
          </button>
        </div>
        {snapshot.event && (
          <p className="font-bold text-gray-700">
            {eventDateLabel(snapshot.event)}
            {snapshot.event.location_name && ` · ${snapshot.event.location_name}`}
            {meta && ` · ${meta.label}`}
          </p>
        )}
        <p className={cn('text-xs font-bold uppercase tracking-wider mt-1', stale ? 'text-orange-700' : 'text-gray-500')}>
          {stale ? `Offline copy — saved ${snapshotAge(snapshot)}` : `Up to date · ${snapshotAge(snapshot)}`}
        </p>
      </header>

      <Panel title="Where you are">
        <Row label="Camp" value={snapshot.camp.address ?? snapshot.event?.location_address ?? '—'} />
        <Row label="Your shelter" value={snapshot.camp.tent ?? 'Not placed yet'} />
        <Row label="Zone" value={snapshot.camp.zone ?? '—'} />
      </Panel>

      <Panel title={`Your shifts (${shifts.length})`}>
        {shifts.length === 0 ? (
          <p className="text-gray-600">No shifts scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {shifts.map(shift => (
              <li key={shift.id} className="border-2 border-black p-2">
                <p className="font-black uppercase">{shift.title}</p>
                <p className="text-sm font-bold">{formatShiftWindow(shift)}</p>
                {shift.location && <p className="text-sm text-gray-600">{shift.location}</p>}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {snapshot.today.length > 0 && (
        <Panel title="Happening now">
          <ul className="space-y-1">
            {snapshot.today.map(item => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="font-bold">{item.title}</span>
                <span className="text-sm text-gray-600">{formatCalendarTime(item) ?? 'All day'}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Who to find">
        {snapshot.contacts.length === 0 ? (
          <p className="text-gray-600">No leads listed.</p>
        ) : (
          <ul className="space-y-1">
            {snapshot.contacts.map(contact => (
              <li key={contact.name} className="flex justify-between gap-3">
                <span className="font-bold">{contact.name}</span>
                <span className="text-sm text-gray-600">
                  {contact.role}
                  {contact.phone && ` · ${contact.phone}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="In an emergency">
        <Row label="Your contact" value={snapshot.emergency.name ?? '—'} />
        <Row label="Number" value={snapshot.emergency.number ?? '—'} />
        <Row label="Relationship" value={snapshot.emergency.relationship ?? '—'} />
        <p className="text-sm text-gray-600 mt-2">
          Onsite medical and rangers are the first call. This is who the camp contacts for you.
        </p>
      </Panel>

      <div className="flex flex-wrap gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="text-sm font-bold uppercase tracking-wider border-2 border-black px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        >
          Print this page
        </button>
        <Link
          href="/"
          className="text-sm font-bold uppercase tracking-wider border-2 border-black px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        >
          Full site
        </Link>
      </div>

      <p className="text-xs text-gray-500 print:hidden">
        This page keeps a copy on your device. Load it once with signal and it stays available without one.
      </p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] print:shadow-none">
      <h2 className="bg-black text-yellow-400 px-3 py-2 text-sm font-black uppercase tracking-wider print:bg-white print:text-black print:border-b-2 print:border-black">
        {title}
      </h2>
      <div className="p-3">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-200 py-1 last:border-0">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
      <span className="font-bold text-right">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------

async function buildSnapshot(): Promise<NowSnapshot> {
  const supabase = createClient()
  const event = await getOpsEvent()
  const { data: { user } } = await supabase.auth.getUser()

  const empty: NowSnapshot = {
    capturedAt: new Date().toISOString(),
    event: eventSummary(event),
    person: null,
    camp: { address: null, tent: null, zone: null },
    shifts: [],
    today: [],
    contacts: [],
    emergency: { name: null, number: null, relationship: null },
    notes: [],
  }
  if (!user?.email) return empty

  const { data: camperData } = await withOpsScope(
    supabase.from('campers').select('*').ilike('email', user.email).limit(1)
  )
  const camper = ((camperData as CamperRow[] | null) ?? [])[0] ?? null

  const [shifts, today, contacts, tent] = await Promise.all([
    fetchMyShifts(supabase, camper?.id ?? null),
    fetchToday(),
    fetchContacts(supabase),
    fetchTentLabel(supabase, camper?.id ?? null),
  ])

  return {
    ...empty,
    person: camper ? { name: camper.full_name, playaName: camper.playa_name } : null,
    camp: {
      address: event?.location_address ?? null,
      tent,
      zone: camper?.zone_assignment ?? null,
    },
    shifts,
    today,
    contacts,
    emergency: {
      name: camper?.emergency_contact_name ?? null,
      number: camper?.emergency_contact_number ?? null,
      relationship: camper?.emergency_contact_relationship ?? null,
    },
  }
}

function eventSummary(event: EventRow | null): NowSnapshot['event'] {
  if (!event) return null
  const { id, name, slug, stage, start_date, end_date, location_name, location_address } = event
  return { id, name, slug, stage, start_date, end_date, location_name, location_address }
}

async function fetchMyShifts(
  supabase: ReturnType<typeof createClient>,
  camperId: string | null
): Promise<NowShift[]> {
  if (!camperId) return []

  const { data: assignmentData } = await supabase
    .from('schedule_assignments')
    .select('*')
    .eq('camper_id', camperId)
  const assignments = (assignmentData as ScheduleAssignment[] | null) ?? []
  if (assignments.length === 0) return []

  const { data: shiftData } = await supabase
    .from('kitchen_shifts')
    .select('*')
    .in('id', assignments.map(a => a.shift_id))
  const shifts = (shiftData as KitchenShift[] | null) ?? []

  const { data: roleData } = await withOpsScope(supabase.from('kitchen_roles').select('*'))
  const roles = new Map(((roleData as KitchenRole[] | null) ?? []).map(r => [r.id, r]))

  return assignments.flatMap(assignment => {
    const shift = shifts.find(s => s.id === assignment.shift_id)
    if (!shift) return []
    return [{
      id: assignment.id,
      title: roles.get(shift.role_id)?.name ?? 'Shift',
      date: shift.date,
      startTime: shift.start_time,
      endTime: shift.end_time,
      location: null,
      status: assignment.status,
    }]
  })
}

async function fetchToday() {
  const today = new Date().toISOString().slice(0, 10)
  const items = await fetchCalendar({ from: today, to: today })
  return items
}

async function fetchContacts(supabase: ReturnType<typeof createClient>): Promise<NowContact[]> {
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('email, role, camper_id')
    .in('role', ['admin', 'builder'])
  const profiles = (profileData as { email: string; role: string; camper_id: string | null }[] | null) ?? []

  const camperIds = profiles.map(p => p.camper_id).filter((id): id is string => Boolean(id))
  if (camperIds.length === 0) return []

  const { data: camperData } = await supabase
    .from('campers')
    .select('id, full_name, playa_name, phone')
    .in('id', camperIds)
  const campers = (camperData as Pick<CamperRow, 'id' | 'full_name' | 'playa_name' | 'phone'>[] | null) ?? []

  return profiles.flatMap(profile => {
    const camper = campers.find(c => c.id === profile.camper_id)
    if (!camper) return []
    return [{
      name: camper.playa_name?.trim() || camper.full_name,
      role: profile.role === 'admin' ? 'Camp lead' : 'Builder',
      phone: camper.phone,
    }]
  })
}

async function fetchTentLabel(
  supabase: ReturnType<typeof createClient>,
  camperId: string | null
): Promise<string | null> {
  if (!camperId) return null
  const { data } = await supabase
    .from('floorplan_objects')
    .select('label, object_type, camper_ids')
    .contains('camper_ids', [camperId])
    .limit(1)
  const object = ((data as Pick<FloorplanObjectRow, 'label' | 'object_type' | 'camper_ids'>[] | null) ?? [])[0]
  return object?.label ?? null
}
