'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { submitIdeaAction } from '@/app/actions/ideas'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, Alert, Button, Input, Textarea, Select,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import type { DeliIdeaRow } from '@/types/database'

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

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<DeliIdeaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('general')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchMyIdeas = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('deli_ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) as unknown as { data: DeliIdeaRow[] | null }

    setIdeas(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMyIdeas()
  }, [fetchMyIdeas])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    const result = await submitIdeaAction({ title, body, category })

    if (result.success) {
      setMessage({ type: 'success', text: 'Idea submitted! Thanks for your input.' })
      setTitle('')
      setBody('')
      setCategory('general')
      setShowForm(false)
      fetchMyIdeas()
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to submit idea' })
    }
    setSubmitting(false)
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
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-yellow-400 border-b-4 border-black py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-black mb-2">
            💡 Deli Idea Forum
          </h1>
          <p className="text-lg text-black/70 font-bold">
            Got an idea for camp? Drop it here. Every voice matters.
          </p>
        </div>
      </section>

      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
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
              ✏️ Submit an Idea
            </Button>
          ) : (
            <Card className="mb-8 border-2 border-yellow-400">
              <CardHeader>
                <CardTitle>Submit Your Idea</CardTitle>
                <CardDescription>
                  What&apos;s on your mind? Suggestions, improvements, wild ideas — all welcome.
                </CardDescription>
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
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Title
                    </label>
                    <Input
                      placeholder="Short summary of your idea..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Description
                    </label>
                    <Textarea
                      placeholder="Describe your idea in detail..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={5}
                      maxLength={5000}
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">{body.length}/5000</p>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Idea'}
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

          {/* My submitted ideas */}
          <h2 className="text-xl font-black uppercase tracking-wider mb-4">
            Your Submitted Ideas ({ideas.length})
          </h2>

          {ideas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                You haven&apos;t submitted any ideas yet. Be the first!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {ideas.map(idea => (
                <Card key={idea.id} className={cn(
                  idea.is_read && 'border-green-300'
                )}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{idea.title}</CardTitle>
                        <CardDescription>
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
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{idea.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
