import { NextRequest, NextResponse } from 'next/server'
import { getTextTo3DTask } from '@/lib/meshy'

// Poll the status of a Meshy 3D generation task
export async function GET(request: NextRequest) {
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
