'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { fetchPersonByEmail, fetchPersonHistory, summarizeHistory } from '@/lib/people'
import { eventDateLabel } from '@/lib/events'
import { Badge } from '@/components/ui'
import type { PersonHistory } from '@/types/database'

/**
 * Prior NYC Deli involvement for whoever is being reviewed. An applicant who
 * has camped with us three times should never look like a stranger.
 */
export function PersonHistoryPanel({ email }: { email: string }) {
  const [history, setHistory] = useState<PersonHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  useEffect(() => {
    let active = true
    const load = async () => {
      const person = await fetchPersonByEmail(email)
      const result = person ? await fetchPersonHistory(person.id) : null
      if (!active) return
      setHistory(result)
      setLoading(false)
    }
    startTransition(() => { load() })
    return () => { active = false }
  }, [email])

  if (loading) return null

  if (!history) {
    return (
      <div>
        <h3 className="font-bold uppercase tracking-wider text-sm mb-3 border-b-2 border-black pb-1">
          NYC Deli History
        </h3>
        <p className="text-sm text-gray-600">No prior record — this is a new applicant.</p>
      </div>
    )
  }

  const summary = summarizeHistory(history)

  return (
    <div>
      <h3 className="font-bold uppercase tracking-wider text-sm mb-3 border-b-2 border-black pb-1">
        NYC Deli History
      </h3>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {summary.isReturning ? (
          <Badge variant="success">
            Returning · {summary.eventsAttended} event{summary.eventsAttended === 1 ? '' : 's'}
          </Badge>
        ) : (
          <Badge>First time</Badge>
        )}
        {summary.firstEventYear && <Badge variant="info">Since {summary.firstEventYear}</Badge>}
        <Link href={`/admin/people/${history.person.id}`} className="text-sm font-bold underline">
          Full profile →
        </Link>
      </div>

      <div className="space-y-1 text-sm">
        {history.participations.map(p => (
          <div key={p.id} className="flex justify-between gap-3">
            <span className="font-bold">{p.event?.name ?? 'Event'}</span>
            <span className="text-gray-600">
              {p.event ? eventDateLabel(p.event) : ''} · {p.status}
            </span>
          </div>
        ))}
        {history.applications
          .filter(app => !history.participations.some(p => p.event_id === app.event_id))
          .map(app => (
            <div key={app.id} className="flex justify-between gap-3">
              <span className="font-bold">{app.event?.name ?? 'Event'}</span>
              <span className="text-gray-600">applied · {app.status}</span>
            </div>
          ))}
      </div>

      {history.notes.length > 0 && (
        <div className="mt-3 border-2 border-black bg-yellow-50 p-2">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Admin notes</p>
          {history.notes.slice(0, 3).map(note => (
            <p key={note.id} className="text-sm mt-1 whitespace-pre-wrap">{note.body}</p>
          ))}
        </div>
      )}
    </div>
  )
}
