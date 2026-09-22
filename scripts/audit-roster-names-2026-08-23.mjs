// One-off (2026-08-23): compare a name-only roster paste against campers + user_profiles.
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

const RAW = `Brian William Konash
Alex Herbert Chojnacki
Morgan Birman
Rebekah Terry
Emily W Gonthier 
Elvina Yau
Natalie Koonce
Marie Gilot
Kali Rosendo
TW John House
John (Nick) Francis Keefe
Jack Campbell Rehmann
Kristina Schmidt
Jeffrey Louis Brown
David Gomez
Jessica Mercury
Erik Chan Chi Hein
Gina Montoya
DeAnnie Kautzer Reeder
Adam L Reeder
Tahanna Byatt
Christina Shin (Rina)
Sundeep Ghuman
Kenneth Huffman
Sophia Marchetti
Aaron Sheya
Tatiana Pisetta
Deborah Frances Newman
Emily Kores MacKenzie
Gary Pierre
Gail Feldsherova
Marc Hamilton Mercury
Thomas Le
Deep Vaghela
Shai Olsher
Sara He
Lina Feldsherova
Joshua Leopold Bruff
Tal Zigman
Dor Sasson
Dana Olsher
Haim Ronny Kashai
Allie Shuldman
Eran Zigman
Roy Marashli Shemer
Richard Shalom Mizrahi
Lauren Crudele
Graceanne Ludwig
Aaron Muilenburg
Joanna Elizabeth Tsai
Daniel Scott Korte
Susan Gallo
Daniel Xavier Zarate Bandong
Rishi Malhotra
Jaclyn Holmes
Alaine Kiera Fredericksen 
YI YANG
Jacob Taylor Kaplan
Karitta Christina Zellerbach - but I go by Kit
Richard Correia Valente
Petra Kumi
Fahim Ferdous
Lauren Hoffmann
Caroline Trumpff
Dean Preston Shtainhorn
Isaac Steinberg
Rachel Sylvia lee
Ethan Alexander Reeder
Kirill Belyatov
Yuyang Hong
Tara Lynn Rittle
Christopher David Arthur Stevenson
Dzmitry Bartosh
Liudmila Paymukhina
Kirill Safonov
Joshua Wu
Alex George Bien
Kimberley Kistler 
Miles Bissay-Doudy
Jacen Bruni
Paul Alkoby
Anthony E. Totten
Jooyoung Kim (Katie)
Alyssa Cheyenne Hubbell`

const clean = (s) =>
  (s || '')
    .replace(/-\s*but I go by.*$/i, '')
    .replace(/\(.*?\)/g, ' ')
    .trim()

const norm = (s) => clean(s).toLowerCase().replace(/[^a-z]/g, '')
const tokens = (s) =>
  clean(s)
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)

const sheet = RAW.split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .map((name) => ({ name, norm: norm(name), tokens: tokens(name) }))

const { data: campers, error: cErr } = await supabase
  .from('campers')
  .select('id, full_name, email, playa_name, created_at')
  .order('full_name')
if (cErr) throw cErr

const { data: profiles, error: pErr } = await supabase
  .from('user_profiles')
  .select('id, email, role, camper_id, approved_at, denied_at, last_sign_in_at, created_at')
if (pErr) throw pErr

const camperById = new Map(campers.map((c) => [c.id, c]))
const profileByCamperId = new Map(profiles.filter((p) => p.camper_id).map((p) => [p.camper_id, p]))
const profileByEmail = new Map(profiles.map((p) => [(p.email || '').trim().toLowerCase(), p]))

const ACTIVE_ROLES = new Set(['user', 'builder', 'admin'])
const isActive = (p) => p && ACTIVE_ROLES.has(p.role) && !p.denied_at

// Build a searchable index of DB people (campers first, then profiles without campers)
const dbPeople = campers.map((c) => {
  const p = profileByCamperId.get(c.id) || profileByEmail.get((c.email || '').trim().toLowerCase())
  return {
    kind: 'camper',
    name: c.full_name,
    email: c.email,
    norm: norm(c.full_name),
    tokens: tokens(c.full_name),
    role: p?.role ?? null,
    denied: !!p?.denied_at,
    lastSignIn: p?.last_sign_in_at ?? null,
    created: c.created_at,
    matched: false,
  }
})
for (const p of profiles) {
  if (p.camper_id && camperById.has(p.camper_id)) continue
  const email = (p.email || '').trim().toLowerCase()
  if (campers.some((c) => (c.email || '').trim().toLowerCase() === email && email)) continue
  const nm = p.email || ''
  dbPeople.push({
    kind: 'profile-only',
    name: nm,
    email: p.email,
    norm: norm(nm),
    tokens: tokens(nm),
    role: p.role,
    denied: !!p.denied_at,
    lastSignIn: p.last_sign_in_at,
    created: p.created_at,
    matched: false,
  })
}

function findMatch(entry) {
  let m = dbPeople.find((d) => d.norm && d.norm === entry.norm)
  if (m) return { m, how: 'exact' }
  // first + last token match
  const first = entry.tokens[0]
  const last = entry.tokens[entry.tokens.length - 1]
  m = dbPeople.find((d) => d.tokens.includes(first) && d.tokens.includes(last))
  if (m) return { m, how: 'first+last' }
  // last name + first initial
  m = dbPeople.find((d) => d.tokens.includes(last) && d.tokens[0]?.[0] === first?.[0])
  if (m) return { m, how: 'fuzzy(last+initial)' }
  return null
}

const notInDb = []
for (const e of sheet) {
  const r = findMatch(e)
  if (!r) {
    notInDb.push(e)
  } else {
    r.m.matched = true
    e.match = r
  }
}

console.log(`Pasted list: ${sheet.length}`)
console.log(`campers rows: ${campers.length}`)
console.log(`user_profiles: ${profiles.length} (active ${profiles.filter(isActive).length})\n`)

console.log('=== 1. ON PASTED LIST but NOT FOUND in DB ===')
if (!notInDb.length) console.log('  (none)')
for (const e of notInDb) console.log(`  ${e.name}`)

console.log('\n=== 2. ON LIST but account NOT ACTIVE (pending/denied/no profile) ===')
let n = 0
for (const e of sheet) {
  if (!e.match) continue
  const d = e.match.m
  if (!d.role || !ACTIVE_ROLES.has(d.role) || d.denied) {
    console.log(`  ${e.name}\t-> ${d.name} <${d.email || 'no email'}>\trole=${d.role ?? 'NO PROFILE'}${d.denied ? ' DENIED' : ''}`)
    n++
  }
}
if (!n) console.log('  (none)')

console.log('\n=== 3. IN DB but NOT on pasted list ===')
n = 0
for (const d of dbPeople.filter((d) => !d.matched).sort((a, b) => (a.name || '').localeCompare(b.name || ''))) {
  console.log(
    `  ${d.name}\t<${d.email || 'no email'}>\t${d.kind}\trole=${d.role ?? 'NO PROFILE'}${d.denied ? ' DENIED' : ''}\tlast_sign_in=${d.lastSignIn ? String(d.lastSignIn).slice(0, 10) : 'never'}\tcreated=${String(d.created).slice(0, 10)}`
  )
  n++
}
if (!n) console.log('  (none)')

console.log('\n=== 4. FUZZY matches (verify these) ===')
n = 0
for (const e of sheet) {
  if (e.match && e.match.how !== 'exact') {
    console.log(`  "${e.name}"  ~=  "${e.match.m.name}" <${e.match.m.email || ''}>  [${e.match.how}]`)
    n++
  }
}
if (!n) console.log('  (none)')
