'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  CALENDAR_CATEGORIES,
  categoryMeta,
  fetchCalendar,
  formatCalendarDate,
  formatCalendarTime,
  groupByMonth,
  pastItems,
  upcomingItems,
  type CalendarItem,
} from '@/lib/calendar'
import { fetchEvents } from '@/lib/events'
import { createCalendarItemAction, deleteCalendarItemAction } from '@/app/actions/calendar'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Select, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { EventCategory, EventRow } from '@/types/database'

/**
 * The NYC Deli Rats camp calendar — everything the camp is doing, across every
 * event: meetings, deadlines, socials, build dates, application windows.
 *
 * Lives as a component because it is shown inside the Events page rather than
 * on a nav item of its own.
 */
export function CampCalendar() {
  const [items, setItems] = useState<CalendarItem[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming')
  const [categoryFilter, setCategoryFilter] = useState<'all' | EventCategory>('all')
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    const [calendarItems, eventRows] = await Promise.all([fetchCalendar(), fetchEvents()])
    setItems(calendarItems)
    setEvents(eventRows)
    setLoading(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return
      const { data } = await supabase.from('user_profiles').select('role').eq('id', session.user.id).single()
      setIsAdmin((data as { role: string } | null)?.role === 'admin')
    })
    startTransition(() => { load() })
  }, [load])

  const visible = (view === 'upcoming' ? upcomingItems(items) : pastItems(items)).filter(
    item => categoryFilter === 'all' || item.category === categoryFilter
  )
  const months = groupByMonth(visible)

  const handleDelete = async (item: CalendarItem) => {
    if (item.derived) return
    if (!confirm(`Delete "${item.title}"?`)) return
    const result = await deleteCalendarItemAction(item.id)
    if (result.success) load()
    else setMessage({ type: 'error', text: result.error })
  }

  return (
    <div>
      {message && (
        <Alert variant={message.type === 'error' ? 'error' : 'success'} className="mb-4">
          {message.text}
        </Alert>
      )}

      {isAdmin && showForm && (
        <CalendarItemForm
          events={events}
          onDone={() => {
            setShowForm(false)
            setMessage({ type: 'success', text: 'Calendar item added.' })
            load()
          }}
          onError={text => setMessage({ type: 'error', text })}
        />
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            {(['upcoming', 'past'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-4 py-2 text-sm font-bold uppercase tracking-wider',
                  view === v ? 'bg-black text-yellow-400' : 'bg-white text-black hover:bg-gray-100'
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="w-56">
            <Select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as 'all' | EventCategory)}
              options={[
                { value: 'all', label: 'All Categories' },
                ...CALENDAR_CATEGORIES.map(c => ({ value: c.value, label: c.label })),
              ]}
            />
          </div>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowForm(v => !v)}>{showForm ? 'Cancel' : '+ Add Item'}</Button>
        )}
      </div>

      {loading ? (
        <p className="font-bold uppercase tracking-wider text-gray-500">Loading…</p>
      ) : months.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-600">
            Nothing on the calendar {view === 'upcoming' ? 'yet' : 'in the past'}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {months.map(month => (
            <section key={month.key}>
              <h2 className="text-lg font-black uppercase tracking-wider border-b-2 border-black pb-1 mb-3">
                {month.label}
              </h2>
              <div className="space-y-3">
                {month.items.map(item => {
                  const meta = categoryMeta(item.category)
                  const time = formatCalendarTime(item)
                  return (
                    <Card key={item.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('px-2 py-0.5 text-xs font-bold uppercase border border-black', meta.className)}>
                              {meta.icon} {meta.label}
                            </span>
                            {item.derived && <Badge variant="info">From event</Badge>}
                            {!item.isPublic && <Badge>Members only</Badge>}
                          </div>
                          <h3 className="font-black text-lg mt-1">{item.title}</h3>
                          <p className="text-sm font-bold text-gray-700">
                            {formatCalendarDate(item)}
                            {time && ` · ${time}`}
                            {item.location && ` · ${item.location}`}
                          </p>
                          {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.eventSlug && (
                            <Link href={`/events/${item.eventSlug}`} className="text-sm font-bold underline">
                              View event
                            </Link>
                          )}
                          {isAdmin && !item.derived && (
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(item)}>
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function CalendarItemForm({
  events,
  onDone,
  onError,
}: {
  events: EventRow[]
  onDone: () => void
  onError: (text: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: '',
    end_date: '',
    start_time: '',
    location: '',
    category: 'meeting' as EventCategory,
    event_id: '',
    is_public: false,
  })

  const submit = async () => {
    setSaving(true)
    const result = await createCalendarItemAction({
      title: form.title,
      description: form.description || null,
      event_date: form.event_date,
      end_date: form.end_date || null,
      start_time: form.start_time || null,
      location: form.location || null,
      category: form.category,
      event_id: form.event_id || null,
      is_public: form.is_public,
      all_day: !form.start_time,
    })
    setSaving(false)
    if (result.success) onDone()
    else onError(result.error)
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>New Calendar Item</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        <Input label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
        <div className="grid md:grid-cols-3 gap-4">
          <Input label="Date" type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required />
          <Input label="End Date" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
          <Input label="Start Time" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Select
            label="Category"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value as EventCategory })}
            options={CALENDAR_CATEGORIES.map(c => ({ value: c.value, label: c.label }))}
          />
          <Input label="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          <Select
            label="Related Event"
            value={form.event_id}
            onChange={e => setForm({ ...form, event_id: e.target.value })}
            options={[{ value: '', label: 'Camp-wide (no event)' }, ...events.map(e => ({ value: e.id, label: e.name }))]}
          />
        </div>
        <Textarea label="Description" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <Checkbox
          label="Show on the public site"
          checked={form.is_public}
          onChange={e => setForm({ ...form, is_public: e.target.checked })}
        />
        <Button onClick={submit} loading={saving} disabled={!form.title || !form.event_date}>
          Add to Calendar
        </Button>
      </CardContent>
    </Card>
  )
}
