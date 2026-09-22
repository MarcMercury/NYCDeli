'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { fetchEvents, isAcceptingApplications } from '@/lib/events'
import {
  DEFAULT_HOME_CTA,
  fetchHomeCtaConfig,
  newHomeCtaButton,
  type HomeCtaButton,
  type HomeCtaConfig,
} from '@/lib/home-cta'
import { saveHomeCtaConfigAction } from '@/app/actions/home'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea } from '@/components/ui'
import type { EventRow } from '@/types/database'

/**
 * Home page call-to-action control. Exists because "Register for Burning Man"
 * was hard-coded into the hero and became a dead link the day that event
 * closed — buttons now live in settings, not in the markup.
 */
export default function AdminHomePage() {
  const [config, setConfig] = useState<HomeCtaConfig | null>(null)
  const [events, setEvents] = useState<EventRow[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    const [cfg, eventRows] = await Promise.all([fetchHomeCtaConfig(), fetchEvents()])
    setConfig(cfg)
    setEvents(eventRows)
  }, [])

  useEffect(() => {
    startTransition(() => { load() })
  }, [load])

  if (!config) {
    return <p className="max-w-3xl mx-auto px-4 py-10 font-bold uppercase tracking-wider text-gray-500">Loading…</p>
  }

  const openEvents = events.filter(isAcceptingApplications)

  const update = (patch: Partial<HomeCtaConfig>) => setConfig({ ...config, ...patch })

  const updateButton = (id: string, patch: Partial<HomeCtaButton>) =>
    update({ buttons: config.buttons.map(b => (b.id === id ? { ...b, ...patch } : b)) })

  const save = async () => {
    setSaving(true)
    const result = await saveHomeCtaConfigAction(config)
    setSaving(false)
    setMessage(
      result.success
        ? { type: 'success', text: 'Home page updated.' }
        : { type: 'error', text: result.error }
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/admin" className="text-sm font-bold uppercase tracking-wider underline">← Admin</Link>
        <h1 className="text-4xl font-black uppercase tracking-wider mt-2">Home Page</h1>
        <p className="text-gray-600 mt-1">
          Controls the buttons in the hero and the &ldquo;Ready to Join?&rdquo; band at the bottom of the home page.
        </p>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'error' : 'success'}>{message.text}</Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Application Buttons</CardTitle>
        </CardHeader>
        <CardContent className="py-4 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4"
              checked={config.autoEventButtons}
              onChange={e => update({ autoEventButtons: e.target.checked })}
            />
            <span>
              <span className="block font-black uppercase text-sm">Show a button for each open event</span>
              <span className="block text-sm text-gray-600">
                An &ldquo;Apply&rdquo; button appears automatically while an event is accepting applications, and
                disappears when you close them. Nothing to remember, nothing to go stale.
              </span>
            </span>
          </label>

          <div className="border-2 border-black bg-gray-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Currently accepting applications
            </p>
            {openEvents.length === 0 ? (
              <p className="text-sm text-gray-700">
                Nothing is open, so no automatic buttons are showing.{' '}
                <Link href="/admin/events" className="underline font-bold">Open applications on an event</Link> to add one.
              </p>
            ) : (
              <ul className="space-y-1">
                {openEvents.map(event => (
                  <li key={event.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-bold">Apply — {event.name}</span>
                    <Badge variant="success">/events/{event.slug}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Buttons</CardTitle>
        </CardHeader>
        <CardContent className="py-4 space-y-4">
          <p className="text-sm text-gray-600">
            For anything the automatic buttons don&apos;t cover — an external form, a ticket link, a signup sheet.
            Switch one off to hide it without losing what you typed.
          </p>

          {config.buttons.length === 0 && (
            <p className="text-gray-600">No custom buttons.</p>
          )}

          {config.buttons.map(button => (
            <div key={button.id} className="border-2 border-black p-3 space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <Input
                  label="Label"
                  value={button.label}
                  onChange={e => updateButton(button.id, { label: e.target.value })}
                  placeholder="Apply for Love Burn"
                />
                <Input
                  label="Link"
                  value={button.href}
                  onChange={e => updateButton(button.id, { href: e.target.value })}
                  placeholder="/events/love-burn-2027"
                  helpText="A path like /intake, or a full https:// URL."
                />
              </div>
              <div className="grid md:grid-cols-3 gap-3 items-end">
                <Select
                  label="Where"
                  value={button.placement}
                  onChange={e => updateButton(button.id, { placement: e.target.value as HomeCtaButton['placement'] })}
                  options={[
                    { value: 'both', label: 'Top and bottom' },
                    { value: 'hero', label: 'Top (hero) only' },
                    { value: 'join', label: 'Bottom band only' },
                  ]}
                />
                <Select
                  label="Style"
                  value={button.variant}
                  onChange={e => updateButton(button.id, { variant: e.target.value as HomeCtaButton['variant'] })}
                  options={[
                    { value: 'primary', label: 'Solid (primary)' },
                    { value: 'secondary', label: 'Outline (secondary)' },
                  ]}
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={button.enabled}
                      onChange={e => updateButton(button.id, { enabled: e.target.checked })}
                    />
                    Visible
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update({ buttons: config.buttons.filter(b => b.id !== button.id) })}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => update({ buttons: [...config.buttons, newHomeCtaButton()] })}
          >
            + Add Button
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>&ldquo;Ready to Join?&rdquo; Text</CardTitle>
        </CardHeader>
        <CardContent className="py-4 space-y-4">
          <Input
            label="Heading"
            value={config.joinHeading}
            onChange={e => update({ joinHeading: e.target.value })}
          />
          <Textarea
            label="Body"
            rows={3}
            value={config.joinBody}
            onChange={e => update({ joinBody: e.target.value })}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={save} loading={saving}>Save Home Page</Button>
        <Button variant="secondary" onClick={() => setConfig(DEFAULT_HOME_CTA)}>Reset to Defaults</Button>
        <Link href="/" className="inline-flex items-center text-sm font-bold uppercase tracking-wider underline">
          View home page →
        </Link>
      </div>
    </div>
  )
}
