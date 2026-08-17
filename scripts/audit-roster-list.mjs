// One-off audit: compare a provided roster (email + name) against campers/user_profiles.
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

const RAW = `muilenburg.aaron@gmail.com	Aaron Muilenburg
aaronsheya@gmail.com	Aaron Sheya
a.reeder65@gmail.com	Adam L Reeder
akfredericksen@gmail.com	Alaine Kiera Fredericksen
agb.alexbien@gmail.com	Alex George Bien
alexwritesprograms@gmail.com	Alex Herbert Chojnacki
allieshuldman@gmail.com	Allie Shuldman
brian.konash@live.com	Brian William Konash
caroline.trumpff@gmail.com	Caroline Trumpff
chweny.shin@gmail.com	Christina Shin (Rina)
zhcchz@gmail.com	Christopher David Arthur Stevenson
danale2017@gmail.com	Dana Olsher
daniel@danielkorte.com	Daniel Scott Korte
daniel.bandong@gmail.com	Daniel Xavier Zarate Bandong
davidjgoz@gmail.com	David Gomez
deanprestons@gmail.com	Dean Preston Shtainhorn
dkreeder61@gmail.com	DeAnnie Kautzer Reeder
deborahfnewman@yahoo.com	Deborah Frances Newman
deep5231@yahoo.com	Deep Vaghela
dorsasson36@gmail.com	Dor Sasson
dbartosh01@gmail.com	Dzmitry Bartosh
ey247@cornell.edu	Elvina Yau
emilykores@gmail.com	Emily Kores MacKenzie
eran.zigman@gmail.com	Eran Zigman
erik.chan@gmail.com	Erik Chan Chi Hein
ethan.a.reeder@gmail.com	Ethan Alexander Reeder
fahimfmf@gmail.com	Fahim Ferdous
galinka@aol.com	Gail Feldsherova
garypierre@gmail.com	Gary Pierre
ginamarie.montoya@gmail.com	Gina Montoya
graceludwig11@gmail.com	Graceanne Ludwig
Ronny.kashai@gmail.com	Haim Ronny Kashai
steinbergisaac@gmail.com	Isaac Steinberg
jcrehmann@gmail.com	Jack Campbell Rehmann
jaclynrholmes@gmail.com	Jaclyn Holmes
qwertey6@gmail.com	Jacob Taylor Kaplan
jeffreylbrown15@gmail.com	Jeffrey Louis Brown
jessica.r.latorre@gmail.com	Jessica Mercury
joanna.e.tsai@gmail.com	Joanna Elizabeth Tsai
john.keefe@gmail.com	John (Nick) Francis Keefe
joshuadwu@gmail.com	Joshua Wu
kalimrosendo@gmail.com	Kali Rosendo
kit.zeller@gmail.com	Karitta Christina Zellerbach
kenofalltrades@gmail.com	Kenneth Huffman
cellokim98@gmail.com	Kimberley Kistler
kifbellholland@gmail.com	Kirill Belyatov
kirillsafonow@gmail.com	Kirill Safonov
laurencrudele43@gmail.com	Lauren Crudele
lina.feldsherova@gmail.com	Lina Feldsherova
milanyaxo@gmail.com	Liudmila Paymukhina
marc.h.mercury@gmail.com	Marc Hamilton Mercury
louiegilot@gmail.com	Marie Gilot
milesbissay@gmail.com	Miles Bissay-Doudy
birmanmorgan@gmail.com	Morgan Birman
natalie.c.koonce@gmail.com	Natalie Koonce
paul.alkoby@gmail.com	Paul Alkoby
pkumi2020@gmail.com	Petra Kumi
rachel@rachelslee.com	Rachel Sylvia lee
rebekahaterry@gmail.com	Rebekah Terry
rich.valente@hey.com	Richard Correia Valente
rishirmalhotra@gmail.com	Rishi Malhotra
roeesh3131@gmail.com	Roy Marashli Shemer
sara.heehee@gmail.com	Sara He
olshers@gmail.com	Shai Olsher
sophiamarchetti96@gmail.com	Sophia Marchetti
sundeepghuman@gmail.com	Sundeep Ghuman
susanxgallo@gmail.com	Susan Gallo
tbyatt@hotmail.com	Tahanna Byatt
talzigman@gmail.com	Tal Zigman
tara.rittle@gmail.com	Tara Lynn Rittle
Tatiana.pisetta@gmail.com	Tatiana Pisetta
thomasle43@gmail.com	Thomas Le
twbklyn@gmail.com	TW John House
yiyanglearn@gmail.com	YI YANG
yvonnehong0520@gmail.com	Yuyang Hong`

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
  .select('id, email, role, camper_id, approved_at, denied_at, last_sign_in_at')
if (pErr) throw pErr

const camperByEmail = new Map(campers.map((c) => [(c.email || '').trim().toLowerCase(), c]))
const profileByEmail = new Map(profiles.map((p) => [(p.email || '').trim().toLowerCase(), p]))
const expectedEmails = new Set(expected.map((e) => e.email))

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '')

console.log(`Expected list: ${expected.length}`)
console.log(`campers rows:  ${campers.length}`)
console.log(`user_profiles: ${profiles.length}\n`)

const missingCamper = []
const missingProfile = []
const nameMismatch = []

for (const e of expected) {
  const c = camperByEmail.get(e.email)
  const p = profileByEmail.get(e.email)
  if (!c) missingCamper.push(e)
  else if (norm(c.full_name) !== norm(e.name)) nameMismatch.push({ ...e, db: c.full_name })
  if (!p) missingProfile.push(e)
}

console.log('=== 1. On list but MISSING from campers table ===')
missingCamper.forEach((e) => console.log(`  ${e.email}\t${e.name}`))
if (!missingCamper.length) console.log('  (none)')

console.log('\n=== 2. On list but NO user_profiles/login account ===')
missingProfile.forEach((e) =>
  console.log(`  ${e.email}\t${e.name}${camperByEmail.has(e.email) ? '  [camper row exists]' : ''}`)
)
if (!missingProfile.length) console.log('  (none)')

console.log('\n=== 3. In campers table but NOT on list ===')
const extras = campers.filter((c) => !expectedEmails.has((c.email || '').trim().toLowerCase()))
extras.forEach((c) => console.log(`  ${c.email}\t${c.full_name}\t(created ${String(c.created_at).slice(0, 10)})`))
if (!extras.length) console.log('  (none)')

console.log('\n=== 4. user_profiles with no matching list entry ===')
const extraProfiles = profiles.filter((p) => !expectedEmails.has((p.email || '').trim().toLowerCase()))
extraProfiles.forEach((p) =>
  console.log(`  ${p.email}\trole=${p.role}\tcamper_id=${p.camper_id ? 'yes' : 'NO'}\tapproved=${p.approved_at ? 'y' : 'n'}\tdenied=${p.denied_at ? 'y' : 'n'}`)
)
if (!extraProfiles.length) console.log('  (none)')

console.log('\n=== 5. Name differences (list vs campers.full_name) ===')
nameMismatch.forEach((e) => console.log(`  ${e.email}\n     list: ${e.name}\n     db:   ${e.db}`))
if (!nameMismatch.length) console.log('  (none)')

console.log('\n=== 6. Profiles not linked to a camper row (camper_id null) ===')
profiles
  .filter((p) => !p.camper_id)
  .forEach((p) => console.log(`  ${p.email}\trole=${p.role}`))

console.log('\n=== 7. Listed campers whose account role is NOT user/admin/builder ===')
for (const e of expected) {
  const p = profileByEmail.get(e.email)
  if (p && !['user', 'admin', 'builder'].includes(p.role)) {
    console.log(`  ${e.email}\t${e.name}\trole=${p.role}\tapproved=${p.approved_at ? 'y' : 'n'}\tdenied=${p.denied_at ? 'y' : 'n'}`)
  }
}
