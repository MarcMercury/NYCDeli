import { NextRequest } from 'next/server'
import { chatCompletion } from '@/lib/openai'

const SYSTEM_PROMPT = `You are the camp placement advisor for NYC Deli Rats, a Burning Man theme camp.
Given a camper's shelter details and a list of available camp spots, recommend the TOP 3 best spots for them.
For each recommendation, explain WHY in one sentence (size fit, power access, shade, accessibility).

Consider:
- Shelter dimensions must fit within the spot's min/max constraints
- Power-hungry setups should be near powered spots
- Shade-seekers should get shaded spots
- RVs and vehicles need large/xlarge spots
- Accessible spots for anyone who might need them

Return ONLY a JSON array of 3 objects: [{"spot_id": "...", "label": "...", "reason": "..."}]
If fewer than 3 spots work, return what you can. If none fit, return an empty array with a note.`

export async function POST(request: NextRequest) {
  let body: {
    camper: Record<string, unknown>
    spots: Array<Record<string, unknown>>
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { camper: c, spots } = body
  if (!c || !spots) {
    return Response.json({ error: 'Missing camper or spots data' }, { status: 400 })
  }

  // Only include available spots
  const available = spots.filter(s => s.is_available && !s.reservation)

  if (available.length === 0) {
    return Response.json({ recommendations: [], note: 'No available spots' })
  }

  // Limit spots sent to AI to avoid token overflow
  const spotSummaries = available.slice(0, 50).map(s => ({
    id: s.id,
    label: `${s.row_label}${s.spot_number}`,
    size: s.size_category,
    width_range: `${s.min_tent_width_ft}-${s.max_tent_width_ft}ft`,
    length_range: `${s.min_tent_length_ft}-${s.max_tent_length_ft}ft`,
    has_power: s.has_power,
    has_shade: s.has_shade,
    is_accessible: s.is_accessible,
  }))

  const userPrompt = `Camper: ${c.full_name}
Shelter: ${c.shelter_type} (${c.shelter_width_ft}W × ${c.shelter_length_ft}L ft)
Power Needs: ${c.power_type} (required: ${c.power_required ? 'Yes' : 'No'})
Shade Required: ${c.shade_required ? 'Yes' : 'No'}

Available spots:
${JSON.stringify(spotSummaries, null, 1)}

Recommend the top 3 best spots. Return JSON only.`

  try {
    const raw = await chatCompletion(SYSTEM_PROMPT, userPrompt, {
      maxTokens: 512,
      temperature: 0.3,
    })

    // Parse the JSON response
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return Response.json({ recommendations: [], note: 'Could not parse recommendations' })
    }

    const recommendations = JSON.parse(jsonMatch[0])
    return Response.json({ recommendations })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate recommendations'
    return Response.json({ error: message }, { status: 500 })
  }
}
