'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  CALENDAR_CATEGORIES,
  WEEKDAY_LABELS,
  categoryMeta,
  fetchCalendar,
  formatCalendarDate,
  formatCalendarTime,
  groupByMonth,
  isMultiDay,
  itemsForDay,
  monthGrid,
  monthLabel,
  pastItems,
  shiftMonth,
  todayIso,
  upcomingItems,
  type CalendarItem,
} from '@/lib/calendar'
import { fetchEvents } from '@/lib/events'
import { createCalendarItemAction, deleteCalendarItemAction } from '@/app/actions/calendar'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Select, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { EventCategory, EventRow } from '@/types/database'

type View = 'month' | 'list'

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
  const [view, setView] = useState<View>('month')
  const [month, setMonth] = useState(() => todayIso().slice(0, 7))
  const [listRange, setListRange] = useState<'upcoming' | 'past'>('upcoming')
  const [categoryFilter, setCategoryFilter] = useState<'all' | EventCategory>('all')
  const [selected, setSelected] = useState<CalendarItem | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
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

  const filtered = useMemo(
    () => items.filter(item => categoryFilter === 'all' || item.category === categoryFilter),
    [items, categoryFilter]
  )

  const handleDelete = async (item: CalendarItem) => {
    if (item.derived) return
    if (!confirm(`Delete "${item.title}"?`)) return
    const result = await deleteCalendarItemAction(item.id)
    if (result.success) {
      setSelected(null)
      load()
    } else {
      setMessage({ type: 'error', text: result.error })
    }
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

      <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            {(['month', 'list'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-4 py-2 text-sm font-bold uppercase tracking-wider',
                  view === v ? 'bg-black text-yellow-400' : 'bg-white text-black hover:bg-gray-100'
                )}
              >
                {v === 'month' ? '▦ Month' : '☰ List'}
              </button>
            ))}
          </div>
          {view === 'list' && (
            <div className="flex border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              {(['upcoming', 'past'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setListRange(v)}
                  className={cn(
                    'px-4 py-2 text-sm font-bold uppercase tracking-wider',
                    listRange === v ? 'bg-black text-yellow-400' : 'bg-white text-black hover:bg-gray-100'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
          <div className="w-52">
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
      ) : view === 'month' ? (
        <MonthGrid
          month={month}
          items={filtered}
          expandedDay={expandedDay}
          onMonth={setMonth}
          onExpandDay={setExpandedDay}
          onSelect={setSelected}
        />
      ) : (
        <ListView
          items={listRange === 'upcoming' ? upcomingItems(filtered) : pastItems(filtered)}
          emptyText={`Nothing on the calendar ${listRange === 'upcoming' ? 'yet' : 'in the past'}.`}
          onSelect={setSelected}
        />
      )}

      {selected && (
        <ItemDetail
          item={selected}
          canDelete={isAdmin && !selected.derived}
          onClose={() => setSelected(null)}
          onDelete={() => handleDelete(selected)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function MonthGrid({
  month,
  items,
  expandedDay,
  onMonth,
  onExpandDay,
  onSelect,
}: {
  month: string
  items: CalendarItem[]
  expandedDay: string | null
  onMonth: (month: string) => void
  onExpandDay: (day: string | null) => void
  onSelect: (item: CalendarItem) => void
}) {
  const weeks = useMemo(() => monthGrid(month), [month])
  const today = todayIso()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => onMonth(shiftMonth(month, -1))}>←</Button>
          <h2 className="text-xl font-black uppercase tracking-wider min-w-[12rem] text-center">
            {monthLabel(month)}
          </h2>
          <Button size="sm" variant="secondary" onClick={() => onMonth(shiftMonth(month, 1))}>→</Button>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onMonth(today.slice(0, 7))}>Today</Button>
      </div>

      <div className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 bg-black text-yellow-400">
            {WEEKDAY_LABELS.map(day => (
              <div key={day} className="px-2 py-1 text-xs font-black uppercase tracking-wider text-center">
                {day}
              </div>
            ))}
          </div>

          {weeks.map((week, i) => (
            <div key={i} className="grid grid-cols-7 border-t-2 border-black">
              {week.map(day => {
                const dayItems = itemsForDay(items, day)
                const inMonth = day.slice(0, 7) === month
                const expanded = expandedDay === day
                const shown = expanded ? dayItems : dayItems.slice(0, 3)
                return (
                  <div
                    key={day}
                    className={cn(
                      'min-h-[7rem] border-r border-gray-300 last:border-r-0 p-1 align-top',
                      !inMonth && 'bg-gray-100',
                      day === today && 'bg-yellow-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'text-xs font-black',
                          inMonth ? 'text-black' : 'text-gray-400',
                          day === today && 'bg-black text-yellow-400 px-1.5 py-0.5'
                        )}
                      >
                        {Number(day.slice(8, 10))}
                      </span>
                      {dayItems.length > 0 && (
                        <span className="text-[10px] font-bold text-gray-500">{dayItems.length}</span>
                      )}
                    </div>

                    <div className="mt-1 space-y-1">
                      {shown.map(item => (
                        <DayChip key={item.id + day} item={item} day={day} onSelect={onSelect} />
                      ))}
                      {dayItems.length > shown.length && (
                        <button
                          onClick={() => onExpandDay(day)}
                          className="w-full text-left text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:text-black"
                        >
                          +{dayItems.length - shown.length} more
                        </button>
                      )}
                      {expanded && (
                        <button
                          onClick={() => onExpandDay(null)}
                          className="w-full text-left text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:text-black"
                        >
                          Show less
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-2">Click anything on the grid for the full details.</p>
    </div>
  )
}

function DayChip({
  item,
  day,
  onSelect,
}: {
  item: CalendarItem
  day: string
  onSelect: (item: CalendarItem) => void
}) {
  const meta = categoryMeta(item.category)
  const time = formatCalendarTime(item)
  const spans = isMultiDay(item)
  const continues = spans && day !== item.date

  return (
    <button
      onClick={() => onSelect(item)}
      title={`${item.title}${time ? ` · ${time}` : ''}`}
      className={cn(
        'w-full text-left px-1 py-0.5 border border-black text-[11px] leading-tight truncate hover:brightness-95',
        meta.className
      )}
    >
      <span className="mr-1" aria-hidden>{continues ? '↳' : meta.icon}</span>
      {time && <span className="font-bold mr-1">{time}</span>}
      {item.title}
    </button>
  )
}

function ListView({
  items,
  emptyText,
  onSelect,
}: {
  items: CalendarItem[]
  emptyText: string
  onSelect: (item: CalendarItem) => void
}) {
  const months = groupByMonth(items)
  if (months.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-600">{emptyText}</CardContent>
      </Card>
    )
  }

  return (
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
                <button key={item.id} onClick={() => onSelect(item)} className="block w-full text-left">
                  <Card className="p-4 hover:border-yellow-500 transition-colors">
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
                  </Card>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function ItemDetail({
  item,
  canDelete,
  onClose,
  onDelete,
}: {
  item: CalendarItem
  canDelete: boolean
  onClose: () => void
  onDelete: () => void
}) {
  const meta = categoryMeta(item.category)
  const time = formatCalendarTime(item)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start md:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] my-8"
      >
        <div className="flex items-start justify-between gap-3 border-b-4 border-black p-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('px-2 py-0.5 text-xs font-bold uppercase border border-black', meta.className)}>
                {meta.icon} {meta.label}
              </span>
              {item.derived && <Badge variant="info">From event</Badge>}
              {!item.isPublic && <Badge>Members only</Badge>}
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wide mt-2">{item.title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-xl font-black px-2 border-2 border-black bg-white hover:bg-black hover:text-yellow-400"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          <DetailRow label="When">
            {formatCalendarDate(item)}
            {time && ` · ${time}`}
          </DetailRow>
          {item.location && <DetailRow label="Where">{item.location}</DetailRow>}
          {item.description && (
            <DetailRow label="Details">
              <span className="whitespace-pre-wrap">{item.description}</span>
            </DetailRow>
          )}
          {isMultiDay(item) && (
            <DetailRow label="Runs">
              {item.date} → {item.endDate}
            </DetailRow>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            {item.eventSlug && (
              <Link href={`/events/${item.eventSlug}`}>
                <Button size="sm">Open event page</Button>
              </Link>
            )}
            {item.linkUrl && !item.eventSlug && (
              <a href={item.linkUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="secondary">Open link</Button>
              </a>
            )}
            {canDelete && (
              <Button size="sm" variant="danger" onClick={onDelete}>Delete item</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-gray-500">{label}</p>
      <p className="font-bold text-gray-900">{children}</p>
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
