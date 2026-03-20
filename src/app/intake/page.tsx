'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { 
  Button, Input, Select, Checkbox, CheckboxGroup, Textarea, 
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Alert, Stepper
} from '@/components/ui'
import { intakeFormSchema, type IntakeFormData, shelterTypes, arrivalMethods, powerTypes, orientationPreferences, shiftTypes, skillTags } from '@/lib/validations'
import { fieldHelp, getRandomLoadingMessage, pageCopy } from '@/lib/tone'
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
]

export default function IntakePage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const router = useRouter()
  
  const { control, handleSubmit, watch, trigger, formState: { errors } } = useForm<IntakeFormData>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      full_name: '',
      playa_name: '',
      email: '',
      phone: '',
      arrival_date: '',
      arrival_method: 'car',
      departure_date: '',
      early_arrival: false,
      shelter_type: 'tent',
      shelter_length_ft: 10,
      shelter_width_ft: 10,
      shelter_height_ft: null,
      orientation_preference: 'any',
      power_required: false,
      power_type: 'none',
      shade_required: false,
      special_requests: '',
      kitchen_participation: true,
      preferred_shift_types: ['any'],
      strike_participation: true,
      build_week_attending: false,
      build_week_arrival_date: '',
      tools_bringing: [],
      vehicle_info: '',
      skills: [],
      custom_skills: '',
    },
    mode: 'onBlur',
  })

  const buildWeekAttending = watch('build_week_attending')
  const powerRequired = watch('power_required')
  const copy = pageCopy.intake

  const validateCurrentStep = async () => {
    const fieldsToValidate: (keyof IntakeFormData)[][] = [
      ['full_name', 'playa_name', 'email', 'phone'],
      ['arrival_date', 'arrival_method', 'departure_date', 'early_arrival'],
      ['shelter_type', 'shelter_length_ft', 'shelter_width_ft', 'shelter_height_ft', 'orientation_preference'],
      ['power_required', 'power_type', 'shade_required', 'special_requests'],
      ['kitchen_participation', 'preferred_shift_types', 'strike_participation'],
      ['skills', 'custom_skills'],
      ['build_week_attending', 'build_week_arrival_date', 'tools_bringing', 'vehicle_info'],
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
      
      const camperData = {
        ...data,
        shelter_height_ft: data.shelter_height_ft || null,
        playa_name: data.playa_name || null,
        phone: data.phone || null,
        special_requests: data.special_requests || null,
        build_week_arrival_date: data.build_week_attending ? data.build_week_arrival_date : null,
        tools_bringing: data.tools_bringing || [],
        vehicle_info: data.vehicle_info || null,
        custom_skills: data.custom_skills || null,
      }
      
      const { error } = await supabase
        .from('campers')
        .insert(camperData as never)

      if (error) throw error

      router.push('/intake/success')
    } catch (err) {
      console.error('Submission error:', err)
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
        <Alert variant="warning" title="Read This" className="mb-6">
          {copy.helpText}
        </Alert>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>
                Step {currentStep + 1}: {steps[currentStep].title}
              </CardTitle>
              <CardDescription>
                {currentStep === 0 && "Who are you? Let's find out."}
                {currentStep === 1 && "When are you arriving and leaving?"}
                {currentStep === 2 && "What are you sleeping in? Measure it. Actually measure it."}
                {currentStep === 3 && "What infrastructure do you need?"}
                {currentStep === 4 && "Everyone participates. No exceptions."}
                {currentStep === 5 && "What can you actually do?"}
                {currentStep === 6 && "Are you coming early to build?"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Step 1: Identity */}
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
                        helpText={fieldHelp.fullName}
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
                        helpText={fieldHelp.playaName}
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
                        helpText={fieldHelp.email}
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
                        helpText={fieldHelp.phone}
                        {...field}
                        value={field.value || ''}
                      />
                    )}
                  />
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
                        helpText={fieldHelp.arrivalDate}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="arrival_method"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Arrival Method"
                        required
                        options={arrivalMethods.map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))}
                        error={errors.arrival_method?.message}
                        helpText={fieldHelp.arrivalMethod}
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
                        helpText={fieldHelp.departureDate}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="early_arrival"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label="I'm arriving early (before gates open)"
                        checked={field.value}
                        onChange={field.onChange}
                        helpText={fieldHelp.earlyArrival}
                      />
                    )}
                  />
                </>
              )}

              {/* Step 3: Shelter */}
              {currentStep === 2 && (
                <>
                  <Alert variant="warning" className="mb-4">
                    Measure your tent. Not vibes. Actual measurements with a tape measure.
                    These values feed directly into the layout engine.
                  </Alert>
                  <Controller
                    name="shelter_type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Shelter Type"
                        required
                        options={shelterTypes.map(t => ({ 
                          value: t, 
                          label: t === 'shiftpod' ? 'Shiftpod' : t === 'rv' ? 'RV' : t.charAt(0).toUpperCase() + t.slice(1)
                        }))}
                        error={errors.shelter_type?.message}
                        helpText={fieldHelp.shelterType}
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
                          helpText={fieldHelp.shelterLength}
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
                          helpText={fieldHelp.shelterWidth}
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
                        helpText={fieldHelp.shelterHeight}
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    )}
                  />
                  <Controller
                    name="orientation_preference"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Door Orientation Preference"
                        options={orientationPreferences.map(o => ({ 
                          value: o, 
                          label: o.charAt(0).toUpperCase() + o.slice(1)
                        }))}
                        error={errors.orientation_preference?.message}
                        helpText={fieldHelp.orientationPreference}
                        {...field}
                        value={field.value || 'any'}
                      />
                    )}
                  />
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
                        helpText={fieldHelp.powerRequired}
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
                          helpText={fieldHelp.powerType}
                          {...field}
                        />
                      )}
                    />
                  )}
                  <Controller
                    name="shade_required"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label="I need to be under camp shade structure"
                        checked={field.value}
                        onChange={field.onChange}
                        helpText={fieldHelp.shadeRequired}
                      />
                    )}
                  />
                  <Controller
                    name="special_requests"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        label="Special Requests"
                        placeholder="Keep it reasonable. We're not a resort."
                        rows={3}
                        error={errors.special_requests?.message}
                        helpText={fieldHelp.specialRequests}
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
                  <Alert variant="info" className="mb-4">
                    Everyone contributes. That&apos;s the deal. Pick your poison.
                  </Alert>
                  <Controller
                    name="kitchen_participation"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label="I will participate in kitchen duties"
                        checked={field.value}
                        onChange={field.onChange}
                        helpText={fieldHelp.kitchenParticipation}
                      />
                    )}
                  />
                  <Controller
                    name="preferred_shift_types"
                    control={control}
                    render={({ field }) => (
                      <CheckboxGroup
                        label="Preferred Shift Types"
                        required
                        options={shiftTypes.map(s => ({ 
                          value: s, 
                          label: s === 'any' ? 'Any (flexible)' : s.charAt(0).toUpperCase() + s.slice(1)
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.preferred_shift_types?.message}
                        helpText={fieldHelp.preferredShifts}
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
                        helpText={fieldHelp.strikeParticipation}
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
                        helpText={fieldHelp.skills}
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
                  <Alert variant="info" className="mb-4">
                    Build week is August 23-30. Early arrival = early responsibility.
                  </Alert>
                  <Controller
                    name="build_week_attending"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label="I'm attending build week"
                        checked={field.value}
                        onChange={field.onChange}
                        helpText="Think carefully before saying yes."
                      />
                    )}
                  />
                  {buildWeekAttending && (
                    <>
                      <Controller
                        name="build_week_arrival_date"
                        control={control}
                        render={({ field }) => (
                          <Input
                            label="Build Week Arrival Date"
                            type="date"
                            required
                            error={errors.build_week_arrival_date?.message}
                            {...field}
                            value={field.value || ''}
                          />
                        )}
                      />
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
                            helpText={fieldHelp.toolsBringing}
                            value={field.value?.join('\n') || ''}
                            onChange={e => field.onChange(e.target.value.split('\n').filter(Boolean))}
                          />
                        )}
                      />
                    </>
                  )}
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
