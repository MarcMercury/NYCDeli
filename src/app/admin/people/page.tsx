'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  APPLICATION_STATUS_META,
  PERSON_STATUS_META,
  fetchPeople,
  personDisplayName,
  type PersonWithPipeline,
} from '@/lib/people'
import { fetchEvents } from '@/lib/events'
import { createPersonAction } from '@/app/actions/people'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { EventRow, PersonStatus } from '@/types/database'

/**
 * The historical CRM. Everyone NYC Deli has ever dealt with lives here,
 * independent of any event — closing an event never removes anyone.
 */
export default function AdminPeoplePage() {
  const [people, setPeople] = useState<PersonWithPipeline[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PersonStatus | 'all'>('all')
  const [eventId, setEventId] = useState<string | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    setLoading(true)
    setPeople(await fetchPeople({ search, status, eventId }))
    setLoading(false)
  }, [search, status, eventId])

  useEffect(() => {
    const timer = setTimeout(() => startTransition(() => { load() }), 200)
    return () => clearTimeout(timer)
  }, [load])

  useEffect(() => {
    startTransition(() => {
      fetchEvents().then(setEvents)
    })
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <Link href="/admin" className="text-sm font-bold uppercase tracking-wider underline">← Admin</Link>
          <h1 className="text-4xl font-black uppercase tracking-wider mt-2">People</h1>
          <p className="text-gray-600 mt-1">
            Every member, applicant and alum. Profiles persist across every NYC Deli event.
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Status is read live from the application pipeline —{' '}
            <Link href="/admin/applicants" className="font-bold underline">review the queue →</Link>
          </p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>{showForm ? 'Cancel' : '+ Add Person'}</Button>
      </div>

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

      <div className="flex flex-wrap gap-4 items-end mb-6">
        <div className="flex-1 min-w-[240px]">
          <Input placeholder="Search name, email or playa name…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-52">
          <Select
            value={status}
            onChange={e => setStatus(e.target.value as PersonStatus | 'all')}
            options={[
              { value: 'all', label: 'All Statuses' },
              ...Object.entries(PERSON_STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
            ]}
          />
        </div>
        <div className="w-56">
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
      ) : people.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-600">Nobody matches that.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="py-2 font-black uppercase text-xs">Name</th>
                  <th className="py-2 font-black uppercase text-xs">Email</th>
                  <th className="py-2 font-black uppercase text-xs">Status</th>
                  <th className="py-2 font-black uppercase text-xs">Latest Application</th>
                  <th className="py-2 font-black uppercase text-xs">Account</th>
                </tr>
              </thead>
              <tbody>
                {people.map(person => {
                  const { derivedStatus, latestApplication, accountRole, accountDeniedAt } = person.pipeline
                  const meta = PERSON_STATUS_META[derivedStatus]
                  const appMeta = latestApplication ? APPLICATION_STATUS_META[latestApplication.status] : null
                  return (
                    <tr key={person.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-2">
                        <Link href={`/admin/people/${person.id}`} className="font-bold underline">
                          {personDisplayName(person)}
                        </Link>
                      </td>
                      <td className="py-2 text-gray-700">{person.email}</td>
                      <td className="py-2">
                        <span className={cn('px-2 py-0.5 text-xs font-bold uppercase border border-black', meta.className)}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2">
                        {latestApplication && appMeta ? (
                          <div className="flex items-center gap-2">
                            <Badge variant={appMeta.variant}>{appMeta.label}</Badge>
                            <span className="text-gray-600">{latestApplication.event?.name ?? '—'}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No application</span>
                        )}
                      </td>
                      <td className="py-2 text-gray-600">
                        {!person.user_id && !accountRole
                          ? '—'
                          : accountDeniedAt
                            ? 'Denied'
                            : accountRole === 'pending'
                              ? 'Awaiting approval'
                              : 'Has login'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-gray-600 mt-4">{people.length} shown</p>
    </div>
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
