// Meshy AI 3D Model Generation API Client
// https://docs.meshy.ai/

const MESHY_API_BASE = 'https://api.meshy.ai/openapi'

// ─── Task ownership tracking (in-memory, suitable for ~70 campers) ──
// Maps taskId → userId so we can verify ownership on status checks
const taskOwnership = new Map<string, string>()

// Clean up expired entries every 10 minutes (tasks are short-lived)
setInterval(() => {
  // Keep map size bounded; tasks older than 1 hour are stale
  if (taskOwnership.size > 500) taskOwnership.clear()
}, 600_000)

export function registerTaskOwner(taskId: string, userId: string): void {
  taskOwnership.set(taskId, userId)
}

export function verifyTaskOwner(taskId: string, userId: string): boolean {
  const owner = taskOwnership.get(taskId)
  // If no owner recorded (e.g. server restart), allow access
  if (!owner) return true
  return owner === userId
}

function getMeshyApiKey(): string {
  const key = process.env.MESHY_API_KEY
  if (!key) throw new Error('MESHY_API_KEY is not configured')
  return key
}

// ─── Types ─────────────────────────────────────────────────────

export type MeshyTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED'

export interface MeshyTextTo3DRequest {
  mode: 'preview' | 'refine'
  prompt: string
  art_style?: 'realistic' | 'sculpture'
  negative_prompt?: string
  topology?: 'triangle' | 'quad'
  target_polycount?: number
}

export interface MeshyTextTo3DResponse {
  result: string // task_id
}

export interface MeshyTaskResult {
  id: string
  model_urls: {
    glb: string
    fbx: string
    obj: string
    mtl: string
  }
  thumbnail_url: string
  video_url: string | null
  texture_urls: Array<{ base_color: string }>
  status: MeshyTaskStatus
  created_at: number
  started_at: number
  finished_at: number
  progress: number
  task_error: { message: string } | null
}

export interface MeshyImageTo3DRequest {
  image_url: string
  enable_pbr?: boolean
  topology?: 'triangle' | 'quad'
  target_polycount?: number
}

// ─── API Functions ─────────────────────────────────────────────

async function meshyFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getMeshyApiKey()
  const url = `${MESHY_API_BASE}${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meshy API error (${res.status}): ${body}`)
  }

  return res.json()
}

/**
 * Start a text-to-3D generation task.
 * Returns the task ID for polling.
 */
export async function createTextTo3DTask(
  request: MeshyTextTo3DRequest
): Promise<string> {
  const data = await meshyFetch<MeshyTextTo3DResponse>('/v2/text-to-3d', {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return data.result
}

/**
 * Check the status of a text-to-3D task.
 */
export async function getTextTo3DTask(taskId: string): Promise<MeshyTaskResult> {
  return meshyFetch<MeshyTaskResult>(`/v2/text-to-3d/${encodeURIComponent(taskId)}`)
}

/**
 * Start an image-to-3D generation task.
 * Returns the task ID for polling.
 */
export async function createImageTo3DTask(
  request: MeshyImageTo3DRequest
): Promise<string> {
  const data = await meshyFetch<{ result: string }>('/v1/image-to-3d', {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return data.result
}

/**
 * Check the status of an image-to-3D task.
 */
export async function getImageTo3DTask(taskId: string): Promise<MeshyTaskResult> {
  return meshyFetch<MeshyTaskResult>(`/v1/image-to-3d/${encodeURIComponent(taskId)}`)
}
