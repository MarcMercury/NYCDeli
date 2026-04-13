import OpenAI from 'openai'

let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
    _client = new OpenAI({
      apiKey,
      project: process.env.OPENAI_PROJECT_ID,
    })
  }
  return _client
}

/**
 * Sanitize user-controlled text before embedding in AI prompts.
 * Strips characters/patterns that could be used for prompt injection.
 */
export function sanitizeForPrompt(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  return str
    // Strip control characters except newline/tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Collapse sequences of newlines that could simulate prompt structure
    .replace(/\n{3,}/g, '\n\n')
    // Limit length to prevent token abuse
    .slice(0, 2000)
}

/**
 * Sanitize a record of values for prompt inclusion.
 */
export function sanitizeCamperForPrompt(camper: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(camper)) {
    if (Array.isArray(value)) {
      result[key] = value.map(v => sanitizeForPrompt(v)).join(', ')
    } else {
      result[key] = sanitizeForPrompt(value)
    }
  }
  return result
}

export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const client = getOpenAIClient()
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: opts?.maxTokens ?? 1024,
    temperature: opts?.temperature ?? 0.7,
  })
  return response.choices[0]?.message?.content?.trim() || ''
}
