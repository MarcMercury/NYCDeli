'use client'

import { Suspense, useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ACCESS_META,
  ASSIGNABLE_ROLES,
  directoryCounts,
  fetchDirectory,
  type AccessLevel,
  type DirectoryEntry,
} from '@/lib/directory'
import { APPLICATION_STATUS_META, PERSON_STATUS_META, personDisplayName } from '@/lib/people'
import { fetchEvents } from '@/lib/events'
import { approvePersonAction, denyPersonAction, setAccessRoleAction } from '@/app/actions/directory'
import { createPersonAction } from '@/app/actions/people'
import AddApplicantForm from '@/app/admin/applicants/add-applicant-form'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import type { EventRow, PersonStatus, UserRole } from '@/types/database'

/**
 * The single directory of everyone NYC Deli deals with.
 *
 * Replaces three screens that each had their own idea of who exists: the admin
 * portal's Campers & Users tab, the applicant review queue and the old CRM
 * list. One row per person, carrying their login, their application and their
 * place on the roster — and approving from here creates all three.
 */
export default function AdminPeoplePage() {
  return (
    <Suspense fallback={<p className="max-w-6xl mx-auto px-4 py-10 font-bold uppercase text-gray-500">Loading…</p>}>
      <DirectoryScreen />
    </Suspense>
  )
}

function DirectoryScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [entries, setEntries] = useState<DirectoryEntry[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PersonStatus | 'all'>(
    (searchParams.get('status') as PersonStatus | null) ?? 'all'
  )
  const [access, setAccess] = useState<AccessLevel | 'all'>('all')
  const [eventId, setEventId] = useState<string | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showApplicantForm, setShowApplicantForm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    setEntries(await fetchDirectory({ search, status, access, eventId }))
    setLoading(false)
  }, [search, status, access, eventId])

  useEffect(() => {
    const timer = setTimeout(() => startTransition(() => { load() }), 200)
    return () => clearTimeout(timer)
  }, [load])

  useEffect(() => {
    startTransition(() => {
      fetchEvents().then(setEvents)
    })
  }, [])

  const counts = useMemo(() => directoryCounts(entries), [entries])
  const scopedEvent = events.find(e => e.id === eventId) ?? null

  const run = async (personId: string, fn: () => Promise<{ success: boolean; error?: string }>, text: string) => {
    setBusyId(personId)
    const result = await fn()
    setBusyId(null)
    if (result.success) {
      setMessage({ type: 'success', text })
      load()
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Something went wrong' })
    }
  }

  const approve = async (entry: DirectoryEntry) => {
    setBusyId(entry.person.id)
    const result = await approvePersonAction({
      personId: entry.person.id,
      eventId: eventId === 'all' ? null : eventId,
    })
    setBusyId(null)
    if (!result.success) {
      setMessage({ type: 'error', text: result.error })
      return
    }
    if (result.data?.password) {
      setCredential({ email: result.data.email, password: result.data.password })
      setMessage(null)
    } else {
      setMessage({
        type: 'success',
        text: `${entry.person.full_name} approved — they already had a login.`,
      })
    }
    if (result.data && !result.data.eventName) {
      setMessage({
        type: 'success',
        text: `${entry.person.full_name} now has member access. No event is open, so nothing was added to a roster.`,
      })
    }
    load()
  }

  const setFilterStatus = (next: PersonStatus | 'all') => {
    setStatus(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'all') params.delete('status')
    else params.set('status', next)
    const query = params.toString()
    router.replace(`/admin/people${query ? `?${query}` : ''}`, { scroll: false })
  }

  const exportCsv = () => {
    const header = ['Name', 'Playa Name', 'Email', 'Phone', 'Status', 'Access', 'Application', 'Event', 'Roster']
    const rows = entries.map(e => [
      e.person.full_name,
      e.person.playa_name ?? '',
      e.person.email,
      e.person.phone ?? '',
      e.status,
      e.access,
      e.application?.status ?? '',
      e.application?.event?.name ?? e.participation?.event?.name ?? '',
      e.participation?.status ?? '',
    ])
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `nyc-deli-directory-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <Link href="/admin" className="text-sm font-bold uppercase tracking-wider underline">← Admin</Link>
          <h1 className="text-4xl font-black uppercase tracking-wider mt-2">People &amp; Users</h1>
          <p className="text-gray-600 mt-1 max-w-2xl">
            Everyone NYC Deli has ever dealt with, with their login, their application and their place on the
            roster in one row. Approving here creates the account and adds them to the event.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportCsv} disabled={entries.length === 0}>Export CSV</Button>
          <Button variant="secondary" onClick={() => setShowApplicantForm(true)}>+ Add Applicant</Button>
          <Button onClick={() => setShowForm(v => !v)}>{showForm ? 'Cancel' : '+ Add Person'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <CountTile value={counts.total} label="In directory" onClick={() => setFilterStatus('all')} />
        <CountTile
          value={counts.awaitingDecision}
          label="Awaiting decision"
          highlight={counts.awaitingDecision > 0}
          onClick={() => setFilterStatus('applicant')}
        />
        <CountTile value={counts.noLogin} label="No login yet" />
        <CountTile value={counts.onRoster} label={scopedEvent ? `On ${scopedEvent.name}` : 'On a roster'} />
      </div>

      {credential && <CredentialNotice credential={credential} onDismiss={() => setCredential(null)} />}

      {message && (
        <Alert variant={message.type === 'error' ? 'error' : 'success'} className="mb-4">{message.text}</Alert>
      )}

      {showForm && (
        <NewPersonForm
          onDone={() => {
            setShowForm(false)
            setMessage({ type: 'success', text: 'Person added.' })
            load()
          }}
          onError={text => setMessage({ type: 'error', text })}
        />
      )}

      {showApplicantForm && (
        <AddApplicantForm
          onClose={() => setShowApplicantForm(false)}
          onCreated={text => {
            setShowApplicantForm(false)
            setMessage({ type: 'success', text })
            load()
          }}
        />
      )}

      <div className="flex flex-wrap gap-3 items-end mb-6">
        <div className="flex-1 min-w-[220px]">
          <Input placeholder="Search name, email, phone or playa name…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-44">
          <Select
            value={status}
            onChange={e => setFilterStatus(e.target.value as PersonStatus | 'all')}
            options={[
              { value: 'all', label: 'Any Status' },
              ...Object.entries(PERSON_STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
            ]}
          />
        </div>
        <div className="w-44">
          <Select
            value={access}
            onChange={e => setAccess(e.target.value as AccessLevel | 'all')}
            options={[
              { value: 'all', label: 'Any Access' },
              ...Object.entries(ACCESS_META).map(([value, meta]) => ({ value, label: meta.label })),
            ]}
          />
        </div>
        <div className="w-52">
          <Select
            value={eventId}
            onChange={e => setEventId(e.target.value)}
            options={[
              { value: 'all', label: 'All Events' },
              ...events.map(event => ({ value: event.id, label: event.name })),
            ]}
          />
        </div>
      </div>

      {loading ? (
        <p className="font-bold uppercase tracking-wider text-gray-500">Loading…</p>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-600">Nobody matches that.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="py-2 font-black uppercase text-xs">Person</th>
                  <th className="py-2 font-black uppercase text-xs">Access</th>
                  <th className="py-2 font-black uppercase text-xs">Status</th>
                  <th className="py-2 font-black uppercase text-xs">Application</th>
                  <th className="py-2 font-black uppercase text-xs">Roster</th>
                  <th className="py-2 font-black uppercase text-xs text-right">Review</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <DirectoryRow
                    key={entry.person.id}
                    entry={entry}
                    busy={busyId === entry.person.id}
                    onApprove={() => approve(entry)}
                    onDeny={() =>
                      run(
                        entry.person.id,
                        () =>
                          denyPersonAction({
                            personId: entry.person.id,
                            eventId: eventId === 'all' ? null : eventId,
                          }),
                        `${entry.person.full_name} denied.`
                      )
                    }
                    onRole={role =>
                      run(entry.person.id, () => setAccessRoleAction(entry.person.id, role), 'Access updated.')
                    }
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-gray-600 mt-4">{entries.length} shown</p>
    </div>
  )
}

function DirectoryRow({
  entry,
  busy,
  onApprove,
  onDeny,
  onRole,
}: {
  entry: DirectoryEntry
  busy: boolean
  onApprove: () => void
  onDeny: () => void
  onRole: (role: UserRole) => void
}) {
  const statusMeta = PERSON_STATUS_META[entry.status]
  const accessMeta = ACCESS_META[entry.access]
  const appMeta = entry.application ? APPLICATION_STATUS_META[entry.application.status] : null

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 align-top">
      <td className="py-2 pr-3">
        <Link href={`/admin/people/${entry.person.id}`} className="font-bold underline">
          {personDisplayName(entry.person)}
        </Link>
        <p className="text-gray-500 text-xs">{entry.person.email}</p>
      </td>
      <td className="py-2 pr-3">
        {entry.access === 'none' ? (
          <span className={cn('px-2 py-0.5 text-xs font-bold uppercase border border-black', accessMeta.className)}>
            {accessMeta.label}
          </span>
        ) : (
          <Select
            value={entry.access}
            disabled={busy}
            onChange={e => onRole(e.target.value as UserRole)}
            options={ASSIGNABLE_ROLES.map(role => ({ value: role, label: ACCESS_META[role].label }))}
          />
        )}
        <p className="text-gray-400 text-xs mt-1">
          {entry.account?.last_sign_in_at ? `Last in ${formatDate(entry.account.last_sign_in_at)}` : 'Never signed in'}
        </p>
      </td>
      <td className="py-2 pr-3">
        <span className={cn('px-2 py-0.5 text-xs font-bold uppercase border border-black', statusMeta.className)}>
          {statusMeta.label}
        </span>
      </td>
      <td className="py-2 pr-3">
        {entry.application && appMeta ? (
          <>
            <Badge variant={appMeta.variant}>{appMeta.label}</Badge>
            <p className="text-gray-500 text-xs mt-1">{entry.application.event?.name ?? '—'}</p>
          </>
        ) : (
          <span className="text-gray-400 text-xs">No application</span>
        )}
      </td>
      <td className="py-2 pr-3">
        {entry.participation ? (
          <>
            <Badge variant={entry.participation.status === 'attended' ? 'success' : 'info'}>
              {entry.participation.status}
            </Badge>
            <p className="text-gray-500 text-xs mt-1">{entry.participation.event?.name ?? '—'}</p>
          </>
        ) : entry.camper ? (
          <span className="text-gray-500 text-xs">Camper record only</span>
        ) : (
          <span className="text-gray-400 text-xs">Not on a roster</span>
        )}
      </td>
      <td className="py-2 text-right whitespace-nowrap">
        {entry.awaitingDecision ? (
          <div className="inline-flex gap-1">
            <Button size="sm" loading={busy} onClick={onApprove}>Approve</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={onDeny}>Deny</Button>
          </div>
        ) : (
          <Link href={`/admin/people/${entry.person.id}`} className="text-xs font-bold underline text-gray-500">
            Open
          </Link>
        )}
      </td>
    </tr>
  )
}

function CountTile({
  value,
  label,
  highlight,
  onClick,
}: {
  value: number
  label: string
  highlight?: boolean
  onClick?: () => void
}) {
  return (
    <Card className={cn(highlight && 'border-yellow-500', onClick && 'cursor-pointer hover:border-yellow-500')}>
      <CardContent className="py-3 text-center" onClick={onClick}>
        <p className="text-3xl font-black">{value}</p>
        <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      </CardContent>
    </Card>
  )
}

/** Shown once, straight after a login is created. Nothing stores it afterwards. */
function CredentialNotice({
  credential,
  onDismiss,
}: {
  credential: { email: string; password: string }
  onDismiss: () => void
}) {
  return (
    <Alert variant="success" className="mb-4">
      <p className="font-black uppercase">Account created</p>
      <p className="text-sm mt-1">
        Pass these to {credential.email}. The password is shown once and is not stored anywhere — they are asked
        to change it on first sign-in.
      </p>
      <p className="font-mono text-lg mt-2 select-all">{credential.password}</p>
      <button className="text-sm underline font-bold mt-2" onClick={onDismiss}>Dismiss</button>
    </Alert>
  )
}

function NewPersonForm({ onDone, onError }: { onDone: () => void; onError: (text: string) => void }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', status: 'prospect' as PersonStatus })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    const result = await createPersonAction({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      status: form.status,
    })
    setSaving(false)
    if (result.success) onDone()
    else onError(result.error)
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add Person</CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-4">
        <div className="grid md:grid-cols-4 gap-4">
          <Input label="Full Name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Select
            label="Status"
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value as PersonStatus })}
            options={Object.entries(PERSON_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))}
          />
        </div>
        <Button onClick={submit} loading={saving} disabled={!form.full_name.trim() || !form.email.trim()}>
          Add Person
        </Button>
      </CardContent>
    </Card>
  )
}
