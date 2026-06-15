'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { submitIdeaAction } from '@/app/actions/ideas'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, Alert, Button, Input, Textarea, Select,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import type { DeliIdeaRow, DeliPostType } from '@/types/database'

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'food', label: 'Food & Kitchen' },
  { value: 'build', label: 'Build & Infrastructure' },
  { value: 'events', label: 'Events & Activities' },
  { value: 'art', label: 'Art & Decor' },
  { value: 'logistics', label: 'Logistics & Ops' },
  { value: 'vibes', label: 'Vibes & Culture' },
  { value: 'other', label: 'Other' },
]

const POST_TYPE_META: Record<DeliPostType, {
  emoji: string
  label: string
  plural: string
  tagline: string
  formTitle: string
  formDesc: string
  titlePlaceholder: string
  bodyPlaceholder: string
  submitLabel: string
}> = {
  idea: {
    emoji: '💡',
    label: 'Idea',
    plural: 'Ideas',
    tagline: 'Got an idea for camp? Drop it here. Every voice matters.',
    formTitle: 'Submit Your Idea',
    formDesc: "What's on your mind? Suggestions, improvements, wild ideas — all welcome.",
    titlePlaceholder: 'Short summary of your idea...',
    bodyPlaceholder: 'Describe your idea in detail...',
    submitLabel: 'Submit Idea',
  },
  question: {
    emoji: '❓',
    label: 'Question',
    plural: 'Questions',
    tagline: 'Need an answer from camp leads? Ask here. We\'ll respond when we can.',
    formTitle: 'Ask a Question',
    formDesc: 'Ask camp leads/admins anything. Replies appear right on your question (no chat — for chat use WhatsApp).',
    titlePlaceholder: 'Short version of your question...',
    bodyPlaceholder: 'Add any context that will help us answer...',
    submitLabel: 'Submit Question',
  },
}

export default function IdeasPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [activeType, setActiveType] = useState<DeliPostType>('idea')
  const [posts, setPosts] = useState<DeliIdeaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('general')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [enhancing, setEnhancing] = useState(false)
  const [enhanced, setEnhanced] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const meta = POST_TYPE_META[activeType]

  const fetchMyPosts = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('deli_ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) as unknown as { data: DeliIdeaRow[] | null }

    setPosts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    startTransition(() => { fetchMyPosts() })
  }, [fetchMyPosts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    const result = await submitIdeaAction({ title, body, category, postType: activeType })

    if (result.success) {
      setMessage({
        type: 'success',
        text: activeType === 'question'
          ? 'Question submitted! Camp leads will respond here.'
          : 'Idea submitted! Thanks for your input.',
      })
      setTitle('')
      setBody('')
      setCategory('general')
      setEnhanced(null)
      setShowForm(false)
      fetchMyPosts()
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to submit' })
    }
    setSubmitting(false)
  }

  const getCategoryLabel = (value: string) =>
    CATEGORIES.find(c => c.value === value)?.label || value

  const enhanceWithAi = async () => {
    if (!title.trim() || !body.trim()) {
      setMessage({ type: 'error', text: 'Write your title and description first, then enhance!' })
      return
    }
    setEnhancing(true)
    setEnhanced(null)
    try {
      const res = await fetch('/api/ai/enhance-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, category }),
      })
      const data = await res.json()
      if (res.ok && data.enhanced) {
        setEnhanced(data.enhanced)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to enhance idea' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    }
    setEnhancing(false)
  }

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

  const switchTab = (next: DeliPostType) => {
    if (next === activeType) return
    setActiveType(next)
    setShowForm(false)
    setMessage(null)
    setEnhanced(null)
  }

  const filtered = posts.filter(p => (p.post_type ?? 'idea') === activeType)
  const ideaCount = posts.filter(p => (p.post_type ?? 'idea') === 'idea').length
  const questionCount = posts.filter(p => p.post_type === 'question').length
  const unansweredQuestions = posts.filter(
    p => p.post_type === 'question' && !p.admin_response,
  ).length

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={embedded ? '' : 'min-h-screen'}>
      {/* Header */}
      {!embedded && (
      <section className="bg-yellow-400 border-b-4 border-black py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-black mb-2">
            💡 Deli Forum
          </h1>
          <p className="text-lg text-black/70 font-bold">
            Ideas &amp; Questions for camp leads. (For real-time chatter, use WhatsApp.)
          </p>
        </div>
      </section>
      )}

      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Type tabs */}
          <div className="flex gap-2 mb-6 border-b-2 border-black">
            {(['idea', 'question'] as DeliPostType[]).map(t => {
              const m = POST_TYPE_META[t]
              const isActive = activeType === t
              const count = t === 'idea' ? ideaCount : questionCount
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  className={cn(
                    'px-4 py-2 font-black uppercase tracking-wider text-sm border-2 border-b-0 rounded-t-lg transition-colors',
                    isActive
                      ? 'bg-yellow-400 border-black text-black'
                      : 'bg-white border-gray-300 text-gray-500 hover:text-black',
                  )}
                >
                  {m.emoji} {m.plural} ({count})
                </button>
              )
            })}
          </div>

          <p className="text-sm text-gray-600 mb-6">{meta.tagline}</p>

          {message && (
            <Alert variant={message.type === 'success' ? 'success' : 'error'} className="mb-6">
              {message.text}
            </Alert>
          )}

          {/* Submit button / form toggle */}
          {!showForm ? (
            <Button
              onClick={() => setShowForm(true)}
              className="mb-8"
            >
              {activeType === 'question' ? '❓ Ask a Question' : '✏️ Submit an Idea'}
            </Button>
          ) : (
            <Card className="mb-8 border-2 border-yellow-400">
              <CardHeader>
                <CardTitle>{meta.formTitle}</CardTitle>
                <CardDescription>{meta.formDesc}</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Category
                    </label>
                    <Select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      options={CATEGORIES.map(cat => ({ value: cat.value, label: cat.label }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-gray-600 mb-1">
                      {activeType === 'question' ? 'Question' : 'Title'}
                    </label>
                    <Input
                      placeholder={meta.titlePlaceholder}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-gray-600 mb-1">
                      {activeType === 'question' ? 'Details / Context' : 'Description'}
                    </label>
                    <Textarea
                      placeholder={meta.bodyPlaceholder}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={5}
                      maxLength={5000}
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">{body.length}/5000</p>
                  </div>

                  {/* AI Enhance — ideas only */}
                  {activeType === 'idea' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Button
                          type="button"
                          onClick={enhanceWithAi}
                          disabled={enhancing || !title.trim() || !body.trim()}
                          className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1"
                        >
                          {enhancing ? '⏳ Thinking...' : '✨ AI Enhance My Idea'}
                        </Button>
                        <span className="text-xs text-gray-400">Get suggestions to flesh out your idea</span>
                      </div>
                      {enhanced && (
                        <div className="mt-3 bg-white border border-purple-100 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                          {enhanced}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : meta.submitLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setShowForm(false); setMessage(null) }}
                  >
                    Cancel
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* My submitted posts */}
          <h2 className="text-xl font-black uppercase tracking-wider mb-1">
            Your {meta.plural} ({filtered.length})
          </h2>
          {activeType === 'question' && unansweredQuestions > 0 && (
            <p className="text-xs text-orange-600 font-bold mb-4">
              {unansweredQuestions} awaiting reply
            </p>
          )}
          {activeType !== 'question' && <div className="mb-4" />}

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                {activeType === 'question'
                  ? "You haven't asked any questions yet."
                  : "You haven't submitted any ideas yet. Be the first!"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map(post => {
                const isQuestion = post.post_type === 'question'
                const hasResponse = !!post.admin_response
                return (
                  <Card key={post.id} className={cn(
                    isQuestion && hasResponse && 'border-green-400 border-2',
                    !isQuestion && post.is_read && 'border-green-300',
                  )}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{post.title}</CardTitle>
                          <CardDescription>
                            {new Date(post.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                              hour: 'numeric', minute: '2-digit',
                            })}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
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
                              <Badge variant="warning">Awaiting reply</Badge>
                            )
                          ) : (
                            post.is_read ? (
                              <Badge variant="success">Read</Badge>
                            ) : (
                              <Badge variant="warning">Pending</Badge>
                            )
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{post.body}</p>

                      {isQuestion && hasResponse && (
                        <div className="mt-4 bg-green-50 border-l-4 border-green-500 rounded p-3">
                          <p className="text-xs font-black uppercase tracking-wider text-green-800 mb-1">
                            ✅ Camp Lead Response
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
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
