'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  EVENT_KIND_LABELS,
  applicationFields,
  enabledFeatures,
  eventDateLabel,
  fetchEventBySlug,
  isAcceptingApplications,
  stageMeta,
} from '@/lib/events'
import { fetchPersonByUserId, fetchPersonHistory, summarizeHistory } from '@/lib/people'
import { applyToEventAction, submitEventFeedbackAction } from '@/app/actions/events'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import type {
  EventApplicationField,
  EventApplicationRow,
  EventFeedbackRow,
  EventRow,
  PersonHistory,
  PersonRow,
} from '@/types/database'

export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [person, setPerson] = useState<PersonRow | null>(null)
  const [history, setHistory] = useState<PersonHistory | null>(null)
  const [application, setApplication] = useState<EventApplicationRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    const supabase = createClient()
    const found = await fetchEventBySlug(slug)
    setEvent(found)

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user && found) {
      const me = await fetchPersonByUserId(session.user.id)
      setPerson(me)
      if (me) {
        setHistory(await fetchPersonHistory(me.id))
        const { data } = await supabase
          .from('event_applications')
          .select('*')
          .eq('event_id', found.id)
          .eq('person_id', me.id)
          .maybeSingle()
        setApplication((data as EventApplicationRow | null) ?? null)
      }
    }
    setLoading(false)
  }, [slug])

  useEffect(() => {
    startTransition(() => { load() })
  }, [load])

  if (loading) {
    return <p className="max-w-4xl mx-auto px-4 py-10 font-bold uppercase tracking-wider text-gray-500">Loading…</p>
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black uppercase">Event not found</h1>
        <Link href="/events" className="underline font-bold">Back to events</Link>
      </div>
    )
  }

  const meta = stageMeta(event.stage)
  const open = isAcceptingApplications(event)
  const modules = enabledFeatures(event)
  const summary = history ? summarizeHistory(history) : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/events" className="text-sm font-bold uppercase tracking-wider underline">← All events</Link>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className={cn('px-2 py-0.5 text-xs font-bold uppercase border-2', meta.className)}>
          {meta.icon} {meta.label}
        </span>
        <Badge>{EVENT_KIND_LABELS[event.kind]}</Badge>
        {open && <Badge variant="success">Applications open</Badge>}
      </div>

      <h1 className="text-4xl font-black uppercase tracking-wider mt-2">{event.name}</h1>
      <p className="font-bold text-gray-700 mt-1">
        {eventDateLabel(event)}
        {event.location_name && ` · ${event.location_name}`}
      </p>
      {event.tagline && <p className="text-lg text-gray-800 mt-2">{event.tagline}</p>}

      <p className="text-sm text-gray-600 mt-4">{meta.description}</p>

      {event.description && (
        <Card className="mt-6">
          <CardContent className="py-5 whitespace-pre-wrap">{event.description}</CardContent>
        </Card>
      )}

      {modules.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>What this event involves</CardTitle>
          </CardHeader>
          <CardContent className="py-4 flex flex-wrap gap-2">
            {modules.map(m => (
              <span key={m.key} className="px-2 py-1 text-xs font-bold uppercase border-2 border-black bg-yellow-100">
                {m.label}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {event.stage === 'closed' && (
        <Alert variant="info" title="Archived event" className="mt-6">
          This event is closed. Its records are preserved — check your{' '}
          <Link href="/profile" className="underline font-bold">NYC Deli profile</Link> for your participation history.
        </Alert>
      )}

      {event.stage === 'post_event' && person && (
        <FeedbackCard event={event} personId={person.id} />
      )}

      <div className="mt-8">
        {application ? (
          <ApplicationStatusCard application={application} />
        ) : open ? (
          <ApplyCard
            event={event}
            person={person}
            isReturning={Boolean(summary?.isReturning)}
            summary={summary}
            onApplied={load}
          />
        ) : (
          <Card>
            <CardContent className="py-6 text-gray-700">
              Applications are not open for this event.{' '}
              <Link href="/calendar" className="underline font-bold">Watch the camp calendar</Link> for the
              application window.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

/** Stage 8: the event is over but still open for feedback and corrections. */
function FeedbackCard({ event, personId }: { event: EventRow; personId: string }) {
  const [form, setForm] = useState({
    rating: '',
    whatWorked: '',
    whatDidnt: '',
    suggestions: '',
    wouldReturn: '',
    isAnonymous: false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existing, setExisting] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('event_feedback')
      .select('*')
      .eq('event_id', event.id)
      .eq('person_id', personId)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as EventFeedbackRow | null
        setExisting(Boolean(row))
        if (row) {
          setForm({
            rating: row.rating ? String(row.rating) : '',
            whatWorked: row.what_worked ?? '',
            whatDidnt: row.what_didnt ?? '',
            suggestions: row.suggestions ?? '',
            wouldReturn: row.would_return === null ? '' : String(row.would_return),
            isAnonymous: row.is_anonymous,
          })
        }
      })
  }, [event.id, personId])

  if (existing === null) return null

  const submit = async () => {
    setSaving(true)
    setError(null)
    const result = await submitEventFeedbackAction(event.id, {
      rating: form.rating ? Number(form.rating) : null,
      whatWorked: form.whatWorked,
      whatDidnt: form.whatDidnt,
      suggestions: form.suggestions,
      wouldReturn: form.wouldReturn === '' ? null : form.wouldReturn === 'true',
      isAnonymous: form.isAnonymous,
    })
    setSaving(false)
    if (result.success) setSaved(true)
    else setError(result.error)
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>How was it?</CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-4">
        <p className="text-gray-700">
          {existing
            ? 'You already sent feedback — you can update it until the event is closed.'
            : 'The event is wrapping up. Tell us what worked and what didn’t while it’s fresh.'}
        </p>

        {saved && <Alert variant="success">Thanks — feedback saved.</Alert>}
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid md:grid-cols-2 gap-4">
          <Select
            label="Overall"
            value={form.rating}
            onChange={e => setForm({ ...form, rating: e.target.value })}
            options={[
              { value: '', label: 'No rating' },
              { value: '5', label: '5 — best year yet' },
              { value: '4', label: '4 — great' },
              { value: '3', label: '3 — fine' },
              { value: '2', label: '2 — rough' },
              { value: '1', label: '1 — bad' },
            ]}
          />
          <Select
            label="Would you come back?"
            value={form.wouldReturn}
            onChange={e => setForm({ ...form, wouldReturn: e.target.value })}
            options={[
              { value: '', label: 'Not sure' },
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ]}
          />
        </div>

        <Textarea label="What worked" rows={3} value={form.whatWorked} onChange={e => setForm({ ...form, whatWorked: e.target.value })} />
        <Textarea label="What didn’t" rows={3} value={form.whatDidnt} onChange={e => setForm({ ...form, whatDidnt: e.target.value })} />
        <Textarea label="Suggestions for next time" rows={3} value={form.suggestions} onChange={e => setForm({ ...form, suggestions: e.target.value })} />

        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={form.isAnonymous}
            onChange={e => setForm({ ...form, isAnonymous: e.target.checked })}
          />
          Don’t show my name next to this
        </label>

        <Button onClick={submit} loading={saving}>
          {existing ? 'Update Feedback' : 'Send Feedback'}
        </Button>
      </CardContent>
    </Card>
  )
}

function ApplicationStatusCard({ application }: { application: EventApplicationRow }) {
  const labels: Record<string, string> = {
    draft: 'Draft — not yet submitted',
    submitted: 'Submitted — awaiting review',
    under_review: 'Under review',
    waitlisted: 'Waitlisted',
    approved: 'Approved — you’re in',
    denied: 'Not accepted this time',
    withdrawn: 'Withdrawn',
  }
  return (
    <Card variant={application.status === 'approved' ? 'success' : 'default'}>
      <CardHeader>
        <CardTitle>Your Application</CardTitle>
      </CardHeader>
      <CardContent className="py-4">
        <p className="font-bold uppercase tracking-wider">{labels[application.status] ?? application.status}</p>
        {application.decision_note && <p className="text-sm text-gray-700 mt-2">{application.decision_note}</p>}
      </CardContent>
    </Card>
  )
}

function ApplyCard({
  event,
  person,
  isReturning,
  summary,
  onApplied,
}: {
  event: EventRow
  person: PersonRow | null
  isReturning: boolean
  summary: { eventsAttended: number; firstEventYear: number | null; lastEventName: string | null } | null
  onApplied: () => void
}) {
  const fields = applicationFields(event)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Returning members shouldn't retype what NYC Deli already knows.
  useEffect(() => {
    if (!person) return
    const preloaded: Record<string, string> = {}
    for (const field of fields) {
      if (field.prefill) {
        const value = person[field.prefill]
        if (typeof value === 'string') preloaded[field.key] = value
      }
    }
    setValues(v => ({ ...preloaded, ...v }))
    // fields is derived from the event and stable for the life of this card
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person])

  if (!person) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Apply</CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <p className="mb-4">Sign in or create an NYC Deli account to apply. Your account carries across every event.</p>
          <div className="flex gap-3">
            <Link href="/login"><Button>Sign In</Button></Link>
            <Link href="/register"><Button variant="secondary">Create Account</Button></Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const submit = async () => {
    setSaving(true)
    setError(null)
    const result = await applyToEventAction(event.id, values, true)
    setSaving(false)
    if (result.success) onApplied()
    else setError(result.error)
  }

  const missingRequired = fields.some(f => f.required && !values[f.key]?.trim())

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply to {event.name}</CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-4">
        {isReturning && summary && (
          <Alert variant="success" title={`Welcome back, ${person.full_name}`}>
            We already have your details. You&apos;ve been part of {summary.eventsAttended}{' '}
            NYC Deli event{summary.eventsAttended === 1 ? '' : 's'}
            {summary.firstEventYear ? ` since ${summary.firstEventYear}` : ''}
            {summary.lastEventName ? `, most recently ${summary.lastEventName}` : ''}.
          </Alert>
        )}

        <div className="text-sm text-gray-700 border-2 border-black p-3 bg-gray-50">
          Applying as <strong>{person.full_name}</strong> ({person.email}).{' '}
          <Link href="/profile" className="underline font-bold">Update your info</Link>
        </div>

        {fields.map(field => (
          <ApplicationFieldInput
            key={field.key}
            field={field}
            value={values[field.key] ?? ''}
            onChange={v => setValues(prev => ({ ...prev, [field.key]: v }))}
          />
        ))}

        {error && <Alert variant="error">{error}</Alert>}

        <Button onClick={submit} loading={saving} disabled={missingRequired}>
          Submit Application
        </Button>
      </CardContent>
    </Card>
  )
}

function ApplicationFieldInput({
  field,
  value,
  onChange,
}: {
  field: EventApplicationField
  value: string
  onChange: (value: string) => void
}) {
  if (field.type === 'textarea') {
    return (
      <Textarea
        label={field.label}
        helpText={field.help}
        required={field.required}
        rows={4}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    )
  }
  return (
    <Input
      label={field.label}
      helpText={field.help}
      required={field.required}
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}
