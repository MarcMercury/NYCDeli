import { createClient } from '@/lib/supabase/client'

/**
 * A "tent need" represents a single tent that must be placed on the layout
 * to satisfy one camper (solo) or one sharing group (2–3 campers).
 */
export interface TentNeed {
  id: string
  /** Display label — solo camper name or "A & B" for sharing groups */
  label: string
  /** Tent width in feet (always > 0) */
  width: number
  /** Tent length in feet (always > 0) */
  height: number
  /** True for RV / vehicle / sprinter shelters */
  isRV: boolean
  /** Names of campers this tent serves */
  camperNames: string[]
  /** Number of physical entrance sides (1–4) — taken from the primary camper used for sizing */
  entranceCount: number | null
  /** Which physical side of the tent has the main opening — taken from the primary camper */
  openingSide: 'length' | 'width' | 'both' | null
  /** Tent make/model from the primary camper */
  tentMakeModel: string | null
}

interface CamperRow {
  id: string
  full_name: string
  shelter_type: string | null
  shelter_width_ft: number | null
  shelter_length_ft: number | null
  sharing_tent_with: string | null
  sharing_tent_with_2: string | null
  tent_entrance_count: number | null
  tent_opening_side: 'length' | 'width' | 'both' | null
  tent_make_model: string | null
}

const DEFAULT_TENT_W = 10
const DEFAULT_TENT_L = 10
const DEFAULT_RV_W = 10
const DEFAULT_RV_L = 22

/**
 * Fetch every camper from Supabase and compute the list of individual tents
 * required to house them all. Sharing partners (via sharing_tent_with /
 * sharing_tent_with_2) are collapsed into one tent per group sized to the
 * largest member's tent. Campers with missing/zero dimensions fall back to
 * a 10×10 default so they still get a draggable object.
 */
export async function computeTentNeeds(): Promise<TentNeed[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('campers')
    .select(
      'id, full_name, shelter_type, shelter_width_ft, shelter_length_ft, sharing_tent_with, sharing_tent_with_2, tent_entrance_count, tent_opening_side, tent_make_model',
    )
    .order('full_name')

  if (error || !data) return []
  const rows = data as unknown as CamperRow[]

  // Union-find over both partner columns so 3-person shares (A↔B, A↔C)
  // collapse into a single group.
  const parent = new Map<string, string>()
  for (const r of rows) parent.set(r.id, r.id)
  const find = (id: string): string => {
    let cur = id
    while (parent.get(cur) !== cur) cur = parent.get(cur)!
    let walker = id
    while (parent.get(walker) !== cur) {
      const next = parent.get(walker)!
      parent.set(walker, cur)
      walker = next
    }
    return cur
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  for (const r of rows) {
    for (const partnerId of [r.sharing_tent_with, r.sharing_tent_with_2]) {
      if (!partnerId) continue
      if (!parent.has(partnerId)) continue
      union(r.id, partnerId)
    }
  }

  // Bucket rows by group root
  const groups = new Map<string, CamperRow[]>()
  for (const r of rows) {
    const root = find(r.id)
    const arr = groups.get(root) ?? []
    arr.push(r)
    groups.set(root, arr)
  }

  const tents: TentNeed[] = []
  let counter = 0
  const newId = () => `pending-tent-${Date.now()}-${counter++}`

  for (const members of groups.values()) {
    const names = members.map(m => m.full_name).filter(Boolean)
    if (names.length === 0) continue

    const allRV = members.every(
      m => m.shelter_type === 'rv' || m.shelter_type === 'vehicle',
    )

    if (allRV) {
      // Pick the largest RV dims if any are recorded; otherwise default
      let w = 0
      let l = 0
      let primary: CamperRow | null = null
      for (const m of members) {
        const mw = m.shelter_width_ft ?? 0
        const ml = m.shelter_length_ft ?? 0
        if (mw > 0 && ml > 0 && mw * ml > w * l) {
          w = mw
          l = ml
          primary = m
        }
      }
      if (!primary) primary = members[0] ?? null
      tents.push({
        id: newId(),
        label: `${names.join(' & ')} (RV)`,
        width: w > 0 ? w : DEFAULT_RV_W,
        height: l > 0 ? l : DEFAULT_RV_L,
        isRV: true,
        camperNames: names,
        entranceCount: primary?.tent_entrance_count ?? null,
        openingSide: primary?.tent_opening_side ?? null,
        tentMakeModel: primary?.tent_make_model ?? null,
      })
      continue
    }

    // Tent: largest dims among non-RV members
    let bestW = 0
    let bestL = 0
    let primary: CamperRow | null = null
    for (const m of members) {
      if (m.shelter_type === 'rv' || m.shelter_type === 'vehicle') continue
      const w = m.shelter_width_ft ?? 0
      const l = m.shelter_length_ft ?? 0
      if (w > 0 && l > 0 && w * l > bestW * bestL) {
        bestW = w
        bestL = l
        primary = m
      }
    }
    if (bestW <= 0 || bestL <= 0) {
      bestW = DEFAULT_TENT_W
      bestL = DEFAULT_TENT_L
    }
    if (!primary) {
      primary = members.find(m => m.shelter_type !== 'rv' && m.shelter_type !== 'vehicle') ?? members[0] ?? null
    }

    tents.push({
      id: newId(),
      label: names.join(' & '),
      width: bestW,
      height: bestL,
      isRV: false,
      camperNames: names,
      entranceCount: primary?.tent_entrance_count ?? null,
      openingSide: primary?.tent_opening_side ?? null,
      tentMakeModel: primary?.tent_make_model ?? null,
    })
  }

  // Sort largest-first so the trickiest spots are placed first
  tents.sort((a, b) => b.width * b.height - a.width * a.height)
  return tents
}
