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
