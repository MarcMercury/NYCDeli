/**
 * Shared union-find (disjoint-set) utilities for camper tent-sharing.
 *
 * Tent-sharing is stored on `campers` as two nullable self-referencing FKs
 * (`sharing_tent_with`, `sharing_tent_with_2`). Either side of a pair may set
 * the link, and 3-person shares (A↔B, A↔C) must collapse into one group.
 * Both the directory ([tent-mates.ts]) and the layout builder ([tent-needs.ts])
 * rely on the same grouping logic, so it lives here once.
 */

export class UnionFind {
  private parent = new Map<string, string>()

  add(id: string): void {
    if (!this.parent.has(id)) this.parent.set(id, id)
  }

  has(id: string): boolean {
    return this.parent.has(id)
  }

  find(id: string): string {
    let cur = id
    while (this.parent.get(cur) !== cur) cur = this.parent.get(cur)!
    // Path compression
    let walker = id
    while (this.parent.get(walker) !== cur) {
      const next = this.parent.get(walker)!
      this.parent.set(walker, cur)
      walker = next
    }
    return cur
  }

  union(a: string, b: string): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

export interface TentShareRow {
  id: string
  sharing_tent_with: string | null
  sharing_tent_with_2: string | null
}

/** Build a union-find that groups campers connected via either tent-share slot. */
export function buildTentShareGroups<T extends TentShareRow>(rows: readonly T[]): UnionFind {
  const uf = new UnionFind()
  for (const r of rows) uf.add(r.id)
  for (const r of rows) {
    for (const partnerId of [r.sharing_tent_with, r.sharing_tent_with_2]) {
      if (partnerId && uf.has(partnerId)) uf.union(r.id, partnerId)
    }
  }
  return uf
}
