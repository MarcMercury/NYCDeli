import { NextRequest, NextResponse } from 'next/server'
import { getTextTo3DTask } from '@/lib/meshy'
import { requireAuthAPI } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

// Poll the status of a Meshy 3D generation task
export async function GET(request: NextRequest) {
  const authResult = await requireAuthAPI()
  if (authResult instanceof Response) return authResult

  const rl = rateLimit(`3d-check:${authResult.user.id}`, 60, 60_000)
  if (!rl.success) return rl.response!

  const taskId = request.nextUrl.searchParams.get('task_id')

  if (!taskId) {
    return NextResponse.json({ error: 'task_id is required' }, { status: 400 })
  }

  try {
    const task = await getTextTo3DTask(taskId)

    return NextResponse.json({
      id: task.id,
      status: task.status,
      progress: task.progress,
      model_urls: task.status === 'SUCCEEDED' ? task.model_urls : null,
      thumbnail_url: task.status === 'SUCCEEDED' ? task.thumbnail_url : null,
      video_url: task.status === 'SUCCEEDED' ? task.video_url : null,
      error: task.task_error?.message || null,
    })
  } catch (err) {
    console.error('3D model status check error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
