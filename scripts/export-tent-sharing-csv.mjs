// Export a CSV chart: one row per camper, columns for each tentmate.
// Grouping mirrors src/lib/tent-needs.ts (union-find over sharing_tent_with..._5).
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'

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

const { data: allCampers, error } = await supabase
  .from('campers')
  .select(
    `id, full_name, playa_name, email, shelter_type, shelter_width_ft, shelter_length_ft, ${SHARE_COLS.join(', ')}`
  )
  .order('full_name')
if (error) throw error

const { data: profiles } = await supabase
  .from('user_profiles')
  .select('camper_id, role, denied_at')

const status = new Map()
for (const p of profiles ?? []) {
  if (!p.camper_id) continue
  status.set(p.camper_id, p.denied_at ? 'denied' : p.role)
}

// Pending campers are excluded entirely — from rows AND from others' tentmate lists.
const campers = allCampers.filter((c) => status.get(c.id) !== 'pending')
const excluded = allCampers.length - campers.length

const byId = new Map(campers.map((c) => [c.id, c]))

// Union-find across all five share slots (both directions).
const parent = new Map(campers.map((c) => [c.id, c.id]))
const find = (x) => {
  while (parent.get(x) !== x) {
    parent.set(x, parent.get(parent.get(x)))
    x = parent.get(x)
  }
  return x
}
const union = (a, b) => {
  const ra = find(a)
  const rb = find(b)
  if (ra !== rb) parent.set(ra, rb)
}
for (const c of campers) {
  for (const col of SHARE_COLS) {
    const other = c[col]
    if (other && parent.has(other)) union(c.id, other)
  }
}

const groups = new Map()
for (const c of campers) {
  const root = find(c.id)
  if (!groups.has(root)) groups.set(root, [])
  groups.get(root).push(c.id)
}

const label = (c) => (c.playa_name ? `${c.full_name} (${c.playa_name})` : c.full_name)

const shelter = (c) => {
  const dims =
    c.shelter_width_ft && c.shelter_length_ft ? `${c.shelter_width_ft}x${c.shelter_length_ft}` : ''
  return [c.shelter_type ?? '', dims].filter(Boolean).join(' ')
}

const maxMates = Math.max(0, ...[...groups.values()].map((g) => g.length - 1))

const header = [
  'Camper',
  'Email',
  'Status',
  'Shelter',
  'Tent Group #',
  'People In Tent',
  ...Array.from({ length: maxMates }, (_, i) => `Sharing With ${i + 1}`),
]

// Stable group numbering: order groups by their alphabetically first member.
const orderedRoots = [...groups.keys()].sort((a, b) => {
  const na = groups.get(a).map((id) => byId.get(id).full_name).sort()[0] ?? ''
  const nb = groups.get(b).map((id) => byId.get(id).full_name).sort()[0] ?? ''
  return na.localeCompare(nb)
})
const groupNumber = new Map(orderedRoots.map((r, i) => [r, i + 1]))

const rows = campers.map((c) => {
  const group = groups.get(find(c.id)) ?? [c.id]
  const mates = group
    .filter((id) => id !== c.id)
    .map((id) => byId.get(id))
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
    .map(label)
  return [
    label(c),
    c.email ?? '',
    status.get(c.id) ?? 'no account',
    shelter(c),
    String(groupNumber.get(find(c.id))),
    String(group.length),
    ...mates,
    ...Array(maxMates - mates.length).fill(''),
  ]
})

const esc = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n')

const out = new URL('../public/Files/tent-sharing-chart.csv', import.meta.url)
writeFileSync(out, csv, 'utf8')

const solo = rows.filter((r) => r[5] === '1').length
console.log(`Wrote ${rows.length} campers, ${groups.size} tent groups (${solo} solo), max ${maxMates} tentmate columns`)
console.log(`Excluded ${excluded} pending campers`)
console.log(`→ public/Files/tent-sharing-chart.csv`)
