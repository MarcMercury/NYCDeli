import { z } from 'zod'

// Custom error messages with tone
const required = "This field is required. No exceptions."
const invalidEmail = "That's not a real email address."
const tooSmall = "That's suspiciously small. Measure again."
const tooLarge = "That won't fit. Downsize or stay home."

export const shelterTypes = ['tent', 'shiftpod', 'rv', 'vehicle', 'other'] as const
export const arrivalMethods = ['car', 'bus', 'flight', 'other'] as const
export const powerTypes = ['none', 'low', 'medium', 'high'] as const
export const orientationPreferences = ['north', 'south', 'east', 'west', 'any'] as const
export const shiftTypes = ['prep', 'service', 'cleanup', 'any'] as const
export const skillTags = [
  'construction', 'electrical', 'cooking', 'logistics',
  'heavy_equipment', 'medical', 'art', 'dj', 'bartending', 'vibes'
] as const

// Identity Section
export const identitySchema = z.object({
  full_name: z.string().min(2, required).max(100, "That name is too long."),
  playa_name: z.string().max(50, "Keep your playa name under 50 characters.").optional().nullable(),
  email: z.string().email(invalidEmail),
  phone: z.string().regex(/^[\d\s\-\+\(\)]*$/, "That phone number looks fake.").optional().nullable(),
})

// Arrival/Departure Section
export const arrivalSchema = z.object({
  arrival_date: z.string().min(1, "Pick an arrival date."),
  arrival_method: z.enum(arrivalMethods, { message: "Pick how you're getting there." }),
  departure_date: z.string().min(1, "Pick a departure date."),
  early_arrival: z.boolean(),
})

// Shelter Section
export const shelterSchema = z.object({
  shelter_type: z.enum(shelterTypes, { message: "What are you sleeping in?" }),
  shelter_length_ft: z.number()
    .min(3, tooSmall)
    .max(50, tooLarge),
  shelter_width_ft: z.number()
    .min(3, tooSmall)
    .max(30, tooLarge),
  shelter_height_ft: z.number()
    .min(3, tooSmall)
    .max(15, "That's too tall. Are you building a tower?")
    .optional()
    .nullable(),
  orientation_preference: z.enum(orientationPreferences).optional().nullable(),
})

// Infrastructure Section
export const infrastructureSchema = z.object({
  power_required: z.boolean(),
  power_type: z.enum(powerTypes),
  shade_required: z.boolean(),
  special_requests: z.string().max(500, "Keep requests under 500 characters.").optional().nullable(),
})

// Participation Section
export const participationSchema = z.object({
  kitchen_participation: z.boolean(),
  preferred_shift_types: z.array(z.enum(shiftTypes)).min(1, "Pick at least one shift type."),
  strike_participation: z.boolean(),
})

// Skills Section
export const skillsSchema = z.object({
  skills: z.array(z.enum(skillTags)),
  custom_skills: z.string().max(200, "Keep custom skills brief.").optional().nullable(),
})

// Build Week Section
export const buildWeekSchema = z.object({
  build_week_attending: z.boolean(),
  build_week_arrival_date: z.string().optional().nullable(),
  tools_bringing: z.array(z.string()).optional(),
  vehicle_info: z.string().max(200, "Keep vehicle info concise.").optional().nullable(),
}).refine(
  (data) => !data.build_week_attending || data.build_week_arrival_date,
  { message: "If you're coming for build week, tell us when.", path: ['build_week_arrival_date'] }
)

// Vehicle Intention
export const vehicleOptions = ['no_vehicle', 'want_to_discuss'] as const

// Safety & Medical Section
export const safetySchema = z.object({
  emergency_contact: z.string().min(5, "We need a name and number. Example: Mom, 212-555-5555"),
  medical_conditions: z.string().max(500, "Keep it under 500 characters.").optional().nullable(),
  medications: z.string().max(500, "Keep it under 500 characters.").optional().nullable(),
  allergies: z.string().max(500, "Keep it under 500 characters.").optional().nullable(),
  dietary_restrictions: z.string().max(200, "Keep it concise.").optional().nullable(),
})

// About You Section
export const aboutYouSchema = z.object({
  burn_count: z.string().min(1, "Tell us how many burns you've done. Zero is a valid answer."),
  what_attracted_you: z.string().max(500, "Keep it under 500 characters.").optional().nullable(),
  referral_source: z.string().max(200, "Keep it concise.").optional().nullable(),
  character_references: z.string().max(500, "Keep it under 500 characters.").optional().nullable(),
  first_burn_hopes: z.string().max(500, "Keep it under 500 characters.").optional().nullable(),
  volunteer_commitment: z.boolean().refine(val => val === true, {
    message: "Three 2.5-hour shifts is the deal. Everyone contributes.",
  }),
  sober_shifts: z.boolean().refine(val => val === true, {
    message: "Sober during shifts. There's only three of them.",
  }),
  background_check_consent: z.boolean().refine(val => val === true, {
    message: "Background checks are required for all campers.",
  }),
})

// Combined full intake form schema
export const intakeFormSchema = z.object({
  ...identitySchema.shape,
  ...arrivalSchema.shape,
  ...shelterSchema.shape,
  ...infrastructureSchema.shape,
  ...participationSchema.shape,
  ...skillsSchema.shape,
  ...buildWeekSchema.shape,
  ...safetySchema.shape,
  ...aboutYouSchema.shape,
}).refine(
  (data) => new Date(data.departure_date) >= new Date(data.arrival_date),
  { message: "You can't leave before you arrive. Physics exists.", path: ['departure_date'] }
)

export type IntakeFormData = z.infer<typeof intakeFormSchema>

// Admin camper update schema (includes layout fields)
export const adminCamperUpdateSchema = intakeFormSchema.extend({
  layout_x: z.number().optional().nullable(),
  layout_y: z.number().optional().nullable(),
  zone_assignment: z.string().optional().nullable(),
  placement_locked: z.boolean().optional(),
  is_admin: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
})

export type AdminCamperUpdate = z.infer<typeof adminCamperUpdateSchema>

// Kitchen shift schema
export const kitchenShiftSchema = z.object({
  role_id: z.string().uuid("Select a valid role."),
  date: z.string().min(1, "Pick a date."),
  start_time: z.string().min(1, "Set a start time."),
  end_time: z.string().min(1, "Set an end time."),
  min_coverage: z.number().min(1).max(10),
  max_coverage: z.number().min(1).max(10),
  notes: z.string().max(500).optional().nullable(),
}).refine(
  (data) => data.end_time > data.start_time,
  { message: "Shift can't end before it starts. Time is linear.", path: ['end_time'] }
)

export type KitchenShiftData = z.infer<typeof kitchenShiftSchema>

// Build task schema
export const buildTaskSchema = z.object({
  title: z.string().min(3, "Give the task a name.").max(100),
  description: z.string().min(10, "Describe what needs to be done.").max(1000),
  phase: z.number().min(1).max(4),
  category: z.string().min(1, "Pick a category."),
  status: z.enum(['pending', 'active', 'done']),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  dependencies: z.array(z.string().uuid()).optional(),
  required_tools: z.array(z.string()).optional(),
  estimated_hours: z.number().min(0.5).max(100).optional().nullable(),
})

export type BuildTaskData = z.infer<typeof buildTaskSchema>

// Schedule assignment schema
export const scheduleAssignmentSchema = z.object({
  camper_id: z.string().uuid("Select a camper."),
  shift_id: z.string().uuid("Select a shift."),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'no-show']),
  locked: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
})

export type ScheduleAssignmentData = z.infer<typeof scheduleAssignmentSchema>
