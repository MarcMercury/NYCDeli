import { NextRequest } from 'next/server'
import { chatCompletion } from '@/lib/openai'
import { requireAuthAPI } from '@/lib/auth'
import { rateLimit, getClientKey } from '@/lib/rate-limit'

const SYSTEM_PROMPT = `You are the admin assistant for NYC Deli Rats, a ~70-person Burning Man theme camp. 
You help camp leadership quickly evaluate applicants by summarizing their registration data into a concise, actionable overview.

Your summary should be 3-5 sentences covering:
1. Who they are (name, burn experience, referral)
2. What they bring to camp (skills, tools, participation commitments)
3. Logistics snapshot (shelter type/size, arrival method, power needs)
4. Any flags — positive (build week, early arrival, many skills) or concerning (no volunteer commitment, no sober shifts, no background check consent, missing emergency contact)

Use a direct, no-BS New York tone. Be honest but not cruel. Flag missing/concerning items clearly.
Do NOT include medical details — just note if they have medical considerations listed (yes/no).`

export async function POST(request: NextRequest) {
  const authResult = await requireAuthAPI()
  if (authResult instanceof Response) return authResult

  const rl = rateLimit(`ai:applicant-summary:${authResult.user.id}`, 10, 60_000)
  if (!rl.success) return rl.response!

  let body: { camper: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const c = body.camper
  if (!c) {
    return Response.json({ error: 'Missing camper data' }, { status: 400 })
  }

  // Sanitize: strip medical details from prompt, just include flags
  const hasMedical = !!(c.medical_conditions || c.medications || c.allergies)

  const userPrompt = `Summarize this applicant for admin review:

Name: ${c.full_name || 'Unknown'}
Playa Name: ${c.playa_name || 'None'}
Email: ${c.email || 'Unknown'}
Burn Count: ${c.burn_count || 'Not specified'}
What Attracted Them: ${c.what_attracted_you || 'Not provided'}
Referral: ${c.referral_source || 'Not provided'}
References: ${c.character_references || 'Not provided'}
First Burn Hopes: ${c.first_burn_hopes || 'N/A'}

Shelter: ${c.shelter_type} (${c.shelter_length_ft}×${c.shelter_width_ft} ft)
Arrival: ${c.arrival_date} via ${c.arrival_method}
Departure: ${c.departure_date}
Early Arrival: ${c.early_arrival ? 'Yes' : 'No'}
Power Needs: ${c.power_type} (required: ${c.power_required ? 'Yes' : 'No'})
Shade Required: ${c.shade_required ? 'Yes' : 'No'}

Skills: ${Array.isArray(c.skills) ? c.skills.join(', ') : 'None listed'}
Custom Skills: ${c.custom_skills || 'None'}
Kitchen Participation: ${c.kitchen_participation ? 'Yes' : 'No'}
Preferred Shifts: ${Array.isArray(c.preferred_shift_types) ? c.preferred_shift_types.join(', ') : 'Any'}
Strike Participation: ${c.strike_participation ? 'Yes' : 'No'}
Build Week: ${c.build_week_attending ? 'Yes' : 'No'}
Tools Bringing: ${Array.isArray(c.tools_bringing) && c.tools_bringing.length > 0 ? c.tools_bringing.join(', ') : 'None'}
Vehicle: ${c.vehicle_info || 'None'}

Volunteer Commitment: ${c.volunteer_commitment ? 'Yes' : 'No'}
Sober Shifts Agreement: ${c.sober_shifts ? 'Yes' : 'No'}
Background Check Consent: ${c.background_check_consent ? 'Yes' : 'No'}
Emergency Contact Provided: ${c.emergency_contact_name ? 'Yes' : 'No'}
Has Medical Considerations: ${hasMedical ? 'Yes' : 'No'}
Dietary Restrictions: ${c.dietary_restrictions || 'None'}
Special Requests: ${c.special_requests || 'None'}`

  try {
    const summary = await chatCompletion(SYSTEM_PROMPT, userPrompt, {
      maxTokens: 512,
      temperature: 0.6,
    })
    return Response.json({ summary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate summary'
    return Response.json({ error: message }, { status: 500 })
  }
}
