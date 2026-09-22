'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { fetchCalendar, formatCalendarDate, upcomingItems, type CalendarItem } from '@/lib/calendar'
import { eventDateLabel, fetchOpenEvents, stageMeta } from '@/lib/events'
import { fetchPersonHistory, summarizeHistory } from '@/lib/people'
import { getMyPersonAction, updateMyPersonAction } from '@/app/actions/people'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from '@/components/ui'
import type { EventRow, PersonHistory, PersonRow, PersonSelfUpdate } from '@/types/database'

/**
 * The member's permanent NYC Deli record, shown as a tab inside Profile.
 * Deliberately independent of any active event: contact info, history and
 * upcoming activity keep working between events.
 *
 * Edits here mirror onto the camper row and profile bio (see
 * updateMyPersonAction) so the same facts don't drift between screens.
 */
export function MyDeliPanel({ onPersonSaved }: { onPersonSaved?: () => void }) {
  const [person, setPerson] = useState<PersonRow | null>(null)
  const [history, setHistory] = useState<PersonHistory | null>(null)
  const [openEvents, setOpenEvents] = useState<EventRow[]>([])
  const [upcoming, setUpcoming] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    const result = await getMyPersonAction()
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }
    const me = result.data!
    setPerson(me)

    const [personHistory, events, calendar] = await Promise.all([
      fetchPersonHistory(me.id),
      fetchOpenEvents(),
      fetchCalendar(),
    ])
    setHistory(personHistory)
    setOpenEvents(events)
    setUpcoming(upcomingItems(calendar).slice(0, 6))
    setLoading(false)
  }, [])

  useEffect(() => {
    startTransition(() => { load() })
  }, [load])

  if (loading) {
    return <p className="font-bold uppercase tracking-wider text-gray-500">Loading…</p>
  }

  if (error || !person) {
    return <Alert variant="error">{error ?? 'Could not load your profile.'}</Alert>
  }

  const summary = history ? summarizeHistory(history) : null
  const appliedOnly = (history?.applications ?? []).filter(
    app => !history?.participations.some(p => p.event_id === app.event_id)
  )

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-wider">My NYC Deli</h2>
        <p className="text-gray-600 mt-1">
          Your permanent account with the camp — it stays with you between events.
        </p>
      </div>

      {summary && summary.eventsAttended > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Events attended" value={String(summary.eventsAttended)} />
          <Stat label="Applications" value={String(summary.eventsApplied)} />
          <Stat label="Member since" value={summary.firstEventYear ? String(summary.firstEventYear) : '—'} />
        </div>
      )}

      <PersonForm
        person={person}
        onSaved={next => {
          setPerson(next)
          onPersonSaved?.()
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Participation History</CardTitle>
        </CardHeader>
        <CardContent className="py-4 space-y-3">
          {(history?.participations.length ?? 0) === 0 && appliedOnly.length === 0 ? (
            <p className="text-gray-600">No event history yet.</p>
          ) : (
            <>
              {history?.participations.map(p => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
                  <div>
                    <p className="font-black uppercase">{p.event?.name ?? 'Event'}</p>
                    <p className="text-sm text-gray-600">
                      {p.event ? eventDateLabel(p.event) : ''} · {p.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.status === 'attended' ? 'success' : 'info'}>{p.status}</Badge>
                    {p.event && (
                      <Link href={`/events/${p.event.slug}`} className="text-sm font-bold underline">View</Link>
                    )}
                  </div>
                </div>
              ))}
              {appliedOnly.map(app => (
                <div key={app.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
                  <div>
                    <p className="font-black uppercase">{app.event?.name ?? 'Event'}</p>
                    <p className="text-sm text-gray-600">Applied {app.submitted_at?.slice(0, 10) ?? ''}</p>
                  </div>
                  <Badge>{app.status}</Badge>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open Applications</CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          {openEvents.length === 0 ? (
            <p className="text-gray-600">
              Nothing is open for applications right now. Upcoming events get announced on the{' '}
              <Link href="/calendar" className="underline font-bold">camp calendar</Link>.
            </p>
          ) : (
            <div className="space-y-3">
              {openEvents.map(event => (
                <div key={event.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-black uppercase">{event.name}</p>
                    <p className="text-sm text-gray-600">
                      {eventDateLabel(event)} · {stageMeta(event.stage).label}
                    </p>
                  </div>
                  <Link href={`/events/${event.slug}`}>
                    <Button size="sm">Apply</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming NYC Deli Activity</CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          {upcoming.length === 0 ? (
            <p className="text-gray-600">Nothing scheduled yet.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map(item => (
                <li key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-gray-200 pb-2">
                  <span className="font-bold">{item.title}</span>
                  <span className="text-sm text-gray-600">{formatCalendarDate(item)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/calendar" className="inline-block mt-4 text-sm font-bold underline">
            Full camp calendar →
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="text-center py-4">
      <p className="text-3xl font-black">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wider text-gray-600">{label}</p>
    </Card>
  )
}

function PersonForm({ person, onSaved }: { person: PersonRow; onSaved: (p: PersonRow) => void }) {
  const [form, setForm] = useState<PersonSelfUpdate>({
    full_name: person.full_name,
    preferred_name: person.preferred_name,
    playa_name: person.playa_name,
    phone: person.phone,
    pronouns: person.pronouns,
    city: person.city,
    emergency_contact_name: person.emergency_contact_name,
    emergency_contact_number: person.emergency_contact_number,
    emergency_contact_relationship: person.emergency_contact_relationship,
    dietary_restrictions: person.dietary_restrictions,
    allergies: person.allergies,
    bio: person.bio,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const set = (key: keyof PersonSelfUpdate) => (value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    setSaving(true)
    const result = await updateMyPersonAction(form)
    setSaving(false)
    if (result.success && result.data) {
      onSaved(result.data)
      setMessage({ type: 'success', text: 'Saved.' })
    } else if (!result.success) {
      setMessage({ type: 'error', text: result.error })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Information</CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-4">
        {message && <Alert variant={message.type === 'error' ? 'error' : 'success'}>{message.text}</Alert>}

        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Full Name" value={form.full_name ?? ''} onChange={e => set('full_name')(e.target.value)} required />
          <Input label="Email" value={person.email} disabled helpText="Your sign-in address." />
          <Input label="Preferred Name" value={form.preferred_name ?? ''} onChange={e => set('preferred_name')(e.target.value)} />
          <Input label="Playa Name" value={form.playa_name ?? ''} onChange={e => set('playa_name')(e.target.value)} />
          <Input label="Phone" value={form.phone ?? ''} onChange={e => set('phone')(e.target.value)} />
          <Input label="Pronouns" value={form.pronouns ?? ''} onChange={e => set('pronouns')(e.target.value)} />
          <Input label="City" value={form.city ?? ''} onChange={e => set('city')(e.target.value)} />
        </div>

        <h3 className="font-black uppercase tracking-wider text-sm pt-2">Emergency Contact</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Input label="Name" value={form.emergency_contact_name ?? ''} onChange={e => set('emergency_contact_name')(e.target.value)} />
          <Input label="Number" value={form.emergency_contact_number ?? ''} onChange={e => set('emergency_contact_number')(e.target.value)} />
          <Input label="Relationship" value={form.emergency_contact_relationship ?? ''} onChange={e => set('emergency_contact_relationship')(e.target.value)} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Dietary Restrictions" value={form.dietary_restrictions ?? ''} onChange={e => set('dietary_restrictions')(e.target.value)} />
          <Input label="Allergies" value={form.allergies ?? ''} onChange={e => set('allergies')(e.target.value)} />
        </div>

        <Textarea label="Bio" rows={4} value={form.bio ?? ''} onChange={e => set('bio')(e.target.value)} />

        <Button onClick={save} loading={saving}>Save</Button>
      </CardContent>
    </Card>
  )
}
