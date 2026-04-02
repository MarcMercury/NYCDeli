import { NextRequest } from 'next/server'
import { chatCompletion } from '@/lib/openai'

const SYSTEM_PROMPT = `You are a fun, witty bio writer for NYC Deli Rats, a Burning Man theme camp.
Given a camper's registration data, write a short, engaging camp bio (2-4 sentences, max 400 chars).
The bio should be written in first person and feel authentic — like the camper wrote it themselves.
Incorporate their skills, burn experience, and personality hints from their answers.
Keep the tone playful and warm — we're a community. Don't be generic.
Never mention medical info, emergency contacts, or anything sensitive.`

export async function POST(request: NextRequest) {
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

  const userPrompt = `Write a camp bio for this person:

Name: ${c.full_name || 'Unknown'}
Playa Name: ${c.playa_name || 'None yet'}
Burn Count: ${c.burn_count || 'First burn'}
What Attracted Them to Deli Rats: ${c.what_attracted_you || 'Not specified'}
First Burn Hopes: ${c.first_burn_hopes || 'N/A'}
Skills: ${Array.isArray(c.skills) ? c.skills.join(', ') : 'None listed'}
Custom Skills: ${c.custom_skills || 'None'}
Kitchen Participation: ${c.kitchen_participation ? 'Yes' : 'No'}
Build Week: ${c.build_week_attending ? 'Yes' : 'No'}
Tools Bringing: ${Array.isArray(c.tools_bringing) && c.tools_bringing.length > 0 ? c.tools_bringing.join(', ') : 'None'}
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
