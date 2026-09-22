'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  EVENT_FEATURE_META,
  EVENT_KIND_LABELS,
  EVENT_STAGES,
  eventDateLabel,
  fetchEventById,
  fetchEventCounts,
  nextStage,
  previousStage,
  stageMeta,
  type EventCounts,
} from '@/lib/events'
import { fetchEventApplications, fetchEventParticipants, personDisplayName } from '@/lib/people'
import {
  closeEventAction,
  decideApplicationAction,
  reopenEventAction,
  removeParticipantAction,
  saveRetroNotesAction,
  setApplicationsOpenAction,
  setEventFeaturesAction,
  setEventStageAction,
  updateEventAction,
} from '@/app/actions/events'
import { createClient } from '@/lib/supabase/client'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import type {
  EventApplicationRow,
  EventFeatureKey,
  EventFeedbackWithPerson,
  EventParticipantRow,
  EventRow,
  EventStage,
  PersonRow,
} from '@/types/database'

type Tab = 'lifecycle' | 'details' | 'modules' | 'applications' | 'participants' | 'wrap_up'

export default function AdminEventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [counts, setCounts] = useState<EventCounts | null>(null)
  const [applications, setApplications] = useState<(EventApplicationRow & { person: PersonRow | null })[]>([])
  const [participants, setParticipants] = useState<(EventParticipantRow & { person: PersonRow | null })[]>([])
  const [feedback, setFeedback] = useState<EventFeedbackWithPerson[]>([])
  const [tab, setTab] = useState<Tab>('lifecycle')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    const [found, eventCounts, apps, parts, feedbackRes] = await Promise.all([
      fetchEventById(id),
      fetchEventCounts(id),
      fetchEventApplications(id),
      fetchEventParticipants(id),
      createClient().from('event_feedback').select('*, person:people(*)').eq('event_id', id),
    ])
    setEvent(found)
    setCounts(eventCounts)
    setApplications(apps)
    setParticipants(parts)
    setFeedback((feedbackRes.data as unknown as EventFeedbackWithPerson[] | null) ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    startTransition(() => { load() })
  }, [load])

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, successText?: string) => {
    const result = await fn()
    if (result.success) {
      if (successText) setMessage({ type: 'success', text: successText })
      load()
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Something went wrong' })
    }
  }

  if (loading) {
    return <p className="max-w-5xl mx-auto px-4 py-10 font-bold uppercase tracking-wider text-gray-500">Loading…</p>
  }
  if (!event) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black uppercase">Event not found</h1>
        <Link href="/admin/events" className="underline font-bold">Back to events</Link>
      </div>
    )
  }

  const meta = stageMeta(event.stage)
  const readOnly = meta.readOnly

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'lifecycle', label: 'Lifecycle' },
    { key: 'details', label: 'Details' },
    { key: 'modules', label: 'Modules' },
    { key: 'applications', label: 'Applications', count: counts?.applications },
    { key: 'participants', label: 'Participants', count: counts?.participants },
    { key: 'wrap_up', label: 'Wrap-Up', count: feedback.length },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/admin/events" className="text-sm font-bold uppercase tracking-wider underline">← Events</Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('px-2 py-0.5 text-xs font-bold uppercase border-2', meta.className)}>
              {meta.icon} Stage {meta.step} · {meta.label}
            </span>
            <Badge>{EVENT_KIND_LABELS[event.kind]}</Badge>
            {event.is_flagship && <Badge variant="warning">Flagship</Badge>}
          </div>
          <h1 className="text-4xl font-black uppercase tracking-wider mt-2">{event.name}</h1>
          <p className="text-gray-600">
            {eventDateLabel(event)}
            {event.location_name && ` · ${event.location_name}`}
          </p>
        </div>
        <Link href={`/events/${event.slug}`}>
          <Button variant="secondary" size="sm">View public page</Button>
        </Link>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'error' : 'success'} className="mt-4">{message.text}</Alert>
      )}

      {readOnly && (
        <Alert variant="warning" title="Archived event" className="mt-4">
          This event is closed and read-only. Participation history is preserved on every person&apos;s profile. Reopen
          it only to correct the record.
        </Alert>
      )}

      <div className="flex flex-wrap gap-1 mt-6 border-b-2 border-black">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-bold uppercase tracking-wider border-2 border-b-0',
              tab === t.key ? 'bg-black text-yellow-400 border-black' : 'bg-white border-transparent hover:bg-gray-100'
            )}
          >
            {t.label}
            {typeof t.count === 'number' && ` (${t.count})`}
          </button>
        ))}
      </div>

      <div className="pt-6">
        {tab === 'lifecycle' && (
          <LifecycleTab
            event={event}
            counts={counts}
            onSetStage={(stage, note) => run(() => setEventStageAction(event.id, stage, note), 'Stage updated.')}
            onClose={note => run(() => closeEventAction(event.id, note), 'Event closed and archived.')}
            onReopen={() => run(() => reopenEventAction(event.id), 'Event reopened.')}
            onToggleApplications={open =>
              run(() => setApplicationsOpenAction(event.id, open), open ? 'Applications opened.' : 'Applications closed.')
            }
          />
        )}

        {tab === 'details' && (
          <DetailsTab
            event={event}
            disabled={readOnly}
            onSave={patch => run(() => updateEventAction(event.id, patch), 'Saved.')}
          />
        )}

        {tab === 'modules' && (
          <ModulesTab
            event={event}
            disabled={readOnly}
            onSave={features => run(() => setEventFeaturesAction(event.id, features), 'Modules updated.')}
          />
        )}

        {tab === 'applications' && (
          <ApplicationsTab
            applications={applications}
            disabled={readOnly}
            onDecide={(applicationId, status) =>
              run(() => decideApplicationAction(applicationId, status), 'Application updated.')
            }
          />
        )}

        {tab === 'participants' && (
          <ParticipantsTab
            participants={participants}
            disabled={readOnly}
            onRemove={participantId => run(() => removeParticipantAction(participantId), 'Participant removed.')}
          />
        )}

        {tab === 'wrap_up' && (
          <WrapUpTab
            event={event}
            feedback={feedback}
            onSaveNotes={notes => run(() => saveRetroNotesAction(event.id, notes), 'Wrap-up notes saved.')}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function LifecycleTab({
  event,
  counts,
  onSetStage,
  onClose,
  onReopen,
  onToggleApplications,
}: {
  event: EventRow
  counts: EventCounts | null
  onSetStage: (stage: EventStage, note?: string) => void
  onClose: (note?: string) => void
  onReopen: () => void
  onToggleApplications: (open: boolean) => void
}) {
  const meta = stageMeta(event.stage)
  const forward = nextStage(event.stage)
  const back = previousStage(event.stage)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="py-4 space-y-4">
          <ol className="space-y-2">
            {EVENT_STAGES.map(stage => {
              const s = stageMeta(stage)
              const isCurrent = stage === event.stage
              const isPast = s.step < meta.step
              return (
                <li
                  key={stage}
                  className={cn(
                    'border-2 p-3 flex flex-wrap items-center justify-between gap-2',
                    isCurrent ? 'border-black bg-yellow-100' : 'border-gray-300 bg-white',
                    isPast && 'opacity-60'
                  )}
                >
                  <div>
                    <p className="font-black uppercase tracking-wider text-sm">
                      {s.icon} Stage {s.step} · {s.label}
                      {isCurrent && <span className="ml-2 text-xs bg-black text-yellow-400 px-2 py-0.5">Current</span>}
                    </p>
                    <p className="text-sm text-gray-600">{s.description}</p>
                    {isCurrent && <p className="text-sm font-bold mt-1">Now: {s.adminFocus}</p>}
                  </div>
                  {!isCurrent && stage !== 'closed' && (
                    <Button size="sm" variant="ghost" onClick={() => onSetStage(stage)}>
                      Jump here
                    </Button>
                  )}
                </li>
              )
            })}
          </ol>

          <div className="flex flex-wrap gap-3 pt-2">
            {back && (
              <Button variant="secondary" size="sm" onClick={() => onSetStage(back)}>
                ← Back to {stageMeta(back).label}
              </Button>
            )}
            {forward && forward !== 'closed' && (
              <Button size="sm" onClick={() => onSetStage(forward)}>
                Advance to {stageMeta(forward).label} →
              </Button>
            )}
            {event.stage === 'closed' ? (
              <Button variant="secondary" size="sm" onClick={onReopen}>Reopen event</Button>
            ) : (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm('Close and archive this event? It becomes read-only. Nobody loses their account or history.')) {
                    onClose()
                  }
                }}
              >
                Close & archive
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <p className="mb-3 text-gray-700">
            {event.applications_open
              ? 'Applications are open. New and returning people can apply from the public event page.'
              : meta.acceptsApplications
                ? 'Applications are closed. Open them when the event is ready to receive applicants.'
                : `Applications can't be opened during the ${meta.label} stage.`}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant={event.applications_open ? 'danger' : 'primary'}
              disabled={!meta.acceptsApplications && !event.applications_open}
              onClick={() => onToggleApplications(!event.applications_open)}
            >
              {event.applications_open ? 'Close applications' : 'Open applications'}
            </Button>
            {counts && (
              <span className="text-sm text-gray-600">
                {counts.applications} total · {counts.pendingApplications} awaiting review · {counts.participants} participants
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DetailsTab({
  event,
  disabled,
  onSave,
}: {
  event: EventRow
  disabled: boolean
  onSave: (patch: Record<string, unknown>) => void
}) {
  const [form, setForm] = useState({
    name: event.name,
    tagline: event.tagline ?? '',
    description: event.description ?? '',
    location_name: event.location_name ?? '',
    location_address: event.location_address ?? '',
    start_date: event.start_date ?? '',
    end_date: event.end_date ?? '',
    build_start_date: event.build_start_date ?? '',
    capacity: event.capacity ? String(event.capacity) : '',
    is_public: event.is_public,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Details</CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Name" value={form.name} disabled={disabled} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Capacity" type="number" value={form.capacity} disabled={disabled} onChange={e => setForm({ ...form, capacity: e.target.value })} />
        </div>
        <Input label="Tagline" value={form.tagline} disabled={disabled} onChange={e => setForm({ ...form, tagline: e.target.value })} />
        <Textarea label="Description" rows={5} value={form.description} disabled={disabled} onChange={e => setForm({ ...form, description: e.target.value })} />
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Location" value={form.location_name} disabled={disabled} onChange={e => setForm({ ...form, location_name: e.target.value })} />
          <Input label="Address" value={form.location_address} disabled={disabled} onChange={e => setForm({ ...form, location_address: e.target.value })} />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Input label="Start Date" type="date" value={form.start_date} disabled={disabled} onChange={e => setForm({ ...form, start_date: e.target.value })} />
          <Input label="End Date" type="date" value={form.end_date} disabled={disabled} onChange={e => setForm({ ...form, end_date: e.target.value })} />
          <Input label="Build Starts" type="date" value={form.build_start_date} disabled={disabled} onChange={e => setForm({ ...form, build_start_date: e.target.value })} />
        </div>
        <Checkbox
          label="Listed publicly"
          checked={form.is_public}
          disabled={disabled}
          onChange={e => setForm({ ...form, is_public: e.target.checked })}
        />
        <Button
          disabled={disabled}
          onClick={() =>
            onSave({
              name: form.name.trim(),
              tagline: form.tagline || null,
              description: form.description || null,
              location_name: form.location_name || null,
              location_address: form.location_address || null,
              start_date: form.start_date || null,
              end_date: form.end_date || null,
              build_start_date: form.build_start_date || null,
              capacity: form.capacity ? Number(form.capacity) : null,
              is_public: form.is_public,
            })
          }
        >
          Save Details
        </Button>
      </CardContent>
    </Card>
  )
}

function ModulesTab({
  event,
  disabled,
  onSave,
}: {
  event: EventRow
  disabled: boolean
  onSave: (features: Partial<Record<EventFeatureKey, boolean>>) => void
}) {
  const [features, setFeatures] = useState<Partial<Record<EventFeatureKey, boolean>>>(event.features ?? {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operational Modules</CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-4">
        <p className="text-gray-700">
          Turn on only what this event actually needs. A bar night doesn&apos;t need an electrical load calculator;
          Burning Man needs everything.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {EVENT_FEATURE_META.map(feature => (
            <label
              key={feature.key}
              className={cn(
                'border-2 border-black p-3 flex gap-3 items-start cursor-pointer',
                features[feature.key] ? 'bg-yellow-100' : 'bg-white',
                disabled && 'opacity-60 cursor-not-allowed'
              )}
            >
              <input
                type="checkbox"
                className="mt-1 w-4 h-4"
                checked={Boolean(features[feature.key])}
                disabled={disabled}
                onChange={e => setFeatures(prev => ({ ...prev, [feature.key]: e.target.checked }))}
              />
              <span>
                <span className="block font-black uppercase text-sm">{feature.label}</span>
                <span className="block text-sm text-gray-600">{feature.description}</span>
              </span>
            </label>
          ))}
        </div>
        <Button disabled={disabled} onClick={() => onSave(features)}>Save Modules</Button>
      </CardContent>
    </Card>
  )
}

function ApplicationsTab({
  applications,
  disabled,
  onDecide,
}: {
  applications: (EventApplicationRow & { person: PersonRow | null })[]
  disabled: boolean
  onDecide: (applicationId: string, status: 'approved' | 'denied' | 'waitlisted' | 'under_review') => void
}) {
  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-600">No applications yet.</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {applications.map(app => (
        <Card key={app.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={
                    app.status === 'approved' ? 'success' : app.status === 'denied' ? 'error' : 'info'
                  }
                >
                  {app.status}
                </Badge>
                {app.is_returning && <Badge variant="warning">Returning member</Badge>}
              </div>
              <h3 className="font-black uppercase mt-1">
                {app.person ? personDisplayName(app.person) : 'Unknown applicant'}
              </h3>
              <p className="text-sm text-gray-600">{app.person?.email}</p>
              {app.person && (
                <Link href={`/admin/people/${app.person.id}`} className="text-sm font-bold underline">
                  View full history →
                </Link>
              )}
              <ResponseList responses={app.responses} />
            </div>
            {!disabled && (
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={() => onDecide(app.id, 'approved')}>Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => onDecide(app.id, 'waitlisted')}>Waitlist</Button>
                <Button size="sm" variant="ghost" onClick={() => onDecide(app.id, 'denied')}>Deny</Button>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

function ResponseList({ responses }: { responses: Record<string, unknown> }) {
  const entries = Object.entries(responses ?? {}).filter(([, value]) => value !== null && value !== '')
  if (entries.length === 0) return null
  return (
    <dl className="mt-3 space-y-1 text-sm">
      {entries.slice(0, 6).map(([key, value]) => (
        <div key={key}>
          <dt className="font-bold uppercase text-xs text-gray-500">{key.replace(/_/g, ' ')}</dt>
          <dd className="text-gray-800">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Stage 8: participant feedback plus the admin record of lessons learned. */
function WrapUpTab({
  event,
  feedback,
  onSaveNotes,
}: {
  event: EventRow
  feedback: EventFeedbackWithPerson[]
  onSaveNotes: (notes: string) => void
}) {
  const [notes, setNotes] = useState(event.retro_notes ?? '')

  const rated = feedback.filter(f => typeof f.rating === 'number')
  const average = rated.length
    ? (rated.reduce((sum, f) => sum + (f.rating ?? 0), 0) / rated.length).toFixed(1)
    : null
  const returning = feedback.filter(f => f.would_return === true).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lessons Learned</CardTitle>
        </CardHeader>
        <CardContent className="py-4 space-y-3">
          <p className="text-gray-700">
            Kept with the event forever, including after it&apos;s archived. Write it down before everyone forgets.
          </p>
          <Textarea rows={8} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What we'd do differently…" />
          <Button onClick={() => onSaveNotes(notes)}>Save Notes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participant Feedback ({feedback.length})</CardTitle>
        </CardHeader>
        <CardContent className="py-4 space-y-4">
          {feedback.length === 0 ? (
            <p className="text-gray-600">
              No feedback yet. Participants can submit it from the event page while the event is in the Post-Event stage.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 text-sm font-bold uppercase tracking-wider">
                {average && <span>Average: {average} / 5</span>}
                <span>Would return: {returning} of {feedback.length}</span>
              </div>

              {feedback.map(item => (
                <div key={item.id} className="border-2 border-black p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black uppercase">
                      {item.is_anonymous ? 'Anonymous' : (item.person ? personDisplayName(item.person) : 'Unknown')}
                    </span>
                    <span className="flex gap-2">
                      {item.rating && <Badge variant="info">{item.rating} / 5</Badge>}
                      {item.would_return === true && <Badge variant="success">Would return</Badge>}
                      {item.would_return === false && <Badge variant="error">Would not return</Badge>}
                    </span>
                  </div>
                  {item.what_worked && <FeedbackLine label="Worked" value={item.what_worked} />}
                  {item.what_didnt && <FeedbackLine label="Didn’t" value={item.what_didnt} />}
                  {item.suggestions && <FeedbackLine label="Suggests" value={item.suggestions} />}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FeedbackLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm mt-2">
      <span className="font-bold uppercase text-xs text-gray-500 mr-2">{label}</span>
      <span className="whitespace-pre-wrap">{value}</span>
    </p>
  )
}

function ParticipantsTab({
  participants,
  disabled,
  onRemove,
}: {
  participants: (EventParticipantRow & { person: PersonRow | null })[]
  disabled: boolean
  onRemove: (participantId: string) => void
}) {
  if (participants.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-600">
          No participants yet. Approving an application adds someone here.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-2 font-black uppercase text-xs">Person</th>
              <th className="py-2 font-black uppercase text-xs">Role</th>
              <th className="py-2 font-black uppercase text-xs">Status</th>
              <th className="py-2 font-black uppercase text-xs">Paid</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {participants.map(p => (
              <tr key={p.id} className="border-b border-gray-200">
                <td className="py-2">
                  {p.person ? (
                    <Link href={`/admin/people/${p.person.id}`} className="font-bold underline">
                      {personDisplayName(p.person)}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-2 uppercase text-xs font-bold">{p.role}</td>
                <td className="py-2 uppercase text-xs font-bold">{p.status}</td>
                <td className="py-2">{p.paid ? '✓' : ''}</td>
                <td className="py-2 text-right">
                  {!disabled && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Remove this participant from the event? Their NYC Deli account is unaffected.')) {
                          onRemove(p.id)
                        }
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
