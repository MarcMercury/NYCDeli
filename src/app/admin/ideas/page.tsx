'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  markIdeaReadAction,
  respondToQuestionAction,
  clearQuestionResponseAction,
} from '@/app/actions/ideas'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Alert, Button, Select, Textarea,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import type { DeliIdeaRow, DeliPostType } from '@/types/database'

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
type TypeFilter = 'all' | DeliPostType

export default function AdminIdeasPage() {
  const [posts, setPosts] = useState<DeliIdeaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({})
  const [savingResponseId, setSavingResponseId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const fetchPosts = useCallback(async () => {
    const supabase = createClient()

    let query = supabase
      .from('deli_ideas')
      .select('*')
      .order('created_at', { ascending: false })

    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter)
    }
    if (typeFilter !== 'all') {
      query = query.eq('post_type', typeFilter)
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

    setPosts(data || [])
    setLoading(false)
  }, [categoryFilter, readFilter, typeFilter])

  useEffect(() => {
    startTransition(() => { fetchPosts() })
  }, [fetchPosts])

  const toggleRead = async (post: DeliIdeaRow) => {
    const result = await markIdeaReadAction(post.id, !post.is_read)
    if (result.success) {
      fetchPosts()
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update' })
    }
  }

  const sendResponse = async (post: DeliIdeaRow) => {
    const draft = (responseDrafts[post.id] ?? '').trim()
    if (!draft) {
      setMessage({ type: 'error', text: 'Type a response first.' })
      return
    }
    setSavingResponseId(post.id)
    const result = await respondToQuestionAction(post.id, draft)
    setSavingResponseId(null)
    if (result.success) {
      setMessage({ type: 'success', text: 'Response sent.' })
      setResponseDrafts(prev => {
        const next = { ...prev }
        delete next[post.id]
        return next
      })
      fetchPosts()
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to send response' })
    }
  }

  const clearResponse = async (post: DeliIdeaRow) => {
    if (!confirm('Clear this response?')) return
    const result = await clearQuestionResponseAction(post.id)
    if (result.success) {
      fetchPosts()
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to clear' })
    }
  }

  const beginEdit = (post: DeliIdeaRow) => {
    setResponseDrafts(prev => ({
      ...prev,
      [post.id]: post.admin_response ?? '',
    }))
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

  const unreadCount = posts.filter(p => !p.is_read).length
  const totalCount = posts.length
  const unansweredQuestions = posts.filter(
    p => p.post_type === 'question' && !p.admin_response,
  ).length

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div>Loading forum posts...</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black uppercase tracking-wider mb-2">💡 Deli Forum — Admin</h1>
      <p className="text-gray-500 mb-6">
        {totalCount} total post{totalCount !== 1 ? 's' : ''} &middot;{' '}
        <span className={cn(unreadCount > 0 && 'text-orange-600 font-bold')}>
          {unreadCount} unread
        </span>
        {unansweredQuestions > 0 && (
          <>
            {' '}&middot;{' '}
            <span className="text-red-600 font-bold">
              {unansweredQuestions} unanswered question{unansweredQuestions !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </p>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'error'} className="mb-4">
          {message.text}
        </Alert>
      )}

      {/* Type filter */}
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="flex gap-2">
          {([
            { v: 'all' as TypeFilter, label: 'All' },
            { v: 'idea' as TypeFilter, label: '💡 Ideas' },
            { v: 'question' as TypeFilter, label: '❓ Questions' },
          ]).map(opt => (
            <Button
              key={opt.v}
              variant={typeFilter === opt.v ? 'primary' : 'secondary'}
              onClick={() => setTypeFilter(opt.v)}
              size="sm"
            >
              {opt.label}
              {opt.v === 'question' && unansweredQuestions > 0 && ` (${unansweredQuestions})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Read + category filters */}
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

      {/* Posts list */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No posts match the current filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const isQuestion = post.post_type === 'question'
            const hasResponse = !!post.admin_response
            const isExpanded = expandedId === post.id
            const draft = responseDrafts[post.id]
            const editing = draft !== undefined

            return (
              <Card
                key={post.id}
                className={cn(
                  'transition-all',
                  !post.is_read && 'border-l-4 border-l-orange-400',
                  post.is_read && !isQuestion && 'opacity-75',
                  isQuestion && !hasResponse && 'border-l-4 border-l-red-500',
                  isQuestion && hasResponse && 'border-l-4 border-l-green-500',
                  isExpanded && 'border-2 border-yellow-400',
                )}
              >
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : post.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className={cn(
                        'text-base',
                        !post.is_read && 'font-black'
                      )}>
                        <span className="mr-2">{isQuestion ? '❓' : '💡'}</span>
                        {!post.is_read && (
                          <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-2 align-middle" />
                        )}
                        {post.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {post.author_email} &middot;{' '}
                        {new Date(post.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                      <span className={cn(
                        'text-xs font-bold px-2 py-1 rounded',
                        getCategoryColor(post.category)
                      )}>
                        {getCategoryLabel(post.category)}
                      </span>
                      {isQuestion ? (
                        hasResponse ? (
                          <Badge variant="success">Answered</Badge>
                        ) : (
                          <Badge variant="error">Needs Reply</Badge>
                        )
                      ) : (
                        post.is_read ? (
                          <Badge variant="success">Read</Badge>
                        ) : (
                          <Badge variant="warning">New</Badge>
                        )
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="border-t pt-4">
                      <p className="text-sm whitespace-pre-wrap mb-4">{post.body}</p>

                      {isQuestion ? (
                        <div className="space-y-3">
                          {hasResponse && !editing && (
                            <div className="bg-green-50 border-l-4 border-green-500 rounded p-3">
                              <p className="text-xs font-black uppercase tracking-wider text-green-800 mb-1">
                                Your Response
                                {post.responded_at && (
                                  <span className="ml-2 font-normal text-green-700/70 normal-case tracking-normal">
                                    {new Date(post.responded_at).toLocaleDateString('en-US', {
                                      month: 'short', day: 'numeric',
                                      hour: 'numeric', minute: '2-digit',
                                    })}
                                  </span>
                                )}
                              </p>
                              <p className="text-sm whitespace-pre-wrap text-green-900">
                                {post.admin_response}
                              </p>
                              <div className="flex gap-2 mt-3">
                                <Button size="sm" variant="secondary" onClick={() => beginEdit(post)}>
                                  Edit Response
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => clearResponse(post)}>
                                  Clear
                                </Button>
                              </div>
                            </div>
                          )}

                          {(!hasResponse || editing) && (
                            <div>
                              <label className="block text-xs font-black uppercase tracking-wider text-gray-600 mb-1">
                                {hasResponse ? 'Edit Response' : 'Respond to Question'}
                              </label>
                              <Textarea
                                value={responseDrafts[post.id] ?? ''}
                                onChange={(e) => setResponseDrafts(prev => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))}
                                placeholder="Answer the question. The camper will see this on their post."
                                rows={4}
                                maxLength={5000}
                              />
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  onClick={() => sendResponse(post)}
                                  disabled={savingResponseId === post.id}
                                >
                                  {savingResponseId === post.id
                                    ? 'Sending...'
                                    : hasResponse ? 'Save Response' : 'Send Response'}
                                </Button>
                                {editing && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setResponseDrafts(prev => {
                                      const next = { ...prev }
                                      delete next[post.id]
                                      return next
                                    })}
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <Button
                            size="sm"
                            variant={post.is_read ? 'secondary' : 'primary'}
                            onClick={() => toggleRead(post)}
                          >
                            {post.is_read ? '↩ Mark Unread' : '✓ Mark as Read'}
                          </Button>
                          {post.read_at && (
                            <span className="text-xs text-gray-400">
                              Read {new Date(post.read_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric',
                                hour: 'numeric', minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
