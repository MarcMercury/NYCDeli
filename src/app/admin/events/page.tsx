'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  EVENT_KIND_LABELS,
  FEATURE_PRESETS,
  INFORMATION_STAGE,
  eventDateLabel,
  fetchEvents,
  stageMeta,
} from '@/lib/events'
import { createEventAction, setFlagshipEventAction } from '@/app/actions/events'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { EventKind, EventRow } from '@/types/database'

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    setEvents(await fetchEvents())
    setLoading(false)
  }, [])

  useEffect(() => {
    startTransition(() => { load() })
  }, [load])

  const active = events.filter(e => e.stage !== 'closed')
  const archived = events.filter(e => e.stage === 'closed')

  const makeFlagship = async (eventId: string) => {
    const result = await setFlagshipEventAction(eventId)
    if (result.success) load()
    else setMessage({ type: 'error', text: result.error })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <Link href="/admin" className="text-sm font-bold uppercase tracking-wider underline">← Admin</Link>
          <h1 className="text-4xl font-black uppercase tracking-wider mt-2">Events</h1>
          <p className="text-gray-600 mt-1">
            Create, develop, operate and archive NYC Deli events. Each event carries its own dates, participants and
            operational modules.
          </p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>{showForm ? 'Cancel' : '+ New Event'}</Button>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'error' : 'success'} className="mb-4">{message.text}</Alert>
      )}

      {active.length === 0 && !loading && (
        <Alert variant="info" title={`Stage 1 — ${INFORMATION_STAGE.label}`} className="mb-6">
          {INFORMATION_STAGE.description}
        </Alert>
      )}

      {showForm && (
        <NewEventForm
          onDone={() => {
            setShowForm(false)
            setMessage({ type: 'success', text: 'Event created. Open it to build out its stages and modules.' })
            load()
          }}
          onError={text => setMessage({ type: 'error', text })}
        />
      )}

      {loading ? (
        <p className="font-bold uppercase tracking-wider text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-8">
          <EventList title="Active" events={active} onMakeFlagship={makeFlagship} />
          {archived.length > 0 && <EventList title="Archived" events={archived} onMakeFlagship={makeFlagship} />}
        </div>
      )}
    </div>
  )
}

function EventList({
  title,
  events,
  onMakeFlagship,
}: {
  title: string
  events: EventRow[]
  onMakeFlagship: (id: string) => void
}) {
  if (events.length === 0) return null
  return (
    <section>
      <h2 className="text-lg font-black uppercase tracking-wider border-b-2 border-black pb-1 mb-3">{title}</h2>
      <div className="space-y-3">
        {events.map(event => {
          const meta = stageMeta(event.stage)
          return (
            <Card key={event.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('px-2 py-0.5 text-xs font-bold uppercase border-2', meta.className)}>
                      {meta.icon} Stage {meta.step} · {meta.label}
                    </span>
                    <Badge>{EVENT_KIND_LABELS[event.kind]}</Badge>
                    {event.is_flagship && <Badge variant="warning">Flagship</Badge>}
                    {event.applications_open && <Badge variant="success">Applications open</Badge>}
                    {!event.is_public && <Badge>Unlisted</Badge>}
                  </div>
                  <h3 className="text-xl font-black uppercase mt-1">{event.name}</h3>
                  <p className="text-sm text-gray-600">
                    {eventDateLabel(event)}
                    {event.location_name && ` · ${event.location_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!event.is_flagship && event.stage !== 'closed' && (
                    <Button size="sm" variant="ghost" onClick={() => onMakeFlagship(event.id)}>
                      Make flagship
                    </Button>
                  )}
                  <Link href={`/admin/events/${event.id}`}>
                    <Button size="sm" variant="secondary">Manage</Button>
                  </Link>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

function NewEventForm({ onDone, onError }: { onDone: () => void; onError: (text: string) => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    kind: 'camp_social' as EventKind,
    tagline: '',
    description: '',
    locationName: '',
    startDate: '',
    endDate: '',
    buildStartDate: '',
  })

  const submit = async () => {
    setSaving(true)
    const result = await createEventAction({
      name: form.name,
      kind: form.kind,
      tagline: form.tagline,
      description: form.description,
      locationName: form.locationName,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      buildStartDate: form.buildStartDate || null,
      features: FEATURE_PRESETS[form.kind],
    })
    setSaving(false)
    if (result.success) onDone()
    else onError(result.error)
  }

  const presetCount = Object.values(FEATURE_PRESETS[form.kind] ?? {}).filter(Boolean).length

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>New Event</CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <Select
            label="Type"
            value={form.kind}
            onChange={e => setForm({ ...form, kind: e.target.value as EventKind })}
            options={Object.entries(EVENT_KIND_LABELS).map(([value, label]) => ({ value, label }))}
            helpText={`Starts with ${presetCount} module${presetCount === 1 ? '' : 's'} enabled — change any of it later.`}
          />
        </div>
        <Input label="Tagline" value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} />
        <Textarea label="Description" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <div className="grid md:grid-cols-4 gap-4">
          <Input label="Location" value={form.locationName} onChange={e => setForm({ ...form, locationName: e.target.value })} />
          <Input label="Start Date" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
          <Input label="End Date" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
          <Input label="Build Starts" type="date" value={form.buildStartDate} onChange={e => setForm({ ...form, buildStartDate: e.target.value })} />
        </div>
        <Button onClick={submit} loading={saving} disabled={!form.name.trim()}>Create Event</Button>
      </CardContent>
    </Card>
  )
}
