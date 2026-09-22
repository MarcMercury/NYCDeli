'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { eventDateLabel, stageMeta } from '@/lib/events'
import { PERSON_STATUS_META, fetchPersonHistory, personDisplayName, summarizeHistory } from '@/lib/people'
import { ACCESS_META, ASSIGNABLE_ROLES, fetchDirectoryEntry, type DirectoryEntry } from '@/lib/directory'
import {
  addPersonNoteAction,
  deletePersonNoteAction,
  setPersonStatusAction,
  updatePersonAction,
} from '@/app/actions/people'
import {
  approvePersonAction,
  denyPersonAction,
  resetPersonPasswordAction,
  setAccessRoleAction,
} from '@/app/actions/directory'
import { updateCamperAction } from '@/app/actions/admin'
import { CamperRecordForm } from '@/components/admin/camper-record-form'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import type { CamperUpdate, PersonHistory, PersonStatus, PersonUpdate, UserRole } from '@/types/database'

/**
 * One person's whole record: who they are, what they can reach, everything they
 * applied to, everything they attended, their camper data for each event, and
 * the admin notes behind it.
 */
export default function AdminPersonPage() {
  const { id } = useParams<{ id: string }>()
  const [history, setHistory] = useState<PersonHistory | null>(null)
  const [entry, setEntry] = useState<DirectoryEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [credential, setCredential] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    const [nextHistory, nextEntry] = await Promise.all([fetchPersonHistory(id), fetchDirectoryEntry(id)])
    setHistory(nextHistory)
    setEntry(nextEntry)
    setLoading(false)
  }, [id])

  useEffect(() => {
    startTransition(() => { load() })
  }, [load])

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, text?: string) => {
    const result = await fn()
    if (result.success) {
      if (text) setMessage({ type: 'success', text })
      load()
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Something went wrong' })
    }
  }

  if (loading) {
    return <p className="max-w-4xl mx-auto px-4 py-10 font-bold uppercase tracking-wider text-gray-500">Loading…</p>
  }
  if (!history) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black uppercase">Person not found</h1>
        <Link href="/admin/people" className="underline font-bold">Back to people</Link>
      </div>
    )
  }

  const { person, applications, participations, notes } = history
  const summary = summarizeHistory(history)
  const statusMeta = PERSON_STATUS_META[entry?.status ?? person.status]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/admin/people" className="text-sm font-bold uppercase tracking-wider underline">← People &amp; Users</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-wider">{personDisplayName(person)}</h1>
          <p className="text-gray-600">{person.email}{person.phone && ` · ${person.phone}`}</p>
        </div>
        <div className="w-52">
          <Select
            label="Status"
            value={person.status}
            onChange={e => run(() => setPersonStatusAction(person.id, e.target.value as PersonStatus), 'Status updated.')}
            options={Object.entries(PERSON_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))}
          />
        </div>
      </div>

      {message && <Alert variant={message.type === 'error' ? 'error' : 'success'}>{message.text}</Alert>}
      {credential && (
        <Alert variant="success">
          <p className="font-black uppercase">New password</p>
          <p className="text-sm mt-1">
            Shown once and stored nowhere. {person.full_name} will be asked to change it on next sign-in.
          </p>
          <p className="font-mono text-lg mt-2 select-all">{credential}</p>
          <button className="text-sm underline font-bold mt-2" onClick={() => setCredential(null)}>Dismiss</button>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Events attended" value={String(summary.eventsAttended)} />
        <Stat label="Applications" value={String(summary.eventsApplied)} />
        <Stat label="First event" value={summary.firstEventYear ? String(summary.firstEventYear) : '—'} />
        <Stat label="Access" value={ACCESS_META[entry?.access ?? 'none'].label} />
      </div>

      {entry && (
        <AccessCard
          entry={entry}
          onApprove={async () => {
            const result = await approvePersonAction({ personId: person.id })
            if (!result.success) {
              setMessage({ type: 'error', text: result.error })
              return
            }
            if (result.data?.password) setCredential(result.data.password)
            else setMessage({ type: 'success', text: 'Approved — they already had a login.' })
            load()
          }}
          onDeny={() => run(() => denyPersonAction({ personId: person.id }), 'Denied.')}
          onRole={role => run(() => setAccessRoleAction(person.id, role), 'Access updated.')}
          onResetPassword={async () => {
            const result = await resetPersonPasswordAction(person.id)
            if (result.success) setCredential(result.data?.password ?? null)
            else setMessage({ type: 'error', text: result.error })
          }}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Participation</CardTitle>
        </CardHeader>
        <CardContent className="py-4 space-y-3">
          {participations.length === 0 ? (
            <p className="text-gray-600">No events attended yet.</p>
          ) : (
            participations.map(p => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
                <div>
                  <p className="font-black uppercase">{p.event?.name ?? 'Event'}</p>
                  <p className="text-sm text-gray-600">
                    {p.event ? eventDateLabel(p.event) : ''} · {p.role}
                    {p.event && ` · ${stageMeta(p.event.stage).label}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === 'attended' ? 'success' : 'info'}>{p.status}</Badge>
                  {p.event && (
                    <Link href={`/admin/events/${p.event.id}`} className="text-sm font-bold underline">Event</Link>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent className="py-4 space-y-4">
          {applications.length === 0 ? (
            <p className="text-gray-600">No applications on record.</p>
          ) : (
            applications.map(app => (
              <div key={app.id} className="border-b border-gray-200 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black uppercase">{app.event?.name ?? 'Event'}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={app.status === 'approved' ? 'success' : app.status === 'denied' ? 'error' : 'info'}>
                      {app.status}
                    </Badge>
                    {app.event && (
                      <Link
                        href={`/admin/events/${app.event.id}?tab=applications`}
                        className="text-sm font-bold underline"
                      >
                        Review
                      </Link>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Applied {app.submitted_at?.slice(0, 10) ?? app.created_at.slice(0, 10)}
                  {app.source !== 'web' && ` · ${app.source}`}
                </p>
                {app.decision_note && <p className="text-sm text-gray-700 mt-1">{app.decision_note}</p>}
                <ResponseList responses={app.responses} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <PersonDetailsForm
        person={person}
        onSave={patch => run(() => updatePersonAction(person.id, patch), 'Saved.')}
      />

      {entry && entry.campers.length > 0 && (
        <CamperRecords
          entry={entry}
          onSave={async (camperId, patch) => {
            await run(() => updateCamperAction(camperId, patch), 'Camper record saved.')
          }}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Admin Notes</CardTitle>
        </CardHeader>
        <CardContent className="py-4 space-y-4">
          <p className="text-sm text-gray-600">Internal only — never visible to the person.</p>
          <Textarea rows={3} value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Add a note…" />
          <Button
            size="sm"
            disabled={!noteDraft.trim()}
            onClick={() =>
              run(async () => {
                const result = await addPersonNoteAction(person.id, noteDraft)
                if (result.success) setNoteDraft('')
                return result
              }, 'Note added.')
            }
          >
            Add Note
          </Button>

          <div className="space-y-2">
            {notes.map(note => (
              <div key={note.id} className={cn('border-2 border-black p-3', note.is_pinned && 'bg-yellow-50')}>
                <div className="flex justify-between gap-2">
                  <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm('Delete this note?')) run(() => deletePersonNoteAction(note.id), 'Note deleted.')
                    }}
                  >
                    ✕
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">{note.created_at.slice(0, 10)}</p>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <span className={cn('px-2 py-0.5 text-xs font-bold uppercase border border-black', statusMeta.className)}>
              {statusMeta.label}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="text-center py-3">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wider text-gray-600">{label}</p>
    </Card>
  )
}

/**
 * What this person can reach, and the one button that turns an applicant into a
 * member: login, role, camper record and roster entry in a single step.
 */
function AccessCard({
  entry,
  onApprove,
  onDeny,
  onRole,
  onResetPassword,
}: {
  entry: DirectoryEntry
  onApprove: () => void
  onDeny: () => void
  onRole: (role: UserRole) => void
  onResetPassword: () => void
}) {
  const [busy, setBusy] = useState(false)
  const meta = ACCESS_META[entry.access]

  const wrap = (fn: () => void | Promise<void>) => async () => {
    setBusy(true)
    await fn()
    setBusy(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access &amp; Account</CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            {entry.access === 'none' ? (
              <>
                <p className="text-xs font-bold uppercase text-gray-500">Access</p>
                <span className={cn('inline-block mt-1 px-2 py-0.5 text-xs font-bold uppercase border border-black', meta.className)}>
                  {meta.label}
                </span>
              </>
            ) : (
              <Select
                label="Access"
                value={entry.access}
                disabled={busy}
                onChange={e => onRole(e.target.value as UserRole)}
                options={ASSIGNABLE_ROLES.map(role => ({ value: role, label: ACCESS_META[role].label }))}
              />
            )}
            <p className="text-xs text-gray-500 mt-1">{meta.hint}</p>
          </div>
          <div className="text-sm text-gray-600 space-y-1 md:pt-6">
            <p>{entry.account?.last_sign_in_at ? `Last signed in ${formatDate(entry.account.last_sign_in_at)}` : 'Never signed in'}</p>
            {entry.account?.approved_at && <p>Approved {formatDate(entry.account.approved_at)}</p>}
            {entry.account?.denied_at && (
              <p className="text-red-700">Denied {formatDate(entry.account.denied_at)} — {entry.account.denied_reason}</p>
            )}
          </div>
          <div className="flex flex-wrap items-start gap-2 md:pt-6">
            {entry.awaitingDecision && (
              <>
                <Button size="sm" loading={busy} onClick={wrap(onApprove)}>Approve</Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={wrap(onDeny)}>Deny</Button>
              </>
            )}
            {entry.access !== 'none' && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={wrap(onResetPassword)}>
                Reset Password
              </Button>
            )}
          </div>
        </div>

        {entry.access === 'none' && (
          <Alert variant="warning">
            No login exists yet. Approving creates the account, generates a password, adds a camper record for the
            current event and puts them on the roster.
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

/** The operational camper record, one per event this person took part in. */
function CamperRecords({
  entry,
  onSave,
}: {
  entry: DirectoryEntry
  onSave: (camperId: string, patch: CamperUpdate) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState(entry.campers[0]?.id ?? '')
  const camper = entry.campers.find(c => c.id === selectedId) ?? entry.campers[0]
  if (!camper) return null

  const eventName = (eventId: string | null) =>
    entry.participations.find(p => p.event_id === eventId)?.event?.name ??
    entry.applications.find(a => a.event_id === eventId)?.event?.name ??
    'No event'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-black uppercase tracking-wider">Camper Record</h2>
        {entry.campers.length > 1 && (
          <div className="w-64">
            <Select
              label="Event"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              options={entry.campers.map(c => ({ value: c.id, label: eventName(c.event_id) }))}
            />
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600">
        {eventName(camper.event_id)} — this is what the layout, kitchen and packing tools read.
      </p>
      <CamperRecordForm camper={camper} onSave={patch => onSave(camper.id, patch)} />
    </div>
  )
}

function ResponseList({ responses }: { responses: Record<string, unknown> }) {
  const entries = Object.entries(responses ?? {}).filter(([, v]) => v !== null && v !== '' && v !== false)
  if (entries.length === 0) return null
  return (
    <details className="mt-2">
      <summary className="text-sm font-bold uppercase tracking-wider cursor-pointer">Application answers</summary>
      <dl className="mt-2 space-y-1 text-sm">
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt className="font-bold uppercase text-xs text-gray-500">{key.replace(/_/g, ' ')}</dt>
            <dd className="text-gray-800">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

function PersonDetailsForm({
  person,
  onSave,
}: {
  person: PersonHistory['person']
  onSave: (patch: PersonUpdate) => void
}) {
  const [form, setForm] = useState({
    full_name: person.full_name,
    playa_name: person.playa_name ?? '',
    email: person.email,
    phone: person.phone ?? '',
    city: person.city ?? '',
    emergency_contact_name: person.emergency_contact_name ?? '',
    emergency_contact_number: person.emergency_contact_number ?? '',
    dietary_restrictions: person.dietary_restrictions ?? '',
    allergies: person.allergies ?? '',
    medical_notes: person.medical_notes ?? '',
    admin_notes: person.admin_notes ?? '',
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact & Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Full Name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          <Input label="Playa Name" value={form.playa_name} onChange={e => setForm({ ...form, playa_name: e.target.value })} />
          <Input label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Emergency Contact" value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} />
          <Input label="Emergency Number" value={form.emergency_contact_number} onChange={e => setForm({ ...form, emergency_contact_number: e.target.value })} />
          <Input label="Dietary Restrictions" value={form.dietary_restrictions} onChange={e => setForm({ ...form, dietary_restrictions: e.target.value })} />
          <Input label="Allergies" value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} />
        </div>
        <Textarea label="Medical Notes" rows={2} value={form.medical_notes} onChange={e => setForm({ ...form, medical_notes: e.target.value })} />
        <Button
          onClick={() =>
            onSave({
              full_name: form.full_name.trim(),
              playa_name: form.playa_name || null,
              email: form.email.trim(),
              phone: form.phone || null,
              city: form.city || null,
              emergency_contact_name: form.emergency_contact_name || null,
              emergency_contact_number: form.emergency_contact_number || null,
              dietary_restrictions: form.dietary_restrictions || null,
              allergies: form.allergies || null,
              medical_notes: form.medical_notes || null,
            })
          }
        >
          Save
        </Button>
      </CardContent>
    </Card>
  )
}
