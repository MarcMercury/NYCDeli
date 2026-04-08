import { NextRequest } from 'next/server'
import { chatCompletion } from '@/lib/openai'
import { requireAuthAPI } from '@/lib/auth'
import { rateLimit, getClientKey } from '@/lib/rate-limit'

const SYSTEM_PROMPT = `You are a helpful assistant for NYC Deli Rats, a Burning Man theme camp.
Given an idea submission title and body from a camper, help them improve and flesh out their idea.
Return an enhanced version of their idea with:
1. A slightly more descriptive title (keep it concise)
2. A fleshed-out description that keeps their original intent but adds practical detail — what it would look like, what's needed, how it could work at Burning Man
3. 2-3 quick "next steps" to make it happen

Keep the camper's voice and vibe. Don't make it corporate. This is Burning Man — keep it fun, creative, and practical.
Format with clear sections using markdown. Keep the total response under 600 words.`

export async function POST(request: NextRequest) {
  const authResult = await requireAuthAPI()
  if (authResult instanceof Response) return authResult

  const rl = rateLimit(`ai:enhance-idea:${authResult.user.id}`, 10, 60_000)
  if (!rl.success) return rl.response!

  let body: { title: string; body: string; category: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.title || !body.body) {
    return Response.json({ error: 'Title and body required' }, { status: 400 })
  }

  const userPrompt = `Category: ${body.category}
Title: ${body.title}
Description: ${body.body}

Enhance this idea while keeping the original spirit.`

  try {
    const enhanced = await chatCompletion(SYSTEM_PROMPT, userPrompt, {
      maxTokens: 768,
      temperature: 0.8,
    })
    return Response.json({ enhanced })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to enhance idea'
    return Response.json({ error: message }, { status: 500 })
  }
}
