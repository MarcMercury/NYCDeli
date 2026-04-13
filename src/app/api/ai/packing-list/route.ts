import { NextRequest } from 'next/server'
import { chatCompletion, sanitizeCamperForPrompt } from '@/lib/openai'
import { requireAuthAPI } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

const SYSTEM_PROMPT = `You are a packing advisor for NYC Deli Rats, a Burning Man theme camp in Black Rock City, Nevada.
Given a camper's specific details (shelter type, skills, roles, dietary needs, arrival method, etc.), generate a personalized packing list.
The list should include:
1. ESSENTIALS they absolutely need (based on their shelter type and arrival method)
2. ROLE-SPECIFIC items (based on their skills and camp duties)
3. PERSONAL COMFORT items (based on their dietary needs, medical considerations flag)
4. NICE-TO-HAVE items that would make their specific burn better

Format the output as clean markdown with headers and bullet points.
Keep it practical and Burning Man-specific. Reference playa conditions (dust, heat, cold nights, no water).
Do NOT include items the camp provides communally (kitchen gear, shade structures, generators).
Be specific — "1-gallon insulated water jug" not just "water container".
Keep the total list to ~30-40 items max. Don't repeat items across categories.
Never mention specific medical items — just remind them to bring prescribed medications if flagged.`

export async function POST(request: NextRequest) {
  const authResult = await requireAuthAPI()
  if (authResult instanceof Response) return authResult

  const rl = rateLimit(`ai:packing-list:${authResult.user.id}`, 5, 60_000)
  if (!rl.success) return rl.response!

  let body: { camper: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.camper) {
    return Response.json({ error: 'Missing camper data' }, { status: 400 })
  }

  const c = sanitizeCamperForPrompt(body.camper)
  const hasMedical = !!(body.camper.medical_conditions || body.camper.medications)

  const userPrompt = `Generate a personalized Burning Man packing list for this camper:

Name: ${c.full_name || 'Camper'}
Shelter Type: ${c.shelter_type || 'tent'}
Shelter Dimensions: ${c.shelter_length_ft}×${c.shelter_width_ft} ft
Arrival Method: ${c.arrival_method || 'car'}
Early Arrival (Build Week): ${c.early_arrival || 'No'}
Build Week Attending: ${c.build_week_attending || 'No'}
Tools Bringing: ${c.tools_bringing || 'None yet'}
Skills: ${c.skills || 'None listed'}
Kitchen Participation: ${c.kitchen_participation || 'No'}
Preferred Shifts: ${c.preferred_shift_types || 'Any'}
Power Needs: ${c.power_type || 'none'}
Dietary Restrictions: ${c.dietary_restrictions || 'None'}
Has Prescribed Medications: ${hasMedical ? 'Yes — remind to bring medications' : 'No'}
Vehicle: ${c.vehicle_info || 'None — limited space'}

Generate the personalized packing list.`

  try {
    const packingList = await chatCompletion(SYSTEM_PROMPT, userPrompt, {
      maxTokens: 1024,
      temperature: 0.6,
    })
    return Response.json({ packingList })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate packing list'
    return Response.json({ error: message }, { status: 500 })
  }
}
