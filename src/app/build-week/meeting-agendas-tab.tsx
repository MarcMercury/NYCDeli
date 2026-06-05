'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  fetchBuildMeetings,
  fetchBuildMeetingSections,
  fetchBuildMeetingNotes,
  upsertBuildMeetingNote,
  updateBuildMeeting,
  createBuildMeetingSection,
  updateBuildMeetingSection,
  deleteBuildMeetingSection,
  reorderBuildMeetingSections,
} from '@/lib/build-week'
import type {
  BuildMeeting,
  BuildMeetingSection,
  BuildMeetingNote,
  BuildMeetingResourceLink,
  BuildMeetingSectionKind,
} from '@/types/database'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const isExternal = (href: string) => /^https?:\/\//i.test(href)

function ResourceLinks({ links }: { links: BuildMeetingResourceLink[] }) {
  if (!links || links.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {links.map((l, i) => {
        const external = isExternal(l.href)
        const className =
          'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide border-2 border-black bg-yellow-300 hover:bg-yellow-400 transition-colors'
        return external ? (
          <a key={i} href={l.href} target="_blank" rel="noopener noreferrer" className={className}>
            🔗 {l.label}
          </a>
        ) : (
          <Link key={i} href={l.href} className={className}>
            🔗 {l.label}
          </Link>
        )
      })}
    </div>
  )
}

function AgendaBody({ md }: { md: string | null }) {
  if (!md) return null
  const lines = md.split('\n')
  const blocks: { type: 'p' | 'ul'; lines: string[] }[] = []
  let cur: { type: 'p' | 'ul'; lines: string[] } | null = null
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('- ')) {
      if (!cur || cur.type !== 'ul') {
        cur = { type: 'ul', lines: [] }
        blocks.push(cur)
      }
      cur.lines.push(line.slice(2))
    } else if (line.trim() === '') {
      cur = null
    } else {
      if (!cur || cur.type !== 'p') {
        cur = { type: 'p', lines: [] }
        blocks.push(cur)
      }
      cur.lines.push(line)
    }
  }
  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**') ? (
        <strong key={i}>{p.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{p}</span>
      )
    )
  }
  return (
    <div className="space-y-2 text-sm text-gray-800">
      {blocks.map((b, i) =>
        b.type === 'ul' ? (
          <ul key={i} className="list-disc pl-5 space-y-1">
            {b.lines.map((l, j) => (
              <li key={j}>{renderInline(l)}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="leading-relaxed">
            {b.lines.map((l, j) => (
              <span key={j}>
                {renderInline(l)}
                {j < b.lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      )}
    </div>
  )
}

interface NotesEditorProps {
  meetingId: string
  sectionId: string | null
  initial: string
  placeholder?: string
}

function NotesEditor({ meetingId, sectionId, initial, placeholder }: NotesEditorProps) {
  const [value, setValue] = useState(initial)
  const [state, setState] = useState<SaveState>('idle')
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef(initial)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync editor to new section/meeting
    setValue(initial)
    lastSaved.current = initial
    setState('idle')
  }, [initial, meetingId, sectionId])

  const save = useCallback(
    async (next: string) => {
      if (next === lastSaved.current) return
      setState('saving')
      try {
        await upsertBuildMeetingNote({ meeting_id: meetingId, section_id: sectionId, content: next })
        lastSaved.current = next
        setState('saved')
        setTimeout(() => setState(s => (s === 'saved' ? 'idle' : s)), 1500)
      } catch {
        setState('error')
      }
    },
    [meetingId, sectionId]
  )

  const handleChange = (next: string) => {
    setValue(next)
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => save(next), 800)
  }

  const handleBlur = () => {
    if (debRef.current) clearTimeout(debRef.current)
    save(value)
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          {sectionId ? 'Notes' : 'General Meeting Notes'}
        </span>
        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-wide',
            state === 'saving' && 'text-gray-400',
            state === 'saved' && 'text-green-600',
            state === 'error' && 'text-red-600',
            state === 'idle' && 'text-transparent'
          )}
        >
          {state === 'saving' && 'Saving…'}
          {state === 'saved' && '✓ Saved'}
          {state === 'error' && 'Save failed'}
          {state === 'idle' && '·'}
        </span>
      </div>
      <textarea
        value={value}
        onChange={e => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder || 'Type notes here as you walk through this section…'}
        className="w-full min-h-[80px] border-2 border-black px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-y"
      />
    </div>
  )
}

// ─── Admin: Meeting header editor ───

interface MeetingEditFormProps {
  meeting: BuildMeeting
  onSave: (updates: { month_label: string; title: string; subtitle: string; primary_goal: string | null }) => Promise<void>
  onCancel: () => void
}

function MeetingEditForm({ meeting, onSave, onCancel }: MeetingEditFormProps) {
  const [monthLabel, setMonthLabel] = useState(meeting.month_label)
  const [title, setTitle] = useState(meeting.title)
  const [subtitle, setSubtitle] = useState(meeting.subtitle)
  const [primaryGoal, setPrimaryGoal] = useState(meeting.primary_goal ?? '')
  const [saving, setSaving] = useState(false)

  return (
    <div className="space-y-2">
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Month / Label</label>
        <input
          value={monthLabel}
          onChange={e => setMonthLabel(e.target.value)}
          className="w-full border-2 border-black px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border-2 border-black px-3 py-1.5 text-sm font-bold"
        />
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Subtitle</label>
        <input
          value={subtitle}
          onChange={e => setSubtitle(e.target.value)}
          className="w-full border-2 border-black px-3 py-1.5 text-sm italic"
        />
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Primary Goal</label>
        <textarea
          value={primaryGoal}
          onChange={e => setPrimaryGoal(e.target.value)}
          rows={3}
          className="w-full border-2 border-black px-3 py-1.5 text-sm resize-y"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            setSaving(true)
            try {
              await onSave({
                month_label: monthLabel,
                title,
                subtitle,
                primary_goal: primaryGoal.trim() === '' ? null : primaryGoal,
              })
            } finally {
              setSaving(false)
            }
          }}
          disabled={saving}
          className="px-3 py-1 text-xs font-bold bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-3 py-1 text-xs font-bold bg-gray-200 hover:bg-gray-300">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Admin: Resource link list editor ───

interface ResourceLinksEditorProps {
  links: BuildMeetingResourceLink[]
  onChange: (links: BuildMeetingResourceLink[]) => void
}

function ResourceLinksEditor({ links, onChange }: ResourceLinksEditorProps) {
  const update = (i: number, patch: Partial<BuildMeetingResourceLink>) => {
    onChange(links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  const remove = (i: number) => onChange(links.filter((_, idx) => idx !== i))
  const add = () => onChange([...links, { label: '', href: '' }])

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Resource Links</div>
      {links.length === 0 && (
        <p className="text-xs text-gray-400 italic">No links. Click &ldquo;Add link&rdquo; below.</p>
      )}
      {links.map((l, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <input
            value={l.label}
            onChange={e => update(i, { label: e.target.value })}
            placeholder="Label"
            className="flex-1 border border-gray-400 px-2 py-1 text-xs"
          />
          <input
            value={l.href}
            onChange={e => update(i, { href: e.target.value })}
            placeholder="/path or https://…"
            className="flex-[2] border border-gray-400 px-2 py-1 text-xs font-mono"
          />
          <button
            onClick={() => remove(i)}
            className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 border border-red-400"
            title="Remove"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="px-2 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 border border-gray-400"
      >
        + Add link
      </button>
    </div>
  )
}

// ─── Admin: Section editor ───

interface SectionEditFormProps {
  initial: {
    number: number | null
    kind: BuildMeetingSectionKind
    title: string
    body_md: string | null
    resource_links: BuildMeetingResourceLink[]
  }
  onSave: (data: {
    number: number | null
    kind: BuildMeetingSectionKind
    title: string
    body_md: string | null
    resource_links: BuildMeetingResourceLink[]
  }) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

function SectionEditForm({ initial, onSave, onCancel, submitLabel = 'Save' }: SectionEditFormProps) {
  const [number, setNumber] = useState<string>(initial.number == null ? '' : String(initial.number))
  const [kind, setKind] = useState<BuildMeetingSectionKind>(initial.kind)
  const [title, setTitle] = useState(initial.title)
  const [body, setBody] = useState(initial.body_md ?? '')
  const [links, setLinks] = useState<BuildMeetingResourceLink[]>(initial.resource_links)
  const [saving, setSaving] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="w-24">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">#</label>
          <input
            value={number}
            onChange={e => setNumber(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="—"
            className="w-full border-2 border-black px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Kind</label>
          <select
            value={kind}
            onChange={e => setKind(e.target.value as BuildMeetingSectionKind)}
            className="w-full border-2 border-black px-2 py-1.5 text-sm bg-white"
          >
            <option value="section">Section</option>
            <option value="decisions">Decisions block</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border-2 border-black px-3 py-1.5 text-sm font-bold"
        />
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Body (markdown — supports - bullets and **bold**)
        </label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={8}
          className="w-full border-2 border-black px-3 py-1.5 text-sm font-mono resize-y"
        />
      </div>
      <ResourceLinksEditor links={links} onChange={setLinks} />
      <div className="flex gap-2 pt-1">
        <button
          onClick={async () => {
            setSaving(true)
            try {
              await onSave({
                number: number === '' ? null : parseInt(number, 10),
                kind,
                title,
                body_md: body.trim() === '' ? null : body,
                resource_links: links.filter(l => l.label.trim() !== '' || l.href.trim() !== ''),
              })
            } finally {
              setSaving(false)
            }
          }}
          disabled={saving || title.trim() === ''}
          className="px-3 py-1 text-xs font-bold bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button onClick={onCancel} className="px-3 py-1 text-xs font-bold bg-gray-200 hover:bg-gray-300">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main ───

export default function MeetingAgendasTab() {
  const [meetings, setMeetings] = useState<BuildMeeting[]>([])
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)
  const [sections, setSections] = useState<BuildMeetingSection[]>([])
  const [notes, setNotes] = useState<BuildMeetingNote[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMeeting, setLoadingMeeting] = useState(false)

  const [isAdmin, setIsAdmin] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingMeetingHeader, setEditingMeetingHeader] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [addingSection, setAddingSection] = useState(false)

  // Detect admin
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = (await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()) as unknown as { data: { role: string } | null }
      if (mounted) setIsAdmin(profile?.role === 'admin')
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const m = await fetchBuildMeetings()
        if (!mounted) return
        setMeetings(m)
        setActiveMeetingId(m[0]?.id ?? null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const loadMeetingData = useCallback(async (meetingId: string) => {
    setLoadingMeeting(true)
    try {
      const [secs, ns] = await Promise.all([
        fetchBuildMeetingSections(meetingId),
        fetchBuildMeetingNotes(meetingId),
      ])
      setSections(secs)
      setNotes(ns)
    } finally {
      setLoadingMeeting(false)
    }
  }, [])

  useEffect(() => {
    if (!activeMeetingId) return
    loadMeetingData(activeMeetingId)
    setEditingMeetingHeader(false)
    setEditingSectionId(null)
    setAddingSection(false)
  }, [activeMeetingId, loadMeetingData])

  const activeMeeting = meetings.find(m => m.id === activeMeetingId) || null

  const noteFor = (sectionId: string | null) =>
    notes.find(n => (n.section_id ?? null) === sectionId)?.content ?? ''

  // ─── Admin handlers ───

  const handleSaveMeetingHeader = async (updates: {
    month_label: string
    title: string
    subtitle: string
    primary_goal: string | null
  }) => {
    if (!activeMeeting) return
    try {
      await updateBuildMeeting(activeMeeting.id, updates)
    } catch (err) {
      console.error('[meeting-agendas] updateBuildMeeting failed', err)
      alert(`Failed to save meeting header: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
    setMeetings(prev => prev.map(m => (m.id === activeMeeting.id ? { ...m, ...updates } : m)))
    setEditingMeetingHeader(false)
  }

  const handleAddSection = async (data: {
    number: number | null
    kind: BuildMeetingSectionKind
    title: string
    body_md: string | null
    resource_links: BuildMeetingResourceLink[]
  }) => {
    if (!activeMeeting) return
    let created: BuildMeetingSection
    try {
      created = await createBuildMeetingSection({
        meeting_id: activeMeeting.id,
        ...data,
      })
    } catch (err) {
      console.error('[meeting-agendas] createBuildMeetingSection failed', err)
      alert(`Failed to add section: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
    setSections(prev => [...prev, created])
    setAddingSection(false)
  }

  const handleSaveSection = async (
    sectionId: string,
    data: {
      number: number | null
      kind: BuildMeetingSectionKind
      title: string
      body_md: string | null
      resource_links: BuildMeetingResourceLink[]
    }
  ) => {
    try {
      await updateBuildMeetingSection(sectionId, data)
    } catch (err) {
      console.error('[meeting-agendas] updateBuildMeetingSection failed', err)
      alert(`Failed to save section: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }

    // Verify the row was actually mutated server-side (RLS can silently update 0 rows)
    try {
      const fresh = await fetchBuildMeetingSections(activeMeeting!.id)
      const updated = fresh.find(s => s.id === sectionId)
      if (updated) {
        const persisted =
          updated.title === data.title &&
          updated.body_md === data.body_md &&
          updated.number === data.number &&
          updated.kind === data.kind
        if (!persisted) {
          alert(
            'Save did not persist. This usually means you do not have write permission ' +
              '(admin or builder role required). Check your role and try again.'
          )
          setSections(fresh)
          return
        }
      }
      setSections(fresh)
    } catch {
      // If verification fetch fails, fall back to optimistic local update
      setSections(prev => prev.map(s => (s.id === sectionId ? { ...s, ...data } : s)))
    }
    setEditingSectionId(null)
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section? Notes attached to it will also be deleted.')) return
    await deleteBuildMeetingSection(sectionId)
    setSections(prev => prev.filter(s => s.id !== sectionId))
    setNotes(prev => prev.filter(n => n.section_id !== sectionId))
  }

  const moveSection = async (sectionId: string, direction: -1 | 1) => {
    const idx = sections.findIndex(s => s.id === sectionId)
    if (idx < 0) return
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= sections.length) return
    const a = sections[idx]
    const b = sections[swapIdx]
    const newSections = [...sections]
    newSections[idx] = { ...b, sort_order: a.sort_order }
    newSections[swapIdx] = { ...a, sort_order: b.sort_order }
    setSections(newSections)
    try {
      await reorderBuildMeetingSections([
        { id: a.id, sort_order: b.sort_order },
        { id: b.id, sort_order: a.sort_order },
      ])
    } catch {
      // Reload on failure
      if (activeMeetingId) loadMeetingData(activeMeetingId)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading agendas…</div>
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No meetings configured yet. Run migration 055.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ─── Admin edit-mode toggle ─── */}
      {isAdmin && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Admin</span>
          <button
            onClick={() => {
              // If a form is open with possibly-unsaved edits, warn before discarding.
              const hasOpenForm =
                editMode &&
                (editingMeetingHeader || editingSectionId !== null || addingSection)
              if (hasOpenForm) {
                const ok = confirm(
                  'You have an open edit form. Click "Save" inside that form first or your changes will be lost.\n\nDiscard changes and exit edit mode?'
                )
                if (!ok) return
              }
              setEditMode(v => !v)
              setEditingMeetingHeader(false)
              setEditingSectionId(null)
              setAddingSection(false)
            }}
            className={cn(
              'px-3 py-1 text-xs font-bold uppercase tracking-wide border-2 border-black transition-colors',
              editMode ? 'bg-red-400 hover:bg-red-500 text-black' : 'bg-white hover:bg-gray-100'
            )}
          >
            {editMode ? '✓ Editing — Click to Finish' : '✏️ Edit Agenda'}
          </button>
        </div>
      )}

      {/* ─── Meeting selector ─── */}
      <div className="flex flex-wrap gap-2">
        {meetings.map(m => {
          const isActive = m.id === activeMeetingId
          return (
            <button
              key={m.id}
              onClick={() => setActiveMeetingId(m.id)}
              className={cn(
                'px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 border-black transition-colors text-left',
                isActive ? 'bg-yellow-400 text-black' : 'bg-white text-gray-700 hover:bg-gray-100'
              )}
            >
              <div className="text-[10px] text-gray-500">Meeting {m.number}</div>
              <div>{m.month_label}</div>
            </button>
          )
        })}
      </div>

      {!activeMeeting ? null : (
        <>
          {/* ─── Header ─── */}
          <Card>
            <CardContent className="p-4">
              {editMode && editingMeetingHeader ? (
                <MeetingEditForm
                  meeting={activeMeeting}
                  onSave={handleSaveMeetingHeader}
                  onCancel={() => setEditingMeetingHeader(false)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Meeting {activeMeeting.number} — {activeMeeting.month_label}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black mt-1 leading-tight">
                        {activeMeeting.title}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1 italic">{activeMeeting.subtitle}</p>
                    </div>
                    {editMode && (
                      <button
                        onClick={() => setEditingMeetingHeader(true)}
                        className="px-2 py-1 text-xs font-bold bg-yellow-300 hover:bg-yellow-400 border-2 border-black"
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                  {activeMeeting.primary_goal && (
                    <div className="mt-3 border-l-4 border-yellow-400 pl-3 py-1 bg-yellow-50">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Primary Goal
                      </div>
                      <p className="text-sm text-gray-800">{activeMeeting.primary_goal}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {loadingMeeting ? (
            <div className="text-center py-8 text-gray-400">Loading sections…</div>
          ) : (
            <>
              {/* ─── Sections ─── */}
              <div className="space-y-3">
                {sections.map((sec, idx) => {
                  const isEditingThis = editMode && editingSectionId === sec.id
                  return (
                    <Card
                      key={sec.id}
                      className={cn(
                        sec.kind === 'decisions' && 'border-2 border-red-400 bg-red-50'
                      )}
                    >
                      <CardContent className="p-4">
                        {isEditingThis ? (
                          <SectionEditForm
                            initial={{
                              number: sec.number,
                              kind: sec.kind,
                              title: sec.title,
                              body_md: sec.body_md,
                              resource_links: sec.resource_links,
                            }}
                            onSave={data => handleSaveSection(sec.id, data)}
                            onCancel={() => setEditingSectionId(null)}
                          />
                        ) : (
                          <>
                            <div className="flex items-baseline gap-2">
                              {sec.number != null && (
                                <span className="text-2xl font-black text-gray-300 leading-none">
                                  {sec.number}
                                </span>
                              )}
                              <h3 className="text-base sm:text-lg font-bold flex-1">
                                {sec.kind === 'decisions' && '🎯 '}
                                {sec.title}
                              </h3>
                              {editMode && (
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => moveSection(sec.id, -1)}
                                    disabled={idx === 0}
                                    className="px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-400 disabled:opacity-30"
                                    title="Move up"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => moveSection(sec.id, 1)}
                                    disabled={idx === sections.length - 1}
                                    className="px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-400 disabled:opacity-30"
                                    title="Move down"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    onClick={() => setEditingSectionId(sec.id)}
                                    className="px-2 py-0.5 text-xs font-bold bg-yellow-300 hover:bg-yellow-400 border border-black"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSection(sec.id)}
                                    className="px-2 py-0.5 text-xs font-bold bg-red-200 hover:bg-red-300 border border-red-600"
                                    title="Delete"
                                  >
                                    🗑
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="mt-2">
                              <AgendaBody md={sec.body_md} />
                              <ResourceLinks links={sec.resource_links} />
                            </div>
                            <NotesEditor
                              meetingId={activeMeeting.id}
                              sectionId={sec.id}
                              initial={noteFor(sec.id)}
                            />
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* ─── Add Section (admin) ─── */}
              {editMode && (
                <Card className="border-2 border-dashed border-gray-400 bg-gray-50">
                  <CardContent className="p-4">
                    {addingSection ? (
                      <SectionEditForm
                        initial={{
                          number: sections.filter(s => s.kind === 'section').length + 1,
                          kind: 'section',
                          title: '',
                          body_md: '',
                          resource_links: [],
                        }}
                        onSave={handleAddSection}
                        onCancel={() => setAddingSection(false)}
                        submitLabel="Add Section"
                      />
                    ) : (
                      <button
                        onClick={() => setAddingSection(true)}
                        className="w-full py-2 text-sm font-bold uppercase tracking-wide bg-white hover:bg-gray-100 border-2 border-black"
                      >
                        + Add Section
                      </button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ─── General Meeting Notes ─── */}
              <Card className="border-2 border-black bg-gray-50">
                <CardContent className="p-4">
                  <h3 className="text-base font-bold">📝 General Meeting Notes</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Anything that doesn&apos;t fit a specific section — action items, parking-lot
                    issues, side conversations.
                  </p>
                  <NotesEditor
                    meetingId={activeMeeting.id}
                    sectionId={null}
                    initial={noteFor(null)}
                    placeholder="Capture meeting-wide notes here…"
                  />
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
