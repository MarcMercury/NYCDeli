import { NextRequest } from 'next/server'
import { requireAuthAPI } from '@/lib/auth'
import { buildPdf } from '@/lib/pdf'
import {
  COMPLETE_SET_SLUG,
  SHADE_INSTRUCTION_SHEETS,
  getSheet,
  pdfFileName,
} from '@/lib/shade-instructions'

const RUNNING_HEAD = 'NYC DELI RATS 2026 - SHADE STRUCTURE ERECTION'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireAuthAPI()
  if (auth instanceof Response) return auth

  const { slug } = await params

  const sheets =
    slug === COMPLETE_SET_SLUG
      ? SHADE_INSTRUCTION_SHEETS
      : (() => {
          const sheet = getSheet(slug)
          return sheet ? [sheet] : null
        })()

  if (!sheets) return Response.json({ error: 'Unknown instruction sheet' }, { status: 404 })

  const bytes = buildPdf({ runningHead: RUNNING_HEAD, sheets })

  return new Response(bytes as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfFileName(slug)}"`,
      'Cache-Control': 'private, max-age=300',
    },
  })
}
