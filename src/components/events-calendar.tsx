'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { CampEvent, EventCategory } from '@/types/database'
import { cn } from '@/lib/utils'

const BURN_DATE = new Date(2026, 7, 30) // Aug 30, 2026

const CATEGORY_COLORS: Record<EventCategory, string> = {
  general: 'bg-gray-200 text-gray-800',
  social: 'bg-purple-200 text-purple-800',
  planning: 'bg-blue-200 text-blue-800',
  fundraiser: 'bg-green-200 text-green-800',
  build: 'bg-orange-200 text-orange-800',
  shopping: 'bg-pink-200 text-pink-800',
  other: 'bg-gray-200 text-gray-800',
}

const CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'social', label: 'Social' },
  { value: 'planning', label: 'Planning' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'build', label: 'Build' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'other', label: 'Other' },
]

function formatTime(time: string | null) {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${m} ${ampm}`
}

export function EventsCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CampEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CampEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<{
    title: string
    description: string
    event_date: string
    start_time: string
    end_time: string
    location: string
    category: EventCategory
  }>({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    category: 'general',
  })

  const supabase = createClient()

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('camp_events')
      .select('*')
      .order('event_date', { ascending: true })

    if (!error && data) {
      setEvents(data as CampEvent[])
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const openAddForm = (date: Date) => {
    setEditingEvent(null)
    setFormData({
      title: '',
      description: '',
      event_date: format(date, 'yyyy-MM-dd'),
      start_time: '',
      end_time: '',
      location: '',
      category: 'general',
    })
    setShowForm(true)
  }

  const openEditForm = (event: CampEvent) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      location: event.location || '',
      category: event.category,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.event_date) return
    setSaving(true)

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      event_date: formData.event_date,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      location: formData.location.trim() || null,
      category: formData.category,
    }

    if (editingEvent) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('camp_events') as any).update(payload).eq('id', editingEvent.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('camp_events') as any).insert(payload)
    }

    setShowForm(false)
    setEditingEvent(null)
    setSaving(false)
    fetchEvents()
  }

  const handleDelete = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('camp_events') as any).delete().eq('id', id)
    setShowForm(false)
    setEditingEvent(null)
    fetchEvents()
  }

  // Calendar grid generation
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)

  const days: Date[] = []
  let day = calStart
  while (day <= calEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  const getEventsForDate = (date: Date) =>
    events.filter((e) => isSameDay(parseISO(e.event_date), date))

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="px-4 py-2 border-2 border-black font-bold hover:bg-yellow-400 transition-colors"
        >
          ← Prev
        </button>
        <h2 className="text-2xl font-black uppercase tracking-wider">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="px-4 py-2 border-2 border-black font-bold hover:bg-yellow-400 transition-colors"
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="border-2 border-black">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-black text-yellow-400">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs font-bold uppercase tracking-wider py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const dayEvents = getEventsForDate(d)
            const inMonth = isSameMonth(d, monthStart)
            const selected = selectedDate && isSameDay(d, selectedDate)
            const isBurnDay = isSameDay(d, BURN_DATE)

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  'min-h-[80px] md:min-h-[100px] p-1 border border-gray-200 text-left align-top transition-colors relative',
                  !inMonth && 'bg-gray-50 text-gray-300',
                  inMonth && 'hover:bg-yellow-50',
                  selected && 'bg-yellow-100 ring-2 ring-yellow-400',
                  isToday(d) && 'bg-blue-50',
                  isBurnDay && 'bg-orange-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs font-bold',
                      isToday(d) && 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center',
                      isBurnDay && !isToday(d) && 'bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center'
                    )}
                  >
                    {format(d, 'd')}
                  </span>
                  {isBurnDay && <span className="text-[10px]">🔥</span>}
                </div>
                {dayEvents.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        className={cn(
                          'text-[10px] md:text-xs truncate px-1 rounded font-medium',
                          CATEGORY_COLORS[evt.category]
                        )}
                      >
                        {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-gray-500 px-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {loading && (
        <div className="text-center text-gray-500 text-sm">Loading events...</div>
      )}

      {/* Selected Date Panel */}
      {selectedDate && (
        <div className="border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black uppercase tracking-wider">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            <button
              onClick={() => openAddForm(selectedDate)}
              className="px-4 py-2 bg-yellow-400 border-2 border-black font-bold text-sm uppercase hover:bg-yellow-500 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              + Add Event
            </button>
          </div>

          {selectedDateEvents.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No events scheduled for this date.</p>
          ) : (
            <div className="space-y-3">
              {selectedDateEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start justify-between gap-4 p-3 bg-white border border-gray-200 rounded"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{evt.title}</span>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded font-medium',
                          CATEGORY_COLORS[evt.category]
                        )}
                      >
                        {evt.category}
                      </span>
                    </div>
                    {(evt.start_time || evt.location) && (
                      <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-3">
                        {evt.start_time && (
                          <span>
                            🕐 {formatTime(evt.start_time)}
                            {evt.end_time && ` – ${formatTime(evt.end_time)}`}
                          </span>
                        )}
                        {evt.location && <span>📍 {evt.location}</span>}
                      </div>
                    )}
                    {evt.description && (
                      <p className="text-sm text-gray-600 mt-1">{evt.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => openEditForm(evt)}
                    className="text-xs px-3 py-1 border border-gray-300 hover:bg-gray-100 transition-colors font-medium flex-shrink-0"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-black uppercase tracking-wider mb-4">
              {editingEvent ? 'Edit Event' : 'Add Event'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black text-sm"
                  placeholder="e.g. Camp Planning Meeting"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black text-sm"
                  placeholder="e.g. Zoom, Someone's apartment"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as EventCategory })
                  }
                  className="w-full px-3 py-2 border-2 border-black text-sm"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black text-sm"
                  rows={3}
                  placeholder="Optional details about the event"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div>
                {editingEvent && (
                  <button
                    onClick={() => handleDelete(editingEvent.id)}
                    className="text-xs text-red-600 hover:text-red-800 font-bold uppercase"
                  >
                    Delete Event
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingEvent(null)
                  }}
                  className="px-4 py-2 border-2 border-black text-sm font-bold uppercase hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.title.trim() || !formData.event_date}
                  className="px-4 py-2 bg-yellow-400 border-2 border-black text-sm font-bold uppercase hover:bg-yellow-500 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingEvent ? 'Update' : 'Add Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
