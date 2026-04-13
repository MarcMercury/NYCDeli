'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { markIdeaReadAction } from '@/app/actions/ideas'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Alert, Button, Select,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import type { DeliIdeaRow } from '@/types/database'

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'food', label: 'Food & Kitchen' },
  { value: 'build', label: 'Build & Infrastructure' },
  { value: 'events', label: 'Events & Activities' },
  { value: 'art', label: 'Art & Decor' },
  { value: 'logistics', label: 'Logistics & Ops' },
  { value: 'vibes', label: 'Vibes & Culture' },
  { value: 'other', label: 'Other' },
]

type ReadFilter = 'all' | 'unread' | 'read'

export default function AdminIdeasPage() {
  const [ideas, setIdeas] = useState<DeliIdeaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const fetchIdeas = useCallback(async () => {
    const supabase = createClient()

    let query = supabase
      .from('deli_ideas')
      .select('*')
      .order('created_at', { ascending: false })

    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter)
    }

    if (readFilter === 'unread') {
      query = query.eq('is_read', false)
    } else if (readFilter === 'read') {
      query = query.eq('is_read', true)
    }

    const { data, error } = await query as unknown as { data: DeliIdeaRow[] | null; error: Error | null }

    if (error) {
      setMessage({ type: 'error', text: error.message })
    }

    setIdeas(data || [])
    setLoading(false)
  }, [categoryFilter, readFilter])

  useEffect(() => {
    startTransition(() => { fetchIdeas() })
  }, [fetchIdeas])

  const toggleRead = async (idea: DeliIdeaRow) => {
    const result = await markIdeaReadAction(idea.id, !idea.is_read)
    if (result.success) {
      fetchIdeas()
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update' })
    }
  }

  const getCategoryLabel = (value: string) =>
    CATEGORIES.find(c => c.value === value)?.label || value

  const getCategoryColor = (value: string) => {
    const colors: Record<string, string> = {
      general: 'bg-gray-100 text-gray-800',
      food: 'bg-orange-100 text-orange-800',
      build: 'bg-blue-100 text-blue-800',
      events: 'bg-purple-100 text-purple-800',
      art: 'bg-pink-100 text-pink-800',
      logistics: 'bg-green-100 text-green-800',
      vibes: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-600',
    }
    return colors[value] || colors.general
  }

  const unreadCount = ideas.filter(i => !i.is_read).length
  const totalCount = ideas.length

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div>Loading ideas...</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black uppercase tracking-wider mb-2">💡 Idea Forum — Admin</h1>
      <p className="text-gray-500 mb-6">
        {totalCount} total idea{totalCount !== 1 ? 's' : ''} &middot;{' '}
        <span className={cn(unreadCount > 0 && 'text-orange-600 font-bold')}>
          {unreadCount} unread
        </span>
      </p>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'error'} className="mb-4">
          {message.text}
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-2">
          {(['all', 'unread', 'read'] as ReadFilter[]).map(f => (
            <Button
              key={f}
              variant={readFilter === f ? 'primary' : 'secondary'}
              onClick={() => setReadFilter(f)}
              size="sm"
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
            </Button>
          ))}
        </div>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={CATEGORIES.map(cat => ({ value: cat.value, label: cat.label }))}
        />
      </div>

      {/* Ideas list */}
      {ideas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No ideas match the current filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ideas.map(idea => (
            <Card
              key={idea.id}
              className={cn(
                'cursor-pointer transition-all',
                !idea.is_read && 'border-l-4 border-l-orange-400',
                idea.is_read && 'opacity-75',
                expandedId === idea.id && 'border-2 border-yellow-400'
              )}
              onClick={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className={cn(
                      'text-base',
                      !idea.is_read && 'font-black'
                    )}>
                      {!idea.is_read && <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-2 align-middle" />}
                      {idea.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {idea.author_email} &middot;{' '}
                      {new Date(idea.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <span className={cn(
                      'text-xs font-bold px-2 py-1 rounded',
                      getCategoryColor(idea.category)
                    )}>
                      {getCategoryLabel(idea.category)}
                    </span>
                    {idea.is_read ? (
                      <Badge variant="success">Read</Badge>
                    ) : (
                      <Badge variant="warning">New</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              {expandedId === idea.id && (
                <CardContent className="pt-0">
                  <div className="border-t pt-4">
                    <p className="text-sm whitespace-pre-wrap mb-4">{idea.body}</p>
                    <div className="flex items-center justify-between">
                      <Button
                        size="sm"
                        variant={idea.is_read ? 'secondary' : 'primary'}
                        onClick={(e) => { e.stopPropagation(); toggleRead(idea) }}
                      >
                        {idea.is_read ? '↩ Mark Unread' : '✓ Mark as Read'}
                      </Button>
                      {idea.read_at && (
                        <span className="text-xs text-gray-400">
                          Read {new Date(idea.read_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric',
                            hour: 'numeric', minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
