'use client'

import { useState } from 'react'
import {
  Button, Input, Select, Checkbox, CheckboxGroup, Textarea,
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Alert,
} from '@/components/ui'
import { createApplicantAction } from '@/app/actions/admin'
import {
  shelterTypes, arrivalMethods, powerTypes, orientationPreferences, skillTags,
} from '@/lib/validations'
import type {
  CamperInsert, ShelterType, ArrivalMethod, PowerType, OrientationPreference, SkillTag,
} from '@/types/database'

const DEFAULT_PASSWORD = 'NYCDeli2026!'

type FormState = {
  full_name: string
  playa_name: string
  email: string
  phone: string
  password: string
  arrival_date: string
  arrival_method: ArrivalMethod
  departure_date: string
  departure_method: ArrivalMethod
  early_arrival: boolean
  shelter_type: ShelterType
  shelter_length_ft: string
  shelter_width_ft: string
  shelter_height_ft: string
  tent_make_model: string
  orientation_preference: OrientationPreference
  bringing_vehicle: boolean
  vehicle_info: string
  power_required: boolean
  power_type: PowerType
  kitchen_participation: boolean
  strike_participation: boolean
  build_week_attending: boolean
  volunteer_commitment: boolean
  sober_shifts: boolean
  background_check_consent: boolean
  paid: boolean
  skills: SkillTag[]
  custom_skills: string
  emergency_contact_name: string
  emergency_contact_number: string
  emergency_contact_relationship: string
  medical_conditions: string
  medications: string
  allergies: string
  dietary_restrictions: string
  burn_count: string
  what_attracted_you: string
  referral_source: string
  character_references: string
  first_burn_hopes: string
  special_requests: string
  notes: string
}

const EMPTY_FORM: FormState = {
  full_name: '',
  playa_name: '',
  email: '',
  phone: '',
  password: '',
  arrival_date: '',
  arrival_method: 'car',
  departure_date: '',
  departure_method: 'car',
  early_arrival: false,
  shelter_type: 'tent',
  shelter_length_ft: '10',
  shelter_width_ft: '10',
  shelter_height_ft: '',
  tent_make_model: '',
  orientation_preference: 'any',
  bringing_vehicle: false,
  vehicle_info: '',
  power_required: false,
  power_type: 'none',
  kitchen_participation: true,
  strike_participation: true,
  build_week_attending: false,
  volunteer_commitment: false,
  sober_shifts: false,
  background_check_consent: false,
  paid: false,
  skills: [],
  custom_skills: '',
  emergency_contact_name: '',
  emergency_contact_number: '',
  emergency_contact_relationship: '',
  medical_conditions: '',
  medications: '',
  allergies: '',
  dietary_restrictions: '',
  burn_count: '',
  what_attracted_you: '',
  referral_source: '',
  character_references: '',
  first_burn_hopes: '',
  special_requests: '',
  notes: '',
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-bold uppercase tracking-wider text-sm mb-3 border-b-2 border-black pb-1">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

interface AddApplicantFormProps {
  onClose: () => void
  onCreated: (message: string) => void
}

export default function AddApplicantForm({ onClose, onCreated }: AddApplicantFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const buildCamper = (): CamperInsert => {
    const num = (v: string) => (v.trim() === '' ? null : Number(v))
    const text = (v: string) => (v.trim() === '' ? null : v.trim())
    return {
      full_name: form.full_name.trim(),
      playa_name: text(form.playa_name),
      email: form.email.trim().toLowerCase(),
      phone: text(form.phone),
      arrival_date: form.arrival_date,
      arrival_method: form.arrival_method,
      departure_date: form.departure_date,
      departure_method: form.departure_method,
      early_arrival: form.early_arrival,
      shelter_type: form.shelter_type,
      shelter_length_ft: Number(form.shelter_length_ft),
      shelter_width_ft: Number(form.shelter_width_ft),
      shelter_height_ft: num(form.shelter_height_ft),
      tent_make_model: text(form.tent_make_model),
      orientation_preference: form.orientation_preference,
      bringing_vehicle: form.bringing_vehicle,
      vehicle_info: text(form.vehicle_info),
      power_required: form.power_required,
      power_type: form.power_type,
      kitchen_participation: form.kitchen_participation,
      preferred_shift_types: ['any'],
      strike_participation: form.strike_participation,
      build_week_attending: form.build_week_attending,
      tools_bringing: [],
      skills: form.skills,
      custom_skills: text(form.custom_skills),
      emergency_contact: [form.emergency_contact_name, form.emergency_contact_number]
        .filter(v => v.trim() !== '').join(', ') || null,
      emergency_contact_name: text(form.emergency_contact_name),
      emergency_contact_number: text(form.emergency_contact_number),
      emergency_contact_relationship: text(form.emergency_contact_relationship),
      medical_conditions: text(form.medical_conditions),
      medications: text(form.medications),
      allergies: text(form.allergies),
      dietary_restrictions: text(form.dietary_restrictions),
      burn_count: text(form.burn_count),
      what_attracted_you: text(form.what_attracted_you),
      referral_source: text(form.referral_source),
      character_references: text(form.character_references),
      first_burn_hopes: text(form.first_burn_hopes),
      volunteer_commitment: form.volunteer_commitment,
      sober_shifts: form.sober_shifts,
      background_check_consent: form.background_check_consent,
      paid: form.paid,
      special_requests: text(form.special_requests),
      notes: text(form.notes),
    }
  }

  const validate = (): string | null => {
    if (form.full_name.trim().length < 2) return 'Full name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'A valid email is required'
    if (!form.arrival_date) return 'Arrival date is required'
    if (!form.departure_date) return 'Departure date is required'
    if (form.departure_date < form.arrival_date) return 'Departure date must be on or after arrival'
    if (!(Number(form.shelter_length_ft) > 0) || !(Number(form.shelter_width_ft) > 0))
      return 'Shelter length and width must be greater than 0'
    if (form.password.trim() !== '' && form.password.trim().length < 8)
      return 'Password must be at least 8 characters'
    return null
  }

  const submit = async (approve: boolean) => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setSaving(true)
    const result = await createApplicantAction({
      camper: buildCamper(),
      password: form.password.trim() || undefined,
      approve,
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error || 'Failed to create applicant')
      return
    }
    const password = form.password.trim() || DEFAULT_PASSWORD
    onCreated(
      `${form.email.trim().toLowerCase()} created${approve ? ' and approved' : ' as pending'} — login password: ${password}`
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <Card className="w-full max-w-3xl my-8">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">➕ Add Applicant</CardTitle>
              <CardDescription>
                Create a camper profile on someone&apos;s behalf. An auth login is created with the
                password below (default {DEFAULT_PASSWORD}).
              </CardDescription>
            </div>
            <Button variant="secondary" size="sm" onClick={onClose}>✕</Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && <Alert variant="error">{error}</Alert>}

          <Section title="Identity">
            <Input label="Full Name" required value={form.full_name}
              onChange={e => set('full_name', e.target.value)} />
            <Input label="Playa Name" value={form.playa_name}
              onChange={e => set('playa_name', e.target.value)} />
            <Input label="Email" type="email" required value={form.email}
              onChange={e => set('email', e.target.value)} />
            <Input label="Phone" value={form.phone}
              onChange={e => set('phone', e.target.value)} />
            <Input label="Login Password" type="text" value={form.password}
              placeholder={DEFAULT_PASSWORD}
              helpText="Leave blank to use the default password"
              onChange={e => set('password', e.target.value)} />
          </Section>

          <Section title="Arrival & Departure">
            <Input label="Arrival Date" type="date" required value={form.arrival_date}
              onChange={e => set('arrival_date', e.target.value)} />
            <Select label="Arrival Method" value={form.arrival_method}
              options={arrivalMethods.map(m => ({ value: m, label: titleCase(m) }))}
              onChange={e => set('arrival_method', e.target.value as ArrivalMethod)} />
            <Input label="Departure Date" type="date" required value={form.departure_date}
              onChange={e => set('departure_date', e.target.value)} />
            <Select label="Departure Method" value={form.departure_method}
              options={arrivalMethods.map(m => ({ value: m, label: titleCase(m) }))}
              onChange={e => set('departure_method', e.target.value as ArrivalMethod)} />
            <Checkbox label="Early arrival" checked={form.early_arrival}
              onChange={e => set('early_arrival', e.target.checked)} />
          </Section>

          <Section title="Shelter">
            <Select label="Shelter Type" value={form.shelter_type}
              options={shelterTypes.map(t => ({ value: t, label: titleCase(t) }))}
              onChange={e => set('shelter_type', e.target.value as ShelterType)} />
            <Input label="Make / Model" value={form.tent_make_model}
              onChange={e => set('tent_make_model', e.target.value)} />
            <Input label="Length (ft)" type="number" min="1" step="0.5" required
              value={form.shelter_length_ft}
              onChange={e => set('shelter_length_ft', e.target.value)} />
            <Input label="Width (ft)" type="number" min="1" step="0.5" required
              value={form.shelter_width_ft}
              onChange={e => set('shelter_width_ft', e.target.value)} />
            <Input label="Height (ft)" type="number" min="0" step="0.5"
              value={form.shelter_height_ft}
              onChange={e => set('shelter_height_ft', e.target.value)} />
            <Select label="Orientation Preference" value={form.orientation_preference}
              options={orientationPreferences.map(o => ({ value: o, label: titleCase(o) }))}
              onChange={e => set('orientation_preference', e.target.value as OrientationPreference)} />
            <Checkbox label="Bringing a vehicle" checked={form.bringing_vehicle}
              onChange={e => set('bringing_vehicle', e.target.checked)} />
            <Input label="Vehicle Info" value={form.vehicle_info}
              onChange={e => set('vehicle_info', e.target.value)} />
            <Checkbox label="Power required" checked={form.power_required}
              onChange={e => set('power_required', e.target.checked)} />
            <Select label="Power Type" value={form.power_type}
              options={powerTypes.map(p => ({ value: p, label: titleCase(p) }))}
              onChange={e => set('power_type', e.target.value as PowerType)} />
          </Section>

          <Section title="Participation">
            <Checkbox label="Kitchen participation" checked={form.kitchen_participation}
              onChange={e => set('kitchen_participation', e.target.checked)} />
            <Checkbox label="Strike participation" checked={form.strike_participation}
              onChange={e => set('strike_participation', e.target.checked)} />
            <Checkbox label="Attending build week" checked={form.build_week_attending}
              onChange={e => set('build_week_attending', e.target.checked)} />
            <Checkbox label="Volunteer commitment" checked={form.volunteer_commitment}
              onChange={e => set('volunteer_commitment', e.target.checked)} />
            <Checkbox label="Sober shifts agreement" checked={form.sober_shifts}
              onChange={e => set('sober_shifts', e.target.checked)} />
            <Checkbox label="Background check consent" checked={form.background_check_consent}
              onChange={e => set('background_check_consent', e.target.checked)} />
            <Checkbox label="Dues paid" checked={form.paid}
              onChange={e => set('paid', e.target.checked)} />
          </Section>

          <div>
            <h3 className="font-bold uppercase tracking-wider text-sm mb-3 border-b-2 border-black pb-1">
              Skills
            </h3>
            <div className="space-y-4">
              <CheckboxGroup
                options={skillTags.map(s => ({ value: s, label: titleCase(s) }))}
                value={form.skills}
                onChange={v => set('skills', v as SkillTag[])}
              />
              <Textarea label="Other Skills" rows={2} value={form.custom_skills}
                onChange={e => set('custom_skills', e.target.value)} />
            </div>
          </div>

          <Section title="Safety & Medical">
            <Input label="Emergency Contact Name" value={form.emergency_contact_name}
              onChange={e => set('emergency_contact_name', e.target.value)} />
            <Input label="Emergency Contact Number" value={form.emergency_contact_number}
              onChange={e => set('emergency_contact_number', e.target.value)} />
            <Input label="Relationship" value={form.emergency_contact_relationship}
              onChange={e => set('emergency_contact_relationship', e.target.value)} />
            <Input label="Medical Conditions" value={form.medical_conditions}
              onChange={e => set('medical_conditions', e.target.value)} />
            <Input label="Medications" value={form.medications}
              onChange={e => set('medications', e.target.value)} />
            <Input label="Allergies" value={form.allergies}
              onChange={e => set('allergies', e.target.value)} />
            <Input label="Dietary Restrictions" value={form.dietary_restrictions}
              onChange={e => set('dietary_restrictions', e.target.value)} />
          </Section>

          <div>
            <h3 className="font-bold uppercase tracking-wider text-sm mb-3 border-b-2 border-black pb-1">
              About
            </h3>
            <div className="space-y-4">
              <Input label="Burn Count" value={form.burn_count}
                onChange={e => set('burn_count', e.target.value)} />
              <Input label="Referral Source" value={form.referral_source}
                onChange={e => set('referral_source', e.target.value)} />
              <Textarea label="What Attracted Them" rows={2} value={form.what_attracted_you}
                onChange={e => set('what_attracted_you', e.target.value)} />
              <Textarea label="Character References" rows={2} value={form.character_references}
                onChange={e => set('character_references', e.target.value)} />
              <Textarea label="First Burn Hopes" rows={2} value={form.first_burn_hopes}
                onChange={e => set('first_burn_hopes', e.target.value)} />
              <Textarea label="Special Requests" rows={2} value={form.special_requests}
                onChange={e => set('special_requests', e.target.value)} />
              <Textarea label="Admin Notes" rows={2} value={form.notes}
                onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-3 border-t-2 border-black pt-4">
          <Button onClick={() => submit(true)} disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white">
            {saving ? 'Saving...' : '✅ Create & Approve'}
          </Button>
          <Button onClick={() => submit(false)} disabled={saving} variant="secondary">
            {saving ? 'Saving...' : 'Save as Pending'}
          </Button>
          <Button onClick={onClose} disabled={saving} variant="secondary">
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
