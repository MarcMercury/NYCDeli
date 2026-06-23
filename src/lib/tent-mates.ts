/**
 * Resolve every camper that shares a tent with the target camper.
 *
 * The `campers` table stores tent-sharing as two nullable self-referencing
 * FKs (`sharing_tent_with`, `sharing_tent_with_2`). Either side of a pair
 * may be the one to set the link, so a complete tentmate list requires:
 *   1. Both of the target's own slots.
 *   2. Any other camper whose slot points back at the target (reverse refs).
 *   3. Transitive walking — if A shares with B and B shares with C, A and C
 *      are tentmates too even though A never named C directly.
 *
 * This mirrors the union-find logic in `src/lib/tent-needs.ts` /
 * `src/components/floorplan/tent-size-summary.tsx` so the directory, admin
 * panel, and layout builder all agree on who is in which tent.
 */

import { buildTentShareGroups } from '@/lib/union-find'

export interface TentMateRow {
  id: string
  sharing_tent_with: string | null
  sharing_tent_with_2: string | null
  sharing_tent_with_3?: string | null
  sharing_tent_with_4?: string | null
  sharing_tent_with_5?: string | null
}

/** All camper IDs that share a tent with `camperId` (excludes `camperId` itself). */
export function resolveTentMateIds<T extends TentMateRow>(
  camperId: string,
  campers: readonly T[],
): string[] {
  if (!camperId) return []

  const byId = new Map<string, T>()
  for (const c of campers) byId.set(c.id, c)
  if (!byId.has(camperId)) return []

  // Union-find over both sharing slots (shared with src/lib/tent-needs.ts).
  const uf = buildTentShareGroups(campers)

  const root = uf.find(camperId)
  const mates: string[] = []
  for (const c of campers) {
    if (c.id === camperId) continue
    if (uf.find(c.id) === root) mates.push(c.id)
  }
  return mates
}
