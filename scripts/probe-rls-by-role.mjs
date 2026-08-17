// Throwaway end-to-end RLS check: creates a temp auth user, exercises reads as
// pending then as approved, then deletes the user. Safe to re-run.
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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const email = `rls-probe-${Date.now()}@example.invalid`
const password = crypto.randomUUID() + 'Aa1!'

const TABLES = [
  'campers', 'user_profiles', 'camper_photos',
  'floorplan_configs', 'floorplan_objects', 'floorplan_utility_lines',
  'build_inventory', 'build_inventory_components', 'build_goals', 'build_stages',
  'build_procedures', 'build_questions', 'build_resources', 'build_schedule_items',
  'build_meetings', 'build_meeting_notes', 'build_meeting_sections', 'build_tasks',
  'electrical_load_config', 'electrical_load_items', 'electrical_distro_boxes',
  'resource_edits', 'shift_drafts', 'shift_draft_order', 'shift_draft_assignments',
  'shift_offerings', 'kitchen_roles', 'kitchen_shifts', 'schedule_assignments',
  'camp_events', 'checklist_templates', 'system_settings',
]

async function probe(label, client) {
  const results = {}
  for (const t of TABLES) {
    const { count, error } = await client.from(t).select('*', { count: 'exact', head: true })
    results[t] = error ? `ERR ${error.code}` : count
  }
  console.log(`\n--- ${label} ---`)
  const visible = Object.entries(results).filter(([, v]) => typeof v === 'number' && v > 0)
  const empty = Object.entries(results).filter(([, v]) => v === 0)
  const errored = Object.entries(results).filter(([, v]) => typeof v === 'string')
  console.log(`readable (rows > 0): ${visible.length ? visible.map(([k, v]) => `${k}=${v}`).join(', ') : '(none)'}`)
  console.log(`blocked/empty:       ${empty.length}/${TABLES.length}`)
  if (errored.length) console.log(`errors: ${errored.map(([k, v]) => `${k}:${v}`).join(', ')}`)
  return results
}

const anon = () =>
  createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

await probe('ANONYMOUS (no login)', anon())

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})
if (createErr) throw createErr
const uid = created.user.id

try {
  // The handle_new_user trigger creates the profile with role 'pending'.
  const signedIn = anon()
  const { error: signInErr } = await signedIn.auth.signInWithPassword({ email, password })
  if (signInErr) throw signInErr
  console.log(`\nSigned in as temp user (session issued: ${!signInErr})`)

  const { data: prof } = await admin.from('user_profiles').select('role').eq('id', uid).single()
  console.log(`profile role: ${prof?.role}`)

  const pendingResults = await probe('PENDING user', signedIn)

  await admin.from('user_profiles').update({ role: 'user' }).eq('id', uid)
  const approved = anon()
  await approved.auth.signInWithPassword({ email, password })
  const userResults = await probe('APPROVED user', approved)

  await admin.from('user_profiles').update({ role: 'builder' }).eq('id', uid)
  const builder = anon()
  await builder.auth.signInWithPassword({ email, password })
  const builderResults = await probe('BUILDER', builder)

  console.log('\n--- regressions: readable by approved user but NOT by builder ---')
  const regressions = TABLES.filter(
    (t) => typeof userResults[t] === 'number' && userResults[t] > 0 && builderResults[t] === 0
  )
  console.log(regressions.length ? regressions.join(', ') : '(none)')

  console.log('\n--- leaks: still readable while pending ---')
  const leaks = TABLES.filter((t) => typeof pendingResults[t] === 'number' && pendingResults[t] > 0)
  console.log(leaks.length ? leaks.join(', ') : '(none)')
} finally {
  await admin.from('user_profiles').delete().eq('id', uid)
  await admin.auth.admin.deleteUser(uid)
  console.log(`\nCleaned up temp user ${email}`)
}
