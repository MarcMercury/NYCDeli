import { NextRequest } from 'next/server'
import { requireAuthAPI } from '@/lib/auth'
import { buildGuidePdf } from '@/lib/pdf'
import { getShadeSheets } from '@/lib/shade-guide-art'
import { COMPLETE_SET_SLUG, pdfFileName } from '@/lib/shade-instructions'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireAuthAPI()
  if (auth instanceof Response) return auth

  const { slug } = await params
  const all = getShadeSheets()
  const sheets = slug === COMPLETE_SET_SLUG ? all : all.filter(s => s.slug === slug)

  if (sheets.length === 0) {
    return Response.json({ error: 'Unknown instruction sheet' }, { status: 404 })
  }

  const bytes = buildGuidePdf(sheets)

  return new Response(bytes as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfFileName(slug)}"`,
      'Cache-Control': 'private, max-age=300',
    },
  })
}
