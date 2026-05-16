import type { FloorplanObjectRow } from '@/types/database'

/**
 * A support post on a shade structure, expressed in the object's local
 * coordinate frame (0..width_ft on x, 0..height_ft on y, origin at top-left
 * before rotation).
 *
 * `shared` is true when another shade_structure has a post at the same world
 * position. In that case the post is "owned" by the structure with the
 * lexicographically smallest id — only the owner should render it (and may
 * render it differently to visually signal that it is shared).
 *
 * `owned` is true when this object is the owner of the (possibly shared) post.
 * Non-owners of a shared post should skip rendering it entirely.
 */
export interface ShadePost {
  xLocal: number
  yLocal: number
  shared: boolean
  owned: boolean
}

const DEFAULT_SPACING_FT = 10
// Posts whose world positions are within this many feet are treated as the
// same physical post (they are nominally on the grid so half a foot is plenty).
const MERGE_TOLERANCE_FT = 0.5

function stops(len: number, spacing: number): number[] {
  const arr: number[] = [0]
  for (let v = spacing; v < len - 0.001; v += spacing) arr.push(v)
  arr.push(len)
  return arr
}

function localToWorld(
  obj: FloorplanObjectRow,
  lx: number,
  ly: number,
): { wx: number; wy: number } {
  const cx = obj.x + obj.width_ft / 2
  const cy = obj.y + obj.height_ft / 2
  const dx = lx - obj.width_ft / 2
  const dy = ly - obj.height_ft / 2
  const rad = ((obj.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { wx: cx + dx * cos - dy * sin, wy: cy + dx * sin + dy * cos }
}

/**
 * Compute support posts for every shade_structure in the layout. Posts sit at
 * every corner and every `spacingFt` along each perimeter edge. When two
 * structures share an edge or corner the overlapping posts collapse to a
 * single shared post owned by the structure with the smallest id.
 */
export function computeShadePosts(
  objects: FloorplanObjectRow[],
  spacingFt: number = DEFAULT_SPACING_FT,
): Map<string, ShadePost[]> {
  const shades = objects
    .filter(o => o.object_type === 'shade_structure')
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  const keyOf = (wx: number, wy: number) =>
    `${Math.round(wx / MERGE_TOLERANCE_FT)}_${Math.round(wy / MERGE_TOLERANCE_FT)}`

  // Pass 1: gather every post in world space, find owners and detect shares.
  const ownerByKey = new Map<string, string>()
  const countByKey = new Map<string, number>()
  const perObject = new Map<
    string,
    Array<{ xLocal: number; yLocal: number; key: string }>
  >()

  for (const o of shades) {
    const xs = stops(o.width_ft, spacingFt)
    const ys = stops(o.height_ft, spacingFt)
    const seen = new Set<string>()
    const points: Array<{ xLocal: number; yLocal: number; key: string }> = []
    const push = (lx: number, ly: number) => {
      const local = `${lx.toFixed(3)}_${ly.toFixed(3)}`
      if (seen.has(local)) return
      seen.add(local)
      const { wx, wy } = localToWorld(o, lx, ly)
      const key = keyOf(wx, wy)
      points.push({ xLocal: lx, yLocal: ly, key })
    }
    xs.forEach(x => {
      push(x, 0)
      push(x, o.height_ft)
    })
    ys.forEach(y => {
      push(0, y)
      push(o.width_ft, y)
    })

    perObject.set(o.id, points)

    // Track owner per key (smallest id wins because we sorted above).
    const localSeenKeys = new Set<string>()
    for (const p of points) {
      if (!ownerByKey.has(p.key)) ownerByKey.set(p.key, o.id)
      if (!localSeenKeys.has(p.key)) {
        localSeenKeys.add(p.key)
        countByKey.set(p.key, (countByKey.get(p.key) ?? 0) + 1)
      }
    }
  }

  // Pass 2: emit per-object post lists with sharing flags.
  const result = new Map<string, ShadePost[]>()
  for (const o of shades) {
    const points = perObject.get(o.id) ?? []
    result.set(
      o.id,
      points.map(p => {
        const shared = (countByKey.get(p.key) ?? 1) > 1
        const owned = ownerByKey.get(p.key) === o.id
        return { xLocal: p.xLocal, yLocal: p.yLocal, shared, owned }
      }),
    )
  }
  return result
}

/**
 * Total physical post count after collapsing shared posts.
 */
export function countUniquePosts(
  objects: FloorplanObjectRow[],
  spacingFt: number = DEFAULT_SPACING_FT,
): number {
  const map = computeShadePosts(objects, spacingFt)
  let n = 0
  for (const posts of map.values()) {
    for (const p of posts) if (p.owned) n++
  }
  return n
}
