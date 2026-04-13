import { NextRequest, NextResponse } from 'next/server'
import { chatCompletion, sanitizeForPrompt } from '@/lib/openai'
import { createTextTo3DTask, registerTaskOwner } from '@/lib/meshy'
import { requireAuthAPI } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

interface GenerateRequest {
  object_type: string
  label: string
  width_ft: number
  height_ft: number
  color: string
  properties: Record<string, unknown>
}

// Use OpenAI to create a rich 3D-optimized prompt, then send to Meshy for generation
export async function POST(request: NextRequest) {
  const authResult = await requireAuthAPI()
  if (authResult instanceof Response) return authResult

  const rl = rateLimit(`3d-model:${authResult.user.id}`, 5, 60_000)
  if (!rl.success) return rl.response!

  try {
    const body = (await request.json()) as GenerateRequest
    const { object_type, label, width_ft, height_ft, color, properties } = body

    if (!object_type) {
      return NextResponse.json({ error: 'object_type is required' }, { status: 400 })
    }

    // Step 1: Use OpenAI to generate a detailed 3D model description
    const systemPrompt = `You are a 3D model prompt engineer. Given a camp object description from a Burning Man camp layout, create a concise but detailed prompt for a text-to-3D AI model generator (Meshy AI).

Rules:
- Describe the physical appearance, materials, and style
- Keep it under 200 words
- Focus on visual geometry and texture, not function
- Style: desert/playa festival aesthetic — dusty, sun-bleached, rugged, creative
- Include material descriptions (wood, metal, canvas, etc.)
- Do NOT include background or environment — just the object itself
- Return ONLY the prompt text, nothing else`

    const userPrompt = `Generate a 3D model prompt for this Burning Man camp object:
- Type: ${sanitizeForPrompt(object_type).replace(/_/g, ' ')}
- Label: "${sanitizeForPrompt(label)}"
- Real-world size: ${width_ft}ft × ${height_ft}ft
- Base color: ${sanitizeForPrompt(color)}
- Elevation/height: ${properties?.elevation_ft || 'standard'}ft tall
- Roof shape: ${sanitizeForPrompt(properties?.roof_shape) || 'flat'}
- Additional properties: ${sanitizeForPrompt(JSON.stringify(properties))}

Create a prompt that will generate a realistic 3D model of this object as it would appear at Burning Man in the Black Rock Desert.`

    const meshyPrompt = await chatCompletion(systemPrompt, userPrompt, {
      maxTokens: 300,
      temperature: 0.7,
    })

    if (!meshyPrompt) {
      return NextResponse.json({ error: 'Failed to generate 3D description' }, { status: 500 })
    }

    // Step 2: Send to Meshy for 3D model generation
    const taskId = await createTextTo3DTask({
      mode: 'preview',
      prompt: meshyPrompt,
      art_style: 'realistic',
      negative_prompt: 'low quality, blurry, distorted, ugly, deformed',
    })

    // Track ownership so check-3d-model can verify
    registerTaskOwner(taskId, authResult.user.id)

    return NextResponse.json({
      task_id: taskId,
      prompt_used: meshyPrompt,
      object_type,
      label,
    })
  } catch (err) {
    console.error('3D model generation error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
