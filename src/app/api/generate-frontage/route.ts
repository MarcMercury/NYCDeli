import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { requireAuthAPI } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

interface FrontageObject {
  object_type: string
  label: string
  x: number
  y: number
  width_ft: number
  height_ft: number
  rotation: number
  color: string
  properties: Record<string, unknown>
}

interface FrontageRequest {
  objects: FrontageObject[]
  config: {
    width_ft: number
    length_ft: number
    camp_name: string | null
    frontage_sides: string[]
    border_label_south?: string | null
  }
}

// Map object types to realistic visual descriptions
function describeObject(obj: FrontageObject): string | null {
  const w = obj.width_ft
  const h = obj.height_ft
  const elevation = (obj.properties?.elevation_ft as number) || null
  const roofShape = (obj.properties?.roof_shape as string) || null
  const label = obj.label

  const heightStr = elevation ? `${elevation}ft tall` : ''

  switch (obj.object_type) {
    case 'tent':
      return `a ${w}x${h}ft camping tent ${heightStr || '(~7ft tall)'} with ${roofShape === 'dome' ? 'a dome shape' : roofShape === 'a_frame' ? 'an A-frame peak' : 'a peaked canvas roof'}, labeled "${label}"`
    case 'shade_structure':
      return `a ${w}x${h}ft shade canopy ${heightStr || '(~10ft tall)'} with metal corner poles and fabric top`
    case 'common_area':
      return `a large ${w}x${h}ft open communal gathering space under shade structures ${heightStr}`
    case 'stage':
      return `a ${w}x${h}ft wooden performance stage ${heightStr || '(~4ft raised)'} with a backdrop`
    case 'bar':
      return `a ${w}x${h}ft bar counter made of plywood with a shade canopy over it, labeled "${label}"`
    case 'art_car':
      return `a colorful mutant art vehicle parked, approximately ${w}x${h}ft`
    case 'kitchen':
      return `a ${w}x${h}ft outdoor camp kitchen area ${heightStr} with countertops, shelving, and a shade canopy`
    case 'grill':
      return `a propane grill station (${w}x${h}ft)`
    case 'prep_area':
      return `a food prep table with cutting boards (${w}x${h}ft)`
    case 'service_area':
      return `a food service window/counter (${w}x${h}ft)`
    case 'storage':
      return `storage bins and shelving unit (${w}x${h}ft)`
    case 'refrigerated_truck':
      return `a white ${w}ft-long refrigerated box truck`
    case 'porta_potty':
      return `a blue portable toilet unit`
    case 'generator':
      return `an industrial generator on the ground (${w}x${h}ft)`
    case 'water_station':
      return `a water tank/station with jugs (${w}x${h}ft)`
    case 'first_aid':
      return `a first aid tent with a red cross sign (${w}x${h}ft)`
    case 'fire_pit':
      return `a communal fire pit area (${w}ft diameter) with seating around it`
    case 'bike_parking':
      return `a bike rack area with several bicycles (${w}x${h}ft)`
    case 'rv':
      return `a large RV/camper van (${w}x${h}ft)`
    case 'pc_container':
      return `a shipping container (${w}x${h}ft) with PC# markings`
    case 'vehicle':
      return `a parked vehicle (${w}x${h}ft)`
    case 'entrance':
      return `a camp entrance archway/gate (${w}ft wide) with signage`
    case 'fence':
      return `a fence/barrier segment (${w}ft long)`
    case 'sign':
      return `a camp sign reading "${(obj.properties?.sign_text as string) || label}"`
    case 'fire_lane':
    case 'road':
    case 'path_of_travel':
    case 'distance_marker':
    case 'neighbor_zone':
    case 'fire_extinguisher':
    case 'fuel_storage':
    case 'propane_storage':
    case 'flame_effect':
      return null // Skip non-visual / tiny items for the frontage view
    case 'shower_container':
      return `a shower container unit (${w}x${h}ft)`
    case 'swamp_cooler':
      return `an evaporative cooler unit`
    case 'greywater_tank':
      return `a grey water collection tank`
    case 'sink_hose':
      return `a portable sink station`
    case 'trash_receptacle':
      return `a large trash/recycling bin`
    case 'table':
      return `a folding table (${w}x${h}ft)`
    default:
      return `a ${label} structure (${w}x${h}ft)`
  }
}

function buildPrompt(data: FrontageRequest): string {
  const { objects, config } = data

  // Sort objects by Y position (south = highest Y values are closest to viewer)
  // and by X position (left to right)
  const sorted = [...objects].sort((a, b) => {
    // Objects at higher Y are closer to south (foreground)
    if (Math.abs(b.y - a.y) > 10) return b.y - a.y
    return a.x - b.x
  })

  // Group into foreground (south half) and background (north half)
  const midY = config.length_ft / 2
  const foreground = sorted.filter(o => o.y >= midY)
  const background = sorted.filter(o => o.y < midY)

  const descForeground = foreground
    .map(describeObject)
    .filter(Boolean)
  const descBackground = background
    .map(describeObject)
    .filter(Boolean)

  const campName = config.camp_name || 'Burning Man theme camp'
  const totalWidth = config.width_ft

  let prompt = `Photorealistic wide-angle photograph of a Burning Man theme camp called "${campName}" as seen from the front (south side looking north). `
  prompt += `The camp is ${totalWidth}ft wide. The scene is set on the flat alkaline playa desert of Black Rock City, Nevada — cracked beige-white dirt ground, harsh midday desert sun with hazy sky, distant mountains on the horizon. `
  prompt += `The style should be a documentary photograph taken at Burning Man — slightly dusty atmosphere, warm golden light, vivid colors against the stark desert. `

  if (descForeground.length > 0) {
    prompt += `\n\nIn the foreground (closest to the viewer): ${descForeground.join('; ')}. `
  }

  if (descBackground.length > 0) {
    prompt += `\n\nIn the background (further from viewer, toward the center of camp): ${descBackground.join('; ')}. `
  }

  prompt += `\n\nAll structures are temporary festival installations — think colorful tarps, ratchet straps, rebar stakes, PVC frames, shade cloth, LED strips, and whimsical hand-painted signs. `
  prompt += `The ground is flat cracked playa dust with no grass or pavement. `
  prompt += `Show the camp in a wide establishing shot to capture the full frontage. No people in the scene. Golden hour desert lighting.`

  // Truncate to DALL-E 3 max of 4000 chars
  if (prompt.length > 4000) {
    prompt = prompt.slice(0, 3990) + '...'
  }

  return prompt
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthAPI()
  if (authResult instanceof Response) return authResult

  const rl = rateLimit(`frontage:${authResult.user.id}`, 3, 60_000)
  if (!rl.success) return rl.response!

  const apiKey = process.env.OPENAI_API_KEY
  const projectId = process.env.OPENAI_PROJECT_ID
  if (!apiKey) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not configured. Add it to your .env.local file.' },
      { status: 500 }
    )
  }

  let body: FrontageRequest
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.objects || !body.config) {
    return Response.json({ error: 'Missing objects or config in request' }, { status: 400 })
  }

  const prompt = buildPrompt(body)

  try {
    const openai = new OpenAI({ apiKey, project: projectId })

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024',
      quality: 'hd',
      style: 'natural',
    })

    const imageUrl = response.data?.[0]?.url
    const revisedPrompt = response.data?.[0]?.revised_prompt

    if (!imageUrl) {
      return Response.json({ error: 'No image was generated' }, { status: 500 })
    }

    return Response.json({ imageUrl, revisedPrompt, prompt })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error generating image'
    return Response.json({ error: message }, { status: 500 })
  }
}
