// Audit the saved layout's tent objects against current camper tent-share data.
// Mirrors the grouping in src/lib/tent-needs.ts (union-find over
// sharing_tent_with..._5, approved profiles only) so this agrees with what
// "Generate Tents" would produce today.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const SHARE_COLS = [
  'sharing_tent_with',
  'sharing_tent_with_2',
  'sharing_tent_with_3',
  'sharing_tent_with_4',
  'sharing_tent_with_5',
]

const { data: campers } = await supabase
  .from('campers')
  .select(
    `id, full_name, email, shelter_type, shelter_width_ft, shelter_length_ft, ${SHARE_COLS.join(', ')}`
  )
  .order('full_name')

const { data: profiles } = await supabase
  .from('user_profiles')
  .select('camper_id, email, role, denied_at')

const { data: fp } = await supabase
  .from('floorplan_configs')
  .select('id, name, updated_at')
  .eq('is_active', true)
  .single()

const { data: objects } = await supabase
  .from('floorplan_objects')
  .select('id, object_type, label, camper_ids, width_ft, height_ft, x, y')
  .eq('floorplan_id', fp.id)

const camperById = new Map(campers.map((c) => [c.id, c]))
const name = (id) => camperById.get(id)?.full_name ?? `<unknown camper ${id.slice(0, 8)}>`

const approved = new Set()
const roleByCamper = new Map()
for (const p of profiles) {
  if (!p.camper_id || p.role === 'pending' || p.denied_at) continue
  approved.add(p.camper_id)
  roleByCamper.set(p.camper_id, p.role)
}

// Union-find over every share column, restricted to approved campers.
const parent = new Map()
const find = (x) => {
  while (parent.get(x) !== x) {
    parent.set(x, parent.get(parent.get(x)))
    x = parent.get(x)
  }
  return x
}
const union = (a, b) => {
  const [ra, rb] = [find(a), find(b)]
  if (ra !== rb) parent.set(ra, rb)
}

const eligible = campers.filter((c) => approved.has(c.id))
for (const c of eligible) parent.set(c.id, c.id)

// Links pointing at an unapproved/nonexistent camper are recorded, not unioned.
const danglingLinks = []
for (const c of eligible) {
  for (const col of SHARE_COLS) {
    const other = c[col]
    if (!other) continue
    if (!camperById.has(other)) {
      danglingLinks.push({ from: c, col, other, why: 'camper row does not exist' })
    } else if (!approved.has(other)) {
      danglingLinks.push({ from: c, col, other, why: `partner is pending/denied` })
    } else {
      union(c.id, other)
    }
  }
}

const groups = new Map()
for (const c of eligible) {
  const root = find(c.id)
  if (!groups.has(root)) groups.set(root, [])
  groups.get(root).push(c)
}
const groupList = [...groups.values()]
const groupOf = new Map()
groupList.forEach((g, i) => g.forEach((c) => groupOf.set(c.id, i)))

const tents = objects.filter((o) => o.object_type === 'tent')
const tentOfCamper = new Map()
for (const t of tents) for (const cid of t.camper_ids ?? []) {
  if (!tentOfCamper.has(cid)) tentOfCamper.set(cid, [])
  tentOfCamper.get(cid).push(t)
}

const key = (ids) => [...ids].sort().join('|')
const line = (s) => console.log('  ' + s)

console.log(`Layout: ${fp.name} (saved ${fp.updated_at.slice(0, 10)})`)
console.log(`Tent objects placed: ${tents.length}`)
console.log(`Approved campers needing shelter: ${eligible.length}`)
console.log(`Current share groups: ${groupList.length} (${groupList.filter((g) => g.length > 1).length} shared)\n`)

console.log('=== 1. SPLIT: campers who now share a tent but sit in different placed tents ===')
let n = 0
for (const g of groupList) {
  if (g.length < 2) continue
  const placedTents = new Set()
  for (const c of g) for (const t of tentOfCamper.get(c.id) ?? []) placedTents.add(t.id)
  if (placedTents.size > 1) {
    n++
    line(`${g.map((c) => c.full_name).join(' & ')}`)
    for (const tid of placedTents) {
      const t = tents.find((x) => x.id === tid)
      line(`     -> "${t.label}" at (${t.x}, ${t.y}) ${t.width_ft}x${t.height_ft}`)
    }
  }
}
if (!n) line('(none)')

console.log('\n=== 2. MERGED: placed tents holding campers who are NOT grouped together now ===')
n = 0
for (const t of tents) {
  const ids = (t.camper_ids ?? []).filter((id) => approved.has(id))
  if (ids.length < 2) continue
  const roots = new Set(ids.map((id) => groupOf.get(id)))
  if (roots.size > 1) {
    n++
    line(`"${t.label}" at (${t.x}, ${t.y}) holds ${ids.length} campers in ${roots.size} different share groups:`)
    for (const id of ids) line(`     ${name(id)} -> group ${groupOf.get(id)}`)
  }
}
if (!n) line('(none)')

console.log('\n=== 3. STALE: placed tents referencing campers who are gone or unapproved ===')
n = 0
for (const t of tents) {
  const bad = (t.camper_ids ?? []).filter((id) => !approved.has(id))
  if (bad.length) {
    n++
    const reasons = bad.map((id) =>
      camperById.has(id) ? `${name(id)} (pending/denied)` : `<deleted camper ${id.slice(0, 8)}>`
    )
    line(`"${t.label}" at (${t.x}, ${t.y}): ${reasons.join(', ')}`)
  }
}
if (!n) line('(none)')

console.log('\n=== 4. UNPLACED: approved campers with no tent on the layout ===')
// Reported per share group: a group is "partial" when some members are linked
// to a placed tent and some are not — Generate Tents skips the whole group in
// that case, so the missing members would never get a tent.
let anyUnplaced = false
for (const g of groupList) {
  const missing = g.filter((c) => !tentOfCamper.has(c.id))
  if (!missing.length) continue
  anyUnplaced = true
  const placedMembers = g.filter((c) => tentOfCamper.has(c.id))
  const dims = `${g[0].shelter_width_ft}x${g[0].shelter_length_ft}`
  if (placedMembers.length) {
    line(
      `PARTIAL — ${g.map((c) => c.full_name).join(' & ')} (${g[0].shelter_type}, ${dims})`
    )
    line(`     placed:  ${placedMembers.map((c) => `${c.full_name} in "${tentOfCamper.get(c.id)[0].label}"`).join(', ')}`)
    line(`     missing: ${missing.map((c) => c.full_name).join(', ')}`)
    line(`     -> Generate Tents skips this group because a member is already placed`)
  } else {
    line(`${missing.map((c) => c.full_name).join(' & ')} — ${missing[0].shelter_type}, ${dims}`)
  }
}
if (!anyUnplaced) line('(none)')

console.log('\n=== 5. DUPLICATE: campers appearing in more than one placed tent ===')
n = 0
for (const [cid, ts] of tentOfCamper) {
  if (ts.length > 1) {
    n++
    line(`${name(cid)} appears in: ${ts.map((t) => `"${t.label}" (${t.x},${t.y})`).join(', ')}`)
  }
}
if (!n) line('(none)')

console.log('\n=== 6. UNLINKED: placed tents with no camper_ids ===')
const unlinked = tents.filter((t) => !(t.camper_ids ?? []).length)
unlinked.forEach((t) => line(`"${t.label || '(no label)'}" at (${t.x}, ${t.y}) ${t.width_ft}x${t.height_ft}`))
if (!unlinked.length) line('(none)')

console.log('\n=== 7. LABEL DRIFT: tent label does not match its linked campers ===')
n = 0
for (const t of tents) {
  const ids = t.camper_ids ?? []
  if (!ids.length) continue
  const expected = ids.map(name).join(' & ')
  const stripped = (t.label ?? '').replace(/\s*\(RV\)\s*$/, '').trim()
  const norm = (s) => s.toLowerCase().replace(/[^a-z&]/g, '')
  if (norm(stripped) !== norm(expected)) {
    n++
    line(`"${t.label}"  ->  should read "${expected}"`)
  }
}
if (!n) line('(none)')

console.log('\n=== 8. SIZE DRIFT: placed footprint vs largest member dims ===')
n = 0
for (const t of tents) {
  const ids = (t.camper_ids ?? []).filter((id) => camperById.has(id))
  if (!ids.length) continue
  let bw = 0
  let bl = 0
  for (const id of ids) {
    const c = camperById.get(id)
    const w = Number(c.shelter_width_ft) || 0
    const l = Number(c.shelter_length_ft) || 0
    if (w * l > bw * bl) {
      bw = w
      bl = l
    }
  }
  if (!bw || !bl) continue
  const placed = [Number(t.width_ft), Number(t.height_ft)].sort((a, b) => a - b)
  const want = [bw, bl].sort((a, b) => a - b)
  if (placed[0] !== want[0] || placed[1] !== want[1]) {
    n++
    line(`"${t.label}": placed ${t.width_ft}x${t.height_ft}, camper data says ${bw}x${bl}`)
  }
}
if (!n) line('(none)')

console.log('\n=== 9. DANGLING share links (point at missing/unapproved campers) ===')
danglingLinks.forEach((d) => line(`${d.from.full_name}.${d.col} -> ${name(d.other)} — ${d.why}`))
if (!danglingLinks.length) line('(none)')

console.log('\n=== 10. ONE-WAY share links (A names B, B does not name A) ===')
n = 0
for (const c of eligible) {
  for (const col of SHARE_COLS) {
    const other = c[col]
    if (!other || !camperById.has(other)) continue
    const back = SHARE_COLS.some((k) => camperById.get(other)[k] === c.id)
    if (!back) {
      n++
      line(`${c.full_name} names ${name(other)}, but ${name(other)} does not name them back`)
    }
  }
}
if (!n) line('(none)')
