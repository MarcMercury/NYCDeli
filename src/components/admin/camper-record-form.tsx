'use client'

import { useMemo, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea } from '@/components/ui'
import type { CamperRow, CamperUpdate } from '@/types/database'

/**
 * The camper record for one event, as a field schema rather than a thousand
 * lines of hand-written inputs.
 *
 * This moved off the admin portal's Campers & Users tab so that a person's
 * account, application and operational record are edited in one place. Keeping
 * it declarative is what made the move affordable — adding a camper column is
 * one line here instead of a new block of JSX.
 */

type FieldType = 'text' | 'email' | 'date' | 'number' | 'boolean' | 'select' | 'textarea'

interface Field {
  key: keyof CamperRow
  label: string
  type: FieldType
  options?: { value: string; label: string }[]
  help?: string
}

interface FieldGroup {
  title: string
  fields: Field[]
}

const opts = (...values: string[]) =>
  values.map(value => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ') }))

const GROUPS: FieldGroup[] = [
  {
    title: '📇 Contact',
    fields: [
      { key: 'full_name', label: 'Full Name', type: 'text' },
      { key: 'playa_name', label: 'Playa Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text' },
    ],
  },
  {
    title: '🚗 Arrival & Departure',
    fields: [
      { key: 'arrival_date', label: 'Arrival Date', type: 'date' },
      { key: 'departure_date', label: 'Departure Date', type: 'date' },
      { key: 'arrival_method', label: 'Arrival Method', type: 'select', options: opts('car', 'bus', 'other') },
      { key: 'departure_method', label: 'Departure Method', type: 'select', options: opts('car', 'bus', 'other') },
      { key: 'early_arrival', label: 'Early Arrival', type: 'boolean' },
      { key: 'bringing_vehicle', label: 'Bringing a Vehicle', type: 'boolean' },
      { key: 'vehicle_info', label: 'Vehicle Info', type: 'text' },
    ],
  },
  {
    title: '🏕️ Shelter',
    fields: [
      {
        key: 'shelter_type',
        label: 'Shelter Type',
        type: 'select',
        options: opts('tent', 'shiftpod', 'rv', 'vehicle', 'other'),
      },
      { key: 'shelter_length_ft', label: 'Length (ft)', type: 'number' },
      { key: 'shelter_width_ft', label: 'Width (ft)', type: 'number' },
      { key: 'shelter_height_ft', label: 'Height (ft)', type: 'number' },
      {
        key: 'orientation_preference',
        label: 'Orientation',
        type: 'select',
        options: opts('any', 'north', 'south', 'east', 'west'),
      },
      { key: 'tent_make_model', label: 'Tent Make / Model', type: 'text' },
      { key: 'tent_entrance_count', label: 'Entrances', type: 'number' },
      {
        key: 'tent_opening_side',
        label: 'Opening Side',
        type: 'select',
        options: opts('length', 'width', 'both'),
      },
    ],
  },
  {
    title: '⚡ Power',
    fields: [
      { key: 'power_required', label: 'Needs Power', type: 'boolean' },
      { key: 'power_type', label: 'Power Draw', type: 'select', options: opts('none', 'low', 'medium', 'high') },
    ],
  },
  {
    title: '🤝 Participation',
    fields: [
      { key: 'kitchen_participation', label: 'Kitchen Shifts', type: 'boolean' },
      { key: 'strike_participation', label: 'Strike', type: 'boolean' },
      { key: 'build_week_attending', label: 'Build Week', type: 'boolean' },
      { key: 'volunteer_commitment', label: 'Volunteer Commitment', type: 'boolean' },
      { key: 'sober_shifts', label: 'Sober Shifts', type: 'boolean' },
      { key: 'paid', label: 'Dues Paid', type: 'boolean' },
    ],
  },
  {
    title: '🚑 Emergency & Health',
    fields: [
      { key: 'emergency_contact_name', label: 'Contact Name', type: 'text' },
      { key: 'emergency_contact_number', label: 'Contact Number', type: 'text' },
      { key: 'emergency_contact_relationship', label: 'Relationship', type: 'text' },
      { key: 'allergies', label: 'Allergies', type: 'text' },
      { key: 'dietary_restrictions', label: 'Dietary Restrictions', type: 'text' },
      { key: 'medical_conditions', label: 'Medical Conditions', type: 'textarea' },
      { key: 'medications', label: 'Medications', type: 'textarea' },
    ],
  },
  {
    title: '📝 Notes',
    fields: [
      { key: 'custom_skills', label: 'Skills', type: 'textarea' },
      { key: 'special_requests', label: 'Special Requests', type: 'textarea' },
      { key: 'notes', label: 'Admin Notes', type: 'textarea' },
    ],
  },
]

export function CamperRecordForm({
  camper,
  disabled,
  onSave,
}: {
  camper: CamperRow
  disabled?: boolean
  onSave: (patch: CamperUpdate) => Promise<void>
}) {
  const [draft, setDraft] = useState<CamperRow>(camper)
  const [saving, setSaving] = useState(false)

  const dirty = useMemo(
    () => GROUPS.some(g => g.fields.some(f => draft[f.key] !== camper[f.key])),
    [draft, camper]
  )

  const patch = (key: keyof CamperRow, value: unknown) => setDraft(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    setSaving(true)
    const changes: Record<string, unknown> = {}
    for (const group of GROUPS) {
      for (const field of group.fields) {
        if (draft[field.key] !== camper[field.key]) changes[field.key] = draft[field.key]
      }
    }
    await onSave(changes as CamperUpdate)
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {GROUPS.map(group => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle>{group.title}</CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <div className="grid md:grid-cols-4 gap-4">
              {group.fields.map(field => (
                <CamperField
                  key={String(field.key)}
                  field={field}
                  value={draft[field.key]}
                  disabled={disabled}
                  onChange={value => patch(field.key, value)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} loading={saving} disabled={disabled || !dirty}>
          {dirty ? 'Save Camper Record' : 'No Changes'}
        </Button>
      </div>
    </div>
  )
}

function CamperField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: Field
  value: unknown
  disabled?: boolean
  onChange: (value: unknown) => void
}) {
  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 md:pt-6">
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
        />
        <span className="text-sm font-bold">{field.label}</span>
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <Select
        label={field.label}
        value={String(value ?? '')}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        options={field.options ?? []}
      />
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="md:col-span-2">
        <Textarea
          label={field.label}
          rows={2}
          value={String(value ?? '')}
          disabled={disabled}
          onChange={e => onChange(e.target.value || null)}
        />
      </div>
    )
  }

  return (
    <Input
      label={field.label}
      type={field.type}
      value={value == null ? '' : String(value)}
      disabled={disabled}
      onChange={e => {
        const raw = e.target.value
        if (field.type === 'number') onChange(raw === '' ? null : Number(raw))
        else onChange(raw === '' ? null : raw)
      }}
    />
  )
}
