import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAPI } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import {
  CURRENT_BM_YEAR,
  BurningManApiError,
  fetchCamps,
  fetchCampByUid,
  fetchArt,
  fetchArtByUid,
  fetchEvents,
  fetchEventByUid,
  fetchMutantVehicles,
  fetchMutantVehicleByUid,
  type BMResourceType,
} from '@/lib/burningman'

const VALID_TYPES: BMResourceType[] = ['camp', 'art', 'event', 'mv']

// Proxies the Burning Man Public API so the API key stays server-side.
// GET /api/burningman?type=camp|art|event|mv&year=2026&search=&uid=&category=&program=
export async function GET(request: NextRequest) {
  const authResult = await requireAuthAPI()
  if (authResult instanceof Response) return authResult

  const rl = rateLimit(`bm:${authResult.user.id}`, 60, 60_000)
  if (!rl.success) return rl.response!

  const sp = request.nextUrl.searchParams
  const type = sp.get('type') as BMResourceType | null

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type is required and must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 },
    )
  }

  const uid = sp.get('uid') || undefined
  const search = sp.get('search') || undefined
  const category = sp.get('category') || undefined
  const program = sp.get('program') || undefined

  const yearParam = sp.get('year')
  const year = yearParam ? Number(yearParam) : CURRENT_BM_YEAR
  if (Number.isNaN(year)) {
    return NextResponse.json({ error: 'year must be a number' }, { status: 400 })
  }

  try {
    let data: unknown
    switch (type) {
      case 'camp':
        data = uid ? await fetchCampByUid(uid) : await fetchCamps(year, search)
        break
      case 'art':
        data = uid ? await fetchArtByUid(uid) : await fetchArt(year, { category, program, search })
        break
      case 'event':
        data = uid ? await fetchEventByUid(uid) : await fetchEvents(year)
        break
      case 'mv':
        data = uid ? await fetchMutantVehicleByUid(uid) : await fetchMutantVehicles(year, search)
        break
    }
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof BurningManApiError) {
      // Pass through 404 (not found) and 429 (rate limited) semantics.
      const status = err.status === 404 || err.status === 429 ? err.status : 502
      return NextResponse.json({ error: err.message }, { status })
    }
    console.error('Burning Man API proxy error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
