'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  EVENT_SETTINGS_SCHEMA,
  EVENT_SETTING_GROUPS,
  fetchEventSettings,
  type EventSettingDef,
  type EventSettingsMap,
} from '@/lib/event-settings'
import { updateEventSettingAction } from '@/app/actions/event-settings'
import { Alert, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui'

/**
 * Settings that belong to one event rather than to NYC Deli.
 *
 * These used to be global, so the 2026 camp footprint and registration window
 * would silently have become 2027's. Each event now carries its own values,
 * seeded from what the org was running when this shipped.
 */
export function EventSettingsTab({ eventId, disabled }: { eventId: string; disabled?: boolean }) {
  const [values, setValues] = useState<EventSettingsMap>({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    setValues(await fetchEventSettings(eventId))
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    startTransition(() => { load() })
  }, [load])

  const save = async (def: EventSettingDef, value: string) => {
    setValues(prev => ({ ...prev, [def.key]: value }))
    const result = await updateEventSettingAction(eventId, def.key, value)
    setMessage(
      result.success
        ? { type: 'success', text: `${def.label} saved.` }
        : { type: 'error', text: result.error }
    )
    if (!result.success) load()
  }

  if (loading) return <p className="font-bold uppercase tracking-wider text-gray-500">Loading…</p>

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        These apply to this event only. Site-wide switches such as maintenance mode stay on the admin portal.
      </p>

      {message && <Alert variant={message.type === 'error' ? 'error' : 'success'}>{message.text}</Alert>}

      {EVENT_SETTING_GROUPS.map(group => {
        const defs = EVENT_SETTINGS_SCHEMA.filter(def => def.group === group)
        return (
          <Card key={group}>
            <CardHeader>
              <CardTitle>{group}</CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <div className="grid md:grid-cols-3 gap-4">
                {defs.map(def => (
                  <SettingField
                    key={def.key}
                    def={def}
                    value={values[def.key] ?? def.fallback}
                    disabled={disabled}
                    onChange={value => save(def, value)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function SettingField({
  def,
  value,
  disabled,
  onChange,
}: {
  def: EventSettingDef
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  if (def.type === 'boolean') {
    return (
      <div>
        <Select
          label={def.label}
          value={value === 'true' ? 'true' : 'false'}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          options={[
            { value: 'true', label: 'On' },
            { value: 'false', label: 'Off' },
          ]}
        />
        {def.help && <p className="text-xs text-gray-500 mt-1">{def.help}</p>}
      </div>
    )
  }

  return (
    <div>
      <Input
        label={def.label}
        type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      />
      {def.help && <p className="text-xs text-gray-500 mt-1">{def.help}</p>}
    </div>
  )
}
