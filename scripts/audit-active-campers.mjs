// Active-camper audit (2026-08-21): compare the registration-sheet roster against
// campers / user_profiles / auth.users, ignoring pending (unapproved) accounts.
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

const RAW = `brian.konash@live.com	Brian William Konash
alexwritesprograms@gmail.com	Alex Herbert Chojnacki
birmanmorgan@gmail.com	Morgan Birman
rebekahaterry@gmail.com	Rebekah Terry
emily.gonthier@gmail.com	Emily W Gonthier
ey247@cornell.edu	Elvina Yau
natalie.c.koonce@gmail.com	Natalie Koonce
louiegilot@gmail.com	Marie Gilot
kalimrosendo@gmail.com	Kali Rosendo
twbklyn@gmail.com	TW John House
john.keefe@gmail.com	John (Nick) Francis Keefe
jcrehmann@gmail.com	Jack Campbell Rehmann
kristinaeschmidt@gmail.com	Kristina Schmidt
jeffreylbrown15@gmail.com	Jeffrey Louis Brown
davidjgoz@gmail.com	David Gomez
jessica.r.latorre@gmail.com	Jessica Mercury
erik.chan@gmail.com	Erik Chan Chi Hein
ginamarie.montoya@gmail.com	Gina Montoya
dkreeder61@gmail.com	DeAnnie Kautzer Reeder
a.reeder65@gmail.com	Adam L Reeder
tbyatt@hotmail.com	Tahanna Byatt
vvan829@gmail.com	Wai Foon Vivian Au
chweny.shin@gmail.com	Christina Shin (Rina)
sundeepghuman@gmail.com	Sundeep Ghuman
kenofalltrades@gmail.com	Kenneth Huffman
sophiamarchetti96@gmail.com	Sophia Marchetti
andra.salumaa1@gmail.com	Andra Salumaa
aaronsheya@gmail.com	Aaron Sheya
Tatiana.pisetta@gmail.com	Tatiana Pisetta
deborahfnewman@yahoo.com	Deborah Frances Newman
emilykores@gmail.com	Emily Kores MacKenzie
garypierre@gmail.com	Gary Pierre
galinka@aol.com	Gail Feldsherova
marc.h.mercury@gmail.com	Marc Hamilton Mercury
thomasle43@gmail.com	Thomas Le
deep5231@yahoo.com	Deep Vaghela
olshers@gmail.com	Shai Olsher
sara.heehee@gmail.com	Sara He
lina.feldsherova@gmail.com	Lina Feldsherova
talzigman@gmail.com	Tal Zigman
dorsasson36@gmail.com	Dor Sasson
josh.munzenrider@gmail.com	Joshua Wade Munzenrider
danale2017@gmail.com	Dana Olsher
Ronny.kashai@gmail.com	Haim Ronny Kashai
allieshuldman@gmail.com	Allie Shuldman
eran.zigman@gmail.com	Eran Zigman
roeesh3131@gmail.com	Roy Marashli Shemer
richimizrahi007@gmail.com	Richard Shalom Mizrahi
laurencrudele43@gmail.com	Lauren Crudele
graceludwig11@gmail.com	Graceanne Ludwig
muilenburg.aaron@gmail.com	Aaron Muilenburg
joanna.e.tsai@gmail.com	Joanna Elizabeth Tsai
daniel@danielkorte.com	Daniel Scott Korte
mfurlow1123@gmail.com	Matthew Jon Furlow
jmarkowitz9@gmail.com	Jessica Markowitz
jian.francis@gmail.com	James Francisco
susanxgallo@gmail.com	Susan Gallo
daniel.bandong@gmail.com	Daniel Xavier Zarate Bandong
rishirmalhotra@gmail.com	Rishi Malhotra
jaclynrholmes@gmail.com	Jaclyn Holmes
sharonreneemccoy@gmail.com	Sharon Renee McCoy
akfredericksen@gmail.com	Alaine Kiera Fredericksen
yiyanglearn@gmail.com	YI YANG
qwertey6@gmail.com	Jacob Taylor Kaplan
kit.zeller@gmail.com	Karitta Christina Zellerbach - but I go by Kit
rich.valente@hey.com	Richard Correia Valente
pkumi2020@gmail.com	Petra Kumi
fahimfmf@gmail.com	Fahim Ferdous
levonahhoffmann@gmail.com	Lauren Hoffmann
caroline.trumpff@gmail.com	Caroline Trumpff
deanprestons@gmail.com	Dean Preston Shtainhorn
steinbergisaac@gmail.com	Isaac Steinberg
rachel@rachelslee.com	Rachel Sylvia lee
ethan.a.reeder@gmail.com	Ethan Alexander Reeder
kifbellholland@gmail.com	Kirill Belyatov
yvonnehong0520@gmail.com	Yuyang Hong
tara.rittle@gmail.com	Tara Lynn Rittle
zhcchz@gmail.com	Christopher David Arthur Stevenson
dbartosh01@gmail.com	Dzmitry Bartosh
milanyaxo@gmail.com	Liudmila Paymukhina
kirillsafonow@gmail.com	Kirill Safonov
joshuadwu@gmail.com	Joshua Wu
agb.alexbien@gmail.com	Alex George Bien
cellokim98@gmail.com	Kimberley Kistler
milesbissay@gmail.com	Miles Bissay-Doudy
jacen.bruni@gmail.com	Jacen Bruni
paul.alkoby@gmail.com	Paul Alkoby
anthonytotten@gmail.com	Anthony E. Totten
katiejooyoungkim@gmail.com	Jooyoung Kim (Katie)
alyssahubbell@gmail.com	Alyssa Cheyenne Hubbell`

const expected = RAW.split('\n')
  .map((l) => l.split('\t'))
  .filter((p) => p[0]?.trim())
  .map(([email, name]) => ({ email: email.trim().toLowerCase(), name: (name || '').trim() }))

const { data: campers, error: cErr } = await supabase
  .from('campers')
  .select('id, full_name, email, playa_name, created_at')
  .order('full_name')
if (cErr) throw cErr

const { data: profiles, error: pErr } = await supabase
  .from('user_profiles')
  .select('id, email, role, camper_id, approved_at, denied_at, last_sign_in_at, created_at')
if (pErr) throw pErr

const authUsers = []
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) throw error
  authUsers.push(...data.users)
  if (data.users.length < 1000) break
}

const ACTIVE_ROLES = new Set(['user', 'builder', 'admin'])
const isActive = (p) => ACTIVE_ROLES.has(p.role) && !p.denied_at

const camperByEmail = new Map(campers.map((c) => [(c.email || '').trim().toLowerCase(), c]))
const profileByEmail = new Map(profiles.map((p) => [(p.email || '').trim().toLowerCase(), p]))
const authByEmail = new Map(authUsers.map((u) => [(u.email || '').trim().toLowerCase(), u]))
const camperById = new Map(campers.map((c) => [c.id, c]))
const expectedEmails = new Set(expected.map((e) => e.email))

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '')
const activeProfiles = profiles.filter(isActive)
const pendingProfiles = profiles.filter((p) => !isActive(p))

console.log(`Registration sheet: ${expected.length}`)
console.log(`campers rows:       ${campers.length}`)
console.log(`user_profiles:      ${profiles.length}  (active ${activeProfiles.length} / pending-or-denied ${pendingProfiles.length})`)
console.log(`auth.users:         ${authUsers.length}\n`)

console.log('=== 1. ON SHEET but MISSING from campers table ===')
let n = 0
for (const e of expected) {
  if (!camperByEmail.has(e.email)) {
    const p = profileByEmail.get(e.email)
    console.log(`  ${e.email}\t${e.name}\t${p ? `[profile exists role=${p.role}${p.denied_at ? ' DENIED' : ''}]` : '[no account at all]'}`)
    n++
  }
}
if (!n) console.log('  (none)')

console.log('\n=== 2. ON SHEET but NO ACTIVE account (pending / denied / no login) ===')
n = 0
for (const e of expected) {
  const p = profileByEmail.get(e.email)
  if (!p) {
    console.log(`  ${e.email}\t${e.name}\tNO user_profile${camperByEmail.has(e.email) ? ' (camper row exists)' : ''}`)
    n++
  } else if (!isActive(p)) {
    console.log(`  ${e.email}\t${e.name}\trole=${p.role}${p.denied_at ? ' DENIED' : ''}`)
    n++
  }
}
if (!n) console.log('  (none)')

console.log('\n=== 3. ACTIVE ACCOUNT but NOT on sheet (should they be users?) ===')
n = 0
for (const p of activeProfiles.sort((a, b) => (a.email || '').localeCompare(b.email || ''))) {
  const email = (p.email || '').trim().toLowerCase()
  if (expectedEmails.has(email)) continue
  const c = p.camper_id ? camperById.get(p.camper_id) : camperByEmail.get(email)
  console.log(
    `  ${p.email}\trole=${p.role}\tcamper=${c ? c.full_name : 'NONE'}\tlast_sign_in=${p.last_sign_in_at ? String(p.last_sign_in_at).slice(0, 10) : 'never'}`
  )
  n++
}
if (!n) console.log('  (none)')

console.log('\n=== 4. CAMPER ROW but NOT on sheet ===')
n = 0
for (const c of campers) {
  const email = (c.email || '').trim().toLowerCase()
  if (expectedEmails.has(email)) continue
  const p = profileByEmail.get(email)
  console.log(
    `  ${c.email || '(no email)'}\t${c.full_name}\t${p ? `role=${p.role}` : 'no profile'}\t(created ${String(c.created_at).slice(0, 10)})`
  )
  n++
}
if (!n) console.log('  (none)')

console.log('\n=== 5. Name differences (sheet vs campers.full_name) ===')
n = 0
for (const e of expected) {
  const c = camperByEmail.get(e.email)
  if (c && norm(c.full_name) !== norm(e.name)) {
    console.log(`  ${e.email}\n     sheet: ${e.name}\n     db:    ${c.full_name}`)
    n++
  }
}
if (!n) console.log('  (none)')

console.log('\n=== 6. Active profiles with no linked camper row (camper_id null) ===')
n = 0
for (const p of activeProfiles) {
  if (!p.camper_id) {
    console.log(`  ${p.email}\trole=${p.role}\t${expectedEmails.has((p.email || '').trim().toLowerCase()) ? 'ON SHEET' : 'not on sheet'}`)
    n++
  }
}
if (!n) console.log('  (none)')

console.log('\n=== 7. auth/profile mismatches ===')
n = 0
for (const p of profiles) {
  if (!authByEmail.has((p.email || '').trim().toLowerCase())) {
    console.log(`  profile with NO auth user: ${p.email} (role=${p.role})`)
    n++
  }
}
for (const u of authUsers) {
  if (!profileByEmail.has((u.email || '').trim().toLowerCase())) {
    console.log(`  auth user with NO profile: ${u.email}`)
    n++
  }
}
if (!n) console.log('  (none)')

console.log('\n=== 8. Duplicate emails ===')
n = 0
for (const [label, rows] of [
  ['campers', campers],
  ['user_profiles', profiles],
]) {
  const seen = new Map()
  for (const r of rows) {
    const k = (r.email || '').trim().toLowerCase()
    if (!k) continue
    seen.set(k, (seen.get(k) || 0) + 1)
  }
  for (const [k, count] of seen) if (count > 1) { console.log(`  ${label}: ${k} x${count}`); n++ }
}
if (!n) console.log('  (none)')

console.log('\n=== 9. Pending / denied queue (FYI, excluded from active) ===')
if (!pendingProfiles.length) console.log('  (none)')
for (const p of pendingProfiles.sort((a, b) => (a.email || '').localeCompare(b.email || ''))) {
  console.log(
    `  ${p.email}\trole=${p.role}${p.denied_at ? '\tDENIED' : ''}\t${expectedEmails.has((p.email || '').trim().toLowerCase()) ? 'ON SHEET' : 'not on sheet'}`
  )
}
