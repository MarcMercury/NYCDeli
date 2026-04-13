import { NextRequest } from 'next/server'
import { chatCompletion, sanitizeCamperForPrompt } from '@/lib/openai'
import { requireAuthAPI } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

const SYSTEM_PROMPT = `You are a fun, witty bio writer for NYC Deli Rats, a Burning Man theme camp.
Given a camper's registration data, write a short, engaging camp bio (2-4 sentences, max 400 chars).
The bio should be written in first person and feel authentic — like the camper wrote it themselves.
Incorporate their skills, burn experience, and personality hints from their answers.
Keep the tone playful and warm — we're a community. Don't be generic.
Never mention medical info, emergency contacts, or anything sensitive.`

export async function POST(request: NextRequest) {
  const authResult = await requireAuthAPI()
  if (authResult instanceof Response) return authResult

  const rl = rateLimit(`ai:generate-bio:${authResult.user.id}`, 10, 60_000)
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

  const userPrompt = `Write a camp bio for this person:

Name: ${c.full_name || 'Unknown'}
Playa Name: ${c.playa_name || 'None yet'}
Burn Count: ${c.burn_count || 'First burn'}
What Attracted Them to Deli Rats: ${c.what_attracted_you || 'Not specified'}
First Burn Hopes: ${c.first_burn_hopes || 'N/A'}
Skills: ${c.skills || 'None listed'}
Custom Skills: ${c.custom_skills || 'None'}
Kitchen Participation: ${c.kitchen_participation || 'No'}
Build Week: ${c.build_week_attending || 'No'}
Tools Bringing: ${c.tools_bringing || 'None'}
Shelter Type: ${c.shelter_type || 'Not specified'}

Write in first person. Keep it under 400 characters. Make it fun.`

  try {
    const bio = await chatCompletion(SYSTEM_PROMPT, userPrompt, {
      maxTokens: 256,
      temperature: 0.85,
    })
    return Response.json({ bio })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate bio'
    return Response.json({ error: message }, { status: 500 })
  }
}
