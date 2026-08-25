// One-time horizontal (east↔west) mirror of the active floorplan.
//
// The canvas maps x=0 → WEST edge and x=width_ft → EAST edge (y=0 is NORTH),
// so a left/right swap is a reflection about the vertical centre line:
//   x' = width_ft - (x + width_ft_of_object)
//   rotation' = (360 - rotation) % 360
// North/south geometry, object sizes and camp dimensions are untouched.
//
// Usage:
//   node scripts/mirror-layout-horizontal.mjs           # dry run (prints diff)
//   node scripts/mirror-layout-horizontal.mjs --apply   # writes to Supabase
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

const APPLY = process.argv.includes('--apply')
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: config, error: cfgErr } = await supabase
  .from('floorplan_configs')
  .select('*')
  .eq('is_active', true)
  .single()

if (cfgErr || !config) {
  console.error('No active floorplan:', cfgErr?.message)
  process.exit(1)
}

const W = config.width_ft
console.log(`Active floorplan: "${config.name}" (${config.id}) — ${W}ft wide x ${config.length_ft}ft deep`)
console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`)

// ── Objects ────────────────────────────────────────────────
const { data: objects, error: objErr } = await supabase
  .from('floorplan_objects')
  .select('*')
  .eq('floorplan_id', config.id)

if (objErr) {
  console.error('Failed to load objects:', objErr.message)
  process.exit(1)
}

const FLIP_DIR = { east: 'west', west: 'east', north: 'north', south: 'south' }

const objUpdates = []
for (const o of objects) {
  const newX = W - (o.x + o.width_ft)
  const newRot = ((360 - (o.rotation || 0)) % 360 + 360) % 360

  const props = { ...(o.properties || {}) }
  let propsChanged = false
  if (props.door_direction && FLIP_DIR[props.door_direction] !== props.door_direction) {
    props.door_direction = FLIP_DIR[props.door_direction]
    propsChanged = true
  }

  const update = { id: o.id, x: newX }
  if (newRot !== (o.rotation || 0)) update.rotation = newRot
  if (propsChanged) update.properties = props

  objUpdates.push({ update, before: o })
}

// ── Utility lines ──────────────────────────────────────────
const { data: lines, error: lineErr } = await supabase
  .from('floorplan_utility_lines')
  .select('*')
  .eq('floorplan_id', config.id)

if (lineErr) {
  console.error('Failed to load utility lines:', lineErr.message)
  process.exit(1)
}

const lineUpdates = lines.map((l) => ({
  id: l.id,
  points: (l.points || []).map((p) => ({ ...p, x: W - p.x })),
}))

// ── Config: swap east/west border labels + frontage sides ──
const configUpdate = {
  border_label_east: config.border_label_west,
  border_label_west: config.border_label_east,
  frontage_sides: (config.frontage_sides || []).map((s) => FLIP_DIR[s] ?? s),
  layout_version: (config.layout_version || 1) + 1,
}

// ── Report ─────────────────────────────────────────────────
console.log('CONFIG')
console.log(`  border_label_west: ${JSON.stringify(config.border_label_west)} -> ${JSON.stringify(configUpdate.border_label_west)}`)
console.log(`  border_label_east: ${JSON.stringify(config.border_label_east)} -> ${JSON.stringify(configUpdate.border_label_east)}`)
console.log(`  frontage_sides:    ${JSON.stringify(config.frontage_sides)} -> ${JSON.stringify(configUpdate.frontage_sides)}`)
console.log(`  layout_version:    ${config.layout_version} -> ${configUpdate.layout_version}\n`)

console.log(`OBJECTS (${objUpdates.length})`)
for (const { update, before } of objUpdates.slice().sort((a, b) => a.before.x - b.before.x)) {
  const bits = [`x ${before.x} -> ${update.x}`]
  if (update.rotation !== undefined) bits.push(`rot ${before.rotation} -> ${update.rotation}`)
  if (update.properties) bits.push(`door ${before.properties.door_direction} -> ${update.properties.door_direction}`)
  console.log(`  [${before.object_type}] ${before.label || '(no label)'} — ${bits.join(', ')}`)
}

console.log(`\nUTILITY LINES (${lineUpdates.length})`)
for (const l of lines) {
  console.log(`  ${l.label || l.line_type}: ${l.points.length} points mirrored`)
}

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply to write these changes.')
  process.exit(0)
}

// ── Apply ──────────────────────────────────────────────────
let failed = 0
for (const { update } of objUpdates) {
  const { id, ...fields } = update
  const { error } = await supabase.from('floorplan_objects').update(fields).eq('id', id)
  if (error) {
    failed++
    console.error(`  ! object ${id}: ${error.message}`)
  }
}
console.log(`\nObjects updated: ${objUpdates.length - failed}/${objUpdates.length}`)

for (const l of lineUpdates) {
  const { error } = await supabase
    .from('floorplan_utility_lines')
    .update({ points: l.points })
    .eq('id', l.id)
  if (error) console.error(`  ! line ${l.id}: ${error.message}`)
}
console.log(`Utility lines updated: ${lineUpdates.length}`)

const { error: cfgUpdErr } = await supabase
  .from('floorplan_configs')
  .update(configUpdate)
  .eq('id', config.id)
console.log(cfgUpdErr ? `  ! config: ${cfgUpdErr.message}` : 'Config updated.')

console.log('\nDone. Reload the Layout Builder to see the mirrored layout.')
