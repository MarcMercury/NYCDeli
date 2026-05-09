'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  fetchBuildMeetings,
  fetchBuildMeetingSections,
  fetchBuildMeetingNotes,
  upsertBuildMeetingNote,
} from '@/lib/build-week'
import type {
  BuildMeeting,
  BuildMeetingSection,
  BuildMeetingNote,
  BuildMeetingResourceLink,
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

/** Render simple markdown-ish bullets/bold. Keeps deps minimal. */
function AgendaBody({ md }: { md: string | null }) {
  if (!md) return null
  const lines = md.split('\n')
  // Group into either paragraphs or bullet groups
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
    // **bold** → <strong>
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

  // If the upstream prop changes (e.g. on meeting switch) reset
  useEffect(() => {
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

export default function MeetingAgendasTab() {
  const [meetings, setMeetings] = useState<BuildMeeting[]>([])
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)
  const [sections, setSections] = useState<BuildMeetingSection[]>([])
  const [notes, setNotes] = useState<BuildMeetingNote[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMeeting, setLoadingMeeting] = useState(false)

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

  useEffect(() => {
    if (!activeMeetingId) return
    let mounted = true
    setLoadingMeeting(true)
    ;(async () => {
      try {
        const [secs, ns] = await Promise.all([
          fetchBuildMeetingSections(activeMeetingId),
          fetchBuildMeetingNotes(activeMeetingId),
        ])
        if (!mounted) return
        setSections(secs)
        setNotes(ns)
      } finally {
        if (mounted) setLoadingMeeting(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [activeMeetingId])

  const activeMeeting = meetings.find(m => m.id === activeMeetingId) || null

  const noteFor = (sectionId: string | null) =>
    notes.find(n => (n.section_id ?? null) === sectionId)?.content ?? ''

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
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Meeting {activeMeeting.number} — {activeMeeting.month_label}
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-1 leading-tight">
                {activeMeeting.title}
              </h2>
              <p className="text-sm text-gray-600 mt-1 italic">{activeMeeting.subtitle}</p>
              {activeMeeting.primary_goal && (
                <div className="mt-3 border-l-4 border-yellow-400 pl-3 py-1 bg-yellow-50">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Primary Goal
                  </div>
                  <p className="text-sm text-gray-800">{activeMeeting.primary_goal}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {loadingMeeting ? (
            <div className="text-center py-8 text-gray-400">Loading sections…</div>
          ) : (
            <>
              {/* ─── Sections ─── */}
              <div className="space-y-3">
                {sections.map(sec => (
                  <Card
                    key={sec.id}
                    className={cn(
                      sec.kind === 'decisions' && 'border-2 border-red-400 bg-red-50'
                    )}
                  >
                    <CardContent className="p-4">
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
                    </CardContent>
                  </Card>
                ))}
              </div>

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
