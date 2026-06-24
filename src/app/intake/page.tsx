'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { 
  Button, Input, Select, Checkbox, CheckboxGroup, Textarea, 
  Card, CardHeader, CardTitle, CardContent, CardFooter,
  Alert, Stepper
} from '@/components/ui'
import { intakeFormSchema, type IntakeFormData, shelterTypes, arrivalMethods, powerTypes, skillTags } from '@/lib/validations'
import { getRandomLoadingMessage, pageCopy } from '@/lib/tone'
import { createClient } from '@/lib/supabase/client'
import type { Step } from '@/components/ui/stepper'

const steps: Step[] = [
  { id: 'identity', title: 'Identity' },
  { id: 'arrival', title: 'Arrival' },
  { id: 'shelter', title: 'Shelter' },
  { id: 'infrastructure', title: 'Infra' },
  { id: 'participation', title: 'Participate' },
  { id: 'skills', title: 'Skills' },
  { id: 'build', title: 'Build Week' },
  { id: 'safety', title: 'Safety' },
  { id: 'about', title: 'About You' },
]

export default function IntakePage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [allCampersList, setAllCampersList] = useState<{ id: string; full_name: string; playa_name: string | null }[]>([])
  const router = useRouter()
  
  const { control, handleSubmit, watch, trigger, formState: { errors } } = useForm<IntakeFormData>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      full_name: '',
      playa_name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      arrival_date: '',
      arrival_method: 'car',
      departure_date: '',
      early_arrival: false,
      shelter_type: 'tent',
      shelter_length_ft: 10,
      shelter_width_ft: 10,
      shelter_height_ft: null,
      orientation_preference: 'any',
      bringing_vehicle: false,
      tent_make_model: '',
      tent_entrance_count: 1,
      tent_opening_side: null,
      sharing_tent_with: null,
      sharing_tent_with_2: null,
      power_required: false,
      power_type: 'none',
      special_requests: '',
      kitchen_participation: true,
      strike_participation: true,
      build_week_attending: false,
      tools_bringing: [],
      vehicle_info: '',
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
      volunteer_commitment: false,
      sober_shifts: false,
      background_check_consent: false,
    },
    mode: 'onBlur',
  })

  const buildWeekAttending = watch('build_week_attending')
  const powerRequired = watch('power_required')
  const copy = pageCopy.intake

  // Fetch existing campers for sharing dropdowns
  useEffect(() => {
    const fetchCampers = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('campers')
        .select('id, full_name, playa_name')
        .order('full_name')
      setAllCampersList(data || [])
    }
    fetchCampers()
  }, [])

  const validateCurrentStep = async () => {
    const fieldsToValidate: (keyof IntakeFormData)[][] = [
      ['full_name', 'playa_name', 'email', 'phone', 'password', 'confirmPassword'],
      ['arrival_date', 'arrival_method', 'departure_date', 'early_arrival'],
      ['shelter_type', 'shelter_length_ft', 'shelter_width_ft', 'shelter_height_ft', 'bringing_vehicle', 'tent_make_model', 'tent_entrance_count', 'tent_opening_side', 'sharing_tent_with', 'sharing_tent_with_2'],
      ['power_required', 'power_type', 'special_requests'],
      ['kitchen_participation', 'strike_participation'],
      ['skills', 'custom_skills'],
      ['build_week_attending', 'tools_bringing', 'vehicle_info'],
      ['emergency_contact_name', 'emergency_contact_number', 'emergency_contact_relationship', 'medical_conditions', 'medications', 'allergies', 'dietary_restrictions'],
      ['burn_count', 'what_attracted_you', 'referral_source', 'character_references', 'first_burn_hopes', 'volunteer_commitment', 'sober_shifts', 'background_check_consent'],
    ]
    
    const fields = fieldsToValidate[currentStep]
    const result = await trigger(fields)
    return result
  }

  const nextStep = async () => {
    const isValid = await validateCurrentStep()
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = async (data: IntakeFormData) => {
    setIsSubmitting(true)
    setLoadingMessage(getRandomLoadingMessage())
    setSubmitError(null)

    try {
      const supabase = createClient()
      
      // Step 1: Create auth account (or sign in if already registered)
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (signUpError) {
        // If user already registered (from a previous failed attempt), try signing in
        if (signUpError.message.includes('already registered') || signUpError.status === 422) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          })
          if (signInError) {
            throw new Error(
              'An account with this email already exists. Please sign in on the login page, or use a different email.'
            )
          }
        } else {
          throw signUpError
        }
      }

      // Step 2: Check if camper record already exists (from a previous partial submission)
      const { data: existingCamper } = await supabase
        .from('campers')
        .select('id')
        .eq('email', data.email)
        .maybeSingle() as unknown as { data: { id: string } | null }

      if (existingCamper) {
        // Camper already registered — go straight to success
        router.push('/intake/success')
        return
      }

      // Step 3: Insert camper record (strip password fields)
      const { password: _pw, confirmPassword: _cpw, ...camperFields } = data
      const camperData = {
        ...camperFields,
        shelter_height_ft: camperFields.shelter_height_ft || null,
        playa_name: camperFields.playa_name || null,
        phone: camperFields.phone || null,
        special_requests: camperFields.special_requests || null,
        tools_bringing: camperFields.tools_bringing || [],
        vehicle_info: camperFields.vehicle_info || null,
        custom_skills: camperFields.custom_skills || null,
        tent_make_model: camperFields.tent_make_model || null,
        tent_entrance_count: camperFields.tent_entrance_count || null,
        tent_opening_side: camperFields.tent_opening_side || null,
        sharing_tent_with: camperFields.sharing_tent_with || null,
        sharing_tent_with_2: camperFields.sharing_tent_with_2 || null,
      }
      
      const { error } = await supabase
        .from('campers')
        .insert(camperData as never)

      if (error) throw error

      router.push('/intake/success')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-2">
            {copy.pageTitle}
          </h1>
          <p className="text-gray-600">{copy.pageSubtitle}</p>
        </div>

        {/* Progress */}
        <div className="mb-8 overflow-x-auto pb-4">
          <div className="min-w-[600px]">
            <Stepper 
              steps={steps} 
              currentStep={currentStep}
              onStepClick={(index) => index < currentStep && setCurrentStep(index)}
            />
          </div>
        </div>

        {/* Alert */}
        <Alert variant="warning" title="Before You Begin" className="mb-6">
          {copy.helpText} Friends and partners traveling together must each submit this form individually.
        </Alert>

        {/* Camp Status Banner */}
        <Alert variant="info" title="Camp Update — 3/15/2026" className="mb-6">
          Camp is nearly full and subsequent interviews will be prioritizing builders. If you cannot be 
          on build you can still register and be interviewed — we&apos;re just making sure we have 22 builders 
          to build camp.
        </Alert>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>
                Step {currentStep + 1}: {steps[currentStep].title}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Step 1: Identity & Account */}
              {currentStep === 0 && (
                <>
                  <Controller
                    name="full_name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Full Name"
                        placeholder="Your legal name"
                        required
                        error={errors.full_name?.message}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="playa_name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Playa Name"
                        placeholder="Optional"
                        error={errors.playa_name?.message}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Email"
                        type="email"
                        placeholder="your@email.com"
                        required
                        error={errors.email?.message}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Phone"
                        type="tel"
                        placeholder="Optional"
                        error={errors.phone?.message}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />

                  <div className="border-t-2 border-black pt-6 mt-2">
                    <h3 className="font-black uppercase text-sm mb-4">Create Your Account</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      This creates your login so you can track your application status and access camp tools once approved.
                    </p>
                    <div className="space-y-6">
                      <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                          <Input
                            label="Password"
                            type="password"
                            placeholder="At least 8 characters"
                            required
                            error={errors.password?.message}
                            {...field}
                          />
                        )}
                      />
                      <Controller
                        name="confirmPassword"
                        control={control}
                        render={({ field }) => (
                          <Input
                            label="Confirm Password"
                            type="password"
                            placeholder="Type it again"
                            required
                            error={errors.confirmPassword?.message}
                            {...field}
                          />
                        )}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Arrival */}
              {currentStep === 1 && (
                <>
                  <Controller
                    name="arrival_date"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Arrival Date"
                        type="date"
                        required
                        error={errors.arrival_date?.message}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="arrival_method"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Arrival on Playa"
                        required
                        options={arrivalMethods.map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))}
                        error={errors.arrival_method?.message}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="departure_date"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Departure Date"
                        type="date"
                        required
                        error={errors.departure_date?.message}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="early_arrival"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <Checkbox
                          label="I'm not doing build week & am arriving before gates open"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                        {!buildWeekAttending && field.value && (
                          <p className="text-sm text-amber-700 mt-2 ml-6">
                            If you are not on the build team, early arrival requires prior approval from camp leadership.
                          </p>
                        )}
                      </div>
                    )}
                  />
                </>
              )}

              {/* Step 3: Shelter */}
              {currentStep === 2 && (
                <>
                  <Controller
                    name="shelter_type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Shelter Type"
                        required
                        options={shelterTypes.map(t => ({ 
                          value: t, 
                          label: t === 'shiftpod' ? 'Shiftpod' : t === 'rv' ? 'RV (If Approved)' : t === 'vehicle' ? 'Vehicle / Sprinter' : t.charAt(0).toUpperCase() + t.slice(1)
                        }))}
                        error={errors.shelter_type?.message}
                        {...field}
                      />
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="shelter_length_ft"
                      control={control}
                      render={({ field }) => (
                        <Input
                          label="Length (ft)"
                          type="number"
                          min={3}
                          max={50}
                          step={0.5}
                          required
                          error={errors.shelter_length_ft?.message}
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      )}
                    />
                    <Controller
                      name="shelter_width_ft"
                      control={control}
                      render={({ field }) => (
                        <Input
                          label="Width (ft)"
                          type="number"
                          min={3}
                          max={30}
                          step={0.5}
                          required
                          error={errors.shelter_width_ft?.message}
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      )}
                    />
                  </div>
                  <Controller
                    name="shelter_height_ft"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Height (ft)"
                        type="number"
                        min={3}
                        max={15}
                        step={0.5}
                        error={errors.shelter_height_ft?.message}
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    )}
                  />
                  <Controller
                    name="bringing_vehicle"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label="Are you bringing a vehicle to playa?"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />

                  <div className="border-t-2 border-black pt-6 mt-2">
                    <h3 className="font-black uppercase text-sm mb-4">Tent Configuration</h3>
                    <div className="space-y-6">
                      <Controller
                        name="tent_make_model"
                        control={control}
                        render={({ field }) => (
                          <Input
                            label="Tent Make/Model"
                            placeholder="e.g. Coleman/4 Person, Shiftpod Mini"
                            error={errors.tent_make_model?.message}
                            {...field}
                            value={field.value || ''}
                          />
                        )}
                      />
                      <Controller
                        name="tent_entrance_count"
                        control={control}
                        render={({ field }) => (
                          <Select
                            label="Tent Entrances"
                            options={[
                              { value: '', label: 'Select one...' },
                              { value: '1', label: '1 Side' },
                              { value: '2', label: '2 Side' },
                              { value: '3', label: '3 Side' },
                              { value: '4', label: '4 Side' },
                            ]}
                            error={errors.tent_entrance_count?.message}
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            value={field.value ?? ''}
                            onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                        )}
                      />
                      <Controller
                        name="tent_opening_side"
                        control={control}
                        render={({ field }) => (
                          <Select
                            label="Entrance Orientation"
                            options={[
                              { value: '', label: 'Select one...' },
                              { value: 'width', label: 'Short Side' },
                              { value: 'length', label: 'Long Side' },
                              { value: 'both', label: 'Short and Long Sides' },
                            ]}
                            error={errors.tent_opening_side?.message}
                            {...field}
                            value={field.value || ''}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="border-t-2 border-black pt-6 mt-2">
                    <h3 className="font-black uppercase text-sm mb-4">Sharing Your Tent?</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      If you&apos;re sharing a tent with other campers who have already registered, select them below. You can update this later from your profile.
                    </p>
                    <div className="space-y-6">
                      <Controller
                        name="sharing_tent_with"
                        control={control}
                        render={({ field }) => (
                          <Select
                            label="Sharing Tent With (2nd Person)"
                            options={[
                              { value: '', label: 'None' },
                              ...allCampersList.map(c => ({
                                value: c.id,
                                label: c.playa_name ? `${c.full_name} ("${c.playa_name}")` : c.full_name,
                              })),
                            ]}
                            {...field}
                            value={field.value || ''}
                            onChange={e => field.onChange(e.target.value || null)}
                          />
                        )}
                      />
                      <Controller
                        name="sharing_tent_with_2"
                        control={control}
                        render={({ field }) => (
                          <Select
                            label="Sharing Tent With (3rd Person)"
                            options={[
                              { value: '', label: 'None' },
                              ...allCampersList.map(c => ({
                                value: c.id,
                                label: c.playa_name ? `${c.full_name} ("${c.playa_name}")` : c.full_name,
                              })),
                            ]}
                            {...field}
                            value={field.value || ''}
                            onChange={e => field.onChange(e.target.value || null)}
                          />
                        )}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Infrastructure */}
              {currentStep === 3 && (
                <>
                  <Controller
                    name="power_required"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label="I need electrical power"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {powerRequired && (
                    <Controller
                      name="power_type"
                      control={control}
                      render={({ field }) => (
                        <Select
                          label="Power Type"
                          required
                          options={powerTypes.map(p => ({ 
                            value: p, 
                            label: p === 'none' ? 'None' : 
                                   p === 'low' ? 'Low (phone charger, small fan)' :
                                   p === 'medium' ? 'Medium (CPAP, multiple devices)' :
                                   'High (explain yourself below)'
                          }))}
                          error={errors.power_type?.message}
                          {...field}
                        />
                      )}
                    />
                  )}
                  <Controller
                    name="special_requests"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        label="Special Requests"
                        placeholder="Keep it reasonable."
                        rows={3}
                        error={errors.special_requests?.message}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                </>
              )}

              {/* Step 5: Participation */}
              {currentStep === 4 && (
                <>
                  <p className="text-sm text-gray-700">
                    All campers must participate in kitchen shift duties. A shift selection process will take place closer to the burn.
                  </p>
                  <Controller
                    name="kitchen_participation"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label="I will participate in kitchen duties"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="strike_participation"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label="I will stay for strike (teardown)"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </>
              )}

              {/* Step 6: Skills */}
              {currentStep === 5 && (
                <>
                  <Controller
                    name="skills"
                    control={control}
                    render={({ field }) => (
                      <CheckboxGroup
                        label="Skills & Abilities"
                        options={skillTags.map(s => ({ 
                          value: s, 
                          label: s === 'heavy_equipment' ? 'Heavy Equipment' : 
                                 s === 'vibes' ? "✨ I'm just vibes" :
                                 s.charAt(0).toUpperCase() + s.slice(1)
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.skills?.message}
                      />
                    )}
                  />
                  <Controller
                    name="custom_skills"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        label="Other Skills"
                        placeholder="What else can you do? Be specific."
                        rows={2}
                        error={errors.custom_skills?.message}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                </>
              )}

              {/* Step 7: Build Week */}
              {currentStep === 6 && (
                <>
                  <Controller
                    name="build_week_attending"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label="I'm attending build week"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {buildWeekAttending && (
                    <>
                      <p className="text-sm text-gray-500">
                        Your build-week arrival is your <span className="font-bold">Arrival Date</span> from Step 2 &mdash; that single date is used everywhere.
                      </p>
                      <Controller
                        name="vehicle_info"
                        control={control}
                        render={({ field }) => (
                          <Input
                            label="Vehicle Info"
                            placeholder="Make, model, color, capacity"
                            error={errors.vehicle_info?.message}
                            {...field}
                            value={field.value || ''}
                          />
                        )}
                      />
                      <Controller
                        name="tools_bringing"
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            label="Tools You're Bringing"
                            placeholder="One tool per line"
                            rows={3}
                            value={field.value?.join('\n') || ''}
                            onChange={e => field.onChange(e.target.value.split('\n').filter(Boolean))}
                          />
                        )}
                      />
                    </>
                  )}
                </>
              )}

              {/* Step 8: Safety & Medical */}
              {currentStep === 7 && (
                <>
                  <Controller
                    name="emergency_contact_name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Emergency Contact Name"
                        placeholder="Full name of your emergency contact"
                        required
                        error={errors.emergency_contact_name?.message}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="emergency_contact_number"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Emergency Contact Number"
                        type="tel"
                        placeholder="212-555-5555"
                        required
                        error={errors.emergency_contact_number?.message}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="emergency_contact_relationship"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Emergency Contact Relationship"
                        placeholder="e.g. Mother, Partner, Friend"
                        required
                        error={errors.emergency_contact_relationship?.message}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="medical_conditions"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        label="Medical Conditions"
                        rows={2}
                        error={errors.medical_conditions?.message}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                  <Controller
                    name="medications"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        label="Required Medications"
                        rows={2}
                        error={errors.medications?.message}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                  <Controller
                    name="allergies"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        label="Allergies"
                        rows={2}
                        error={errors.allergies?.message}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                  <Controller
                    name="dietary_restrictions"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Dietary Restrictions"
                        error={errors.dietary_restrictions?.message}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                </>
              )}

              {/* Step 9: About You */}
              {currentStep === 8 && (
                <>
                  <Controller
                    name="burn_count"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="How many burns or regional burns have you participated in?"
                        placeholder="Zero is a perfectly valid answer"
                        required
                        error={errors.burn_count?.message}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="what_attracted_you"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        label="What attracted you to camping with NYC Deli?"
                        rows={2}
                        error={errors.what_attracted_you?.message}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                  <Controller
                    name="referral_source"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="If first time with NYC Deli, who gave you the registration link?"
                        error={errors.referral_source?.message}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                  <Controller
                    name="character_references"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        label="Character References (two people, with contact info)"
                        rows={3}
                        error={errors.character_references?.message}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
                  <Controller
                    name="first_burn_hopes"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        label="If this is your first burn with us, what do you hope to get out of it?"
                        rows={2}
                        error={errors.first_burn_hopes?.message}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />

                  <div className="border-t-2 border-black pt-6 mt-6">
                    <h3 className="font-black uppercase text-sm mb-4">Commitments</h3>
                    <div className="space-y-4">
                      <Controller
                        name="volunteer_commitment"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Checkbox
                              label="I will volunteer three 2.5-hour shifts during burn week"
                              checked={field.value}
                              onChange={field.onChange}
                            />
                            {errors.volunteer_commitment?.message && (
                              <p className="text-red-600 text-sm mt-1">{errors.volunteer_commitment.message}</p>
                            )}
                          </div>
                        )}
                      />
                      <Controller
                        name="sober_shifts"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Checkbox
                              label="I will be sober during my volunteer shifts"
                              checked={field.value}
                              onChange={field.onChange}
                            />
                            {errors.sober_shifts?.message && (
                              <p className="text-red-600 text-sm mt-1">{errors.sober_shifts.message}</p>
                            )}
                          </div>
                        )}
                      />
                      <Controller
                        name="background_check_consent"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Checkbox
                              label="I consent to a background check"
                              checked={field.value}
                              onChange={field.onChange}
                            />
                            {errors.background_check_consent?.message && (
                              <p className="text-red-600 text-sm mt-1">{errors.background_check_consent.message}</p>
                            )}
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Error Display */}
              {submitError && (
                <Alert variant="error" title="Submission Failed">
                  {submitError}
                </Alert>
              )}
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                ← Back
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                >
                  Next →
                </Button>
              ) : (
                <Button
                  type="submit"
                  loading={isSubmitting}
                >
                  {isSubmitting ? loadingMessage : 'Submit & Pray'}
                </Button>
              )}
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}
