'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { fetchBuildMeetings, updateBuildMeeting } from '@/lib/build-week'
import type { BuildMeeting } from '@/types/database'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const isExternal = (href: string) => /^https?:\/\//i.test(href)

// ─── Markdown-ish preview renderer (headings, bullets, bold, links) ───

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g)
  return parts.map((p, i) => {
    const key = `${keyPrefix}-${i}`
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={key}>{p.slice(2, -2)}</strong>
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(p)
    if (link) {
      const [, label, href] = link
      const className = 'underline font-bold decoration-yellow-500 hover:bg-yellow-200'
      // Only http(s) and in-app paths become links — blocks javascript:/data: URLs.
      if (isExternal(href)) {
        return (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={className}>
            {label}
          </a>
        )
      }
      if (href.startsWith('/')) {
        return (
          <Link key={key} href={href} className={className}>
            {label}
          </Link>
        )
      }
      return <span key={key}>{label}</span>
    }
    return <span key={key}>{p}</span>
  })
}

function CanvasPreview({ md }: { md: string }) {
  if (!md.trim()) {
    return <p className="text-sm text-gray-400 italic">Nothing written yet.</p>
  }
  const blocks: { type: 'p' | 'ul' | 'h'; level?: number; lines: string[] }[] = []
  let cur: { type: 'p' | 'ul' | 'h'; level?: number; lines: string[] } | null = null
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd()
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({ type: 'h', level: heading[1].length, lines: [heading[2]] })
      cur = null
    } else if (/^[-*]\s+/.test(line)) {
      if (!cur || cur.type !== 'ul') {
        cur = { type: 'ul', lines: [] }
        blocks.push(cur)
      }
      cur.lines.push(line.replace(/^[-*]\s+/, ''))
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
  return (
    <div className="space-y-3 text-sm text-gray-800">
      {blocks.map((b, i) => {
        if (b.type === 'h') {
          const size = b.level === 1 ? 'text-xl' : b.level === 2 ? 'text-lg' : 'text-base'
          return (
            <h3 key={i} className={cn('font-black', size, (b.level ?? 3) <= 2 && 'mt-4')}>
              {renderInline(b.lines[0], `h${i}`)}
            </h3>
          )
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {b.lines.map((l, j) => (
                <li key={j}>{renderInline(l, `u${i}-${j}`)}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="leading-relaxed">
            {b.lines.map((l, j) => (
              <span key={j}>
                {renderInline(l, `p${i}-${j}`)}
                {j < b.lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

// ─── The canvas ───

interface MeetingCanvasProps {
  meetingId: string
  initial: string
  canEdit: boolean
  onSaved: (content: string) => void
}

function MeetingCanvas({ meetingId, initial, canEdit, onSaved }: MeetingCanvasProps) {
  const [value, setValue] = useState(initial)
  const [state, setState] = useState<SaveState>('idle')
  const [preview, setPreview] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef(initial)

  const save = useCallback(
    async (next: string) => {
      if (next === lastSaved.current) return
      setState('saving')
      try {
        await updateBuildMeeting(meetingId, { canvas_md: next })
        lastSaved.current = next
        onSaved(next)
        setSavedAt(new Date())
        setState('saved')
        setTimeout(() => setState(s => (s === 'saved' ? 'idle' : s)), 1500)
      } catch (err) {
        console.error('[meeting-canvas] save failed', err)
        setState('error')
      }
    },
    [meetingId, onSaved]
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

  useEffect(() => {
    return () => {
      if (debRef.current) clearTimeout(debRef.current)
    }
  }, [])

  const words = value.trim() === '' ? 0 : value.trim().split(/\s+/).length

  return (
    <Card className="border-2 border-black">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b-2 border-black bg-yellow-300">
          <span className="text-[10px] font-black uppercase tracking-widest">📝 Meeting Canvas</span>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wide',
                state === 'error' ? 'text-red-700' : state === 'saved' ? 'text-green-800' : 'text-gray-600'
              )}
            >
              {state === 'saving' && 'Saving…'}
              {state === 'error' && 'Save failed'}
              {state === 'saved' && '✓ Saved'}
              {state === 'idle' &&
                (savedAt
                  ? `Saved ${savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                  : `${words} words`)}
            </span>
            <button
              onClick={() => setPreview(p => !p)}
              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border-2 border-black bg-white hover:bg-gray-100"
            >
              {preview ? '✏️ Write' : '👁 Preview'}
            </button>
          </div>
        </div>

        {preview ? (
          <div className="p-4 sm:p-6 min-h-[60vh]">
            <CanvasPreview md={value} />
          </div>
        ) : (
          <textarea
            value={value}
            onChange={e => handleChange(e.target.value)}
            onBlur={handleBlur}
            readOnly={!canEdit}
            spellCheck
            placeholder={
              canEdit
                ? 'Start typing… free-form canvas. Optional formatting: # heading, - bullet, **bold**, [label](/link). Autosaves and is shared with the build team.'
                : 'Read-only — admins and builders can edit this canvas.'
            }
            className={cn(
              'w-full min-h-[65vh] p-4 sm:p-6 text-sm sm:text-[15px] leading-7 font-mono',
              'resize-y focus:outline-none focus:bg-yellow-50/40',
              !canEdit && 'bg-gray-50 text-gray-600'
            )}
          />
        )}
      </CardContent>
    </Card>
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

// ─── Main ───

export default function MeetingAgendasTab() {
  const [meetings, setMeetings] = useState<BuildMeeting[]>([])
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [editingMeetingHeader, setEditingMeetingHeader] = useState(false)

  // Canvas + header writes are RLS-restricted to admin/builder
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
      if (mounted) setCanEdit(profile?.role === 'admin' || profile?.role === 'builder')
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

  const activeMeeting = meetings.find(m => m.id === activeMeetingId) || null

  const handleCanvasSaved = useCallback(
    (content: string) => {
      setMeetings(prev =>
        prev.map(m => (m.id === activeMeetingId ? { ...m, canvas_md: content } : m))
      )
    },
    [activeMeetingId]
  )

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
      {/* ─── Meeting selector ─── */}
      <div className="flex flex-wrap gap-2">
        {meetings.map(m => {
          const isActive = m.id === activeMeetingId
          return (
            <button
              key={m.id}
              onClick={() => {
                setActiveMeetingId(m.id)
                setEditingMeetingHeader(false)
              }}
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
              {editingMeetingHeader ? (
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
                    {canEdit && (
                      <button
                        onClick={() => setEditingMeetingHeader(true)}
                        className="px-2 py-1 text-xs font-bold bg-yellow-300 hover:bg-yellow-400 border-2 border-black shrink-0"
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

          {/* ─── Free-form canvas ─── */}
          <MeetingCanvas
            key={activeMeeting.id}
            meetingId={activeMeeting.id}
            initial={activeMeeting.canvas_md ?? ''}
            canEdit={canEdit}
            onSaved={handleCanvasSaved}
          />
        </>
      )}
    </div>
  )
}
