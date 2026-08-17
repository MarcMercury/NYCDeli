// Create the three campers missing from the roster as standard users.
// Source: NYC Deli Camp Registration + Burning Man 26 form responses
// (timestamps 8/14/2026 8:19:40, 8/15/2026 15:34:54, 8/15/2026 16:20:38).
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

const PASSWORD = 'NYCDeli2026!'
const ARRIVAL = '2026-08-30'
const DEPARTURE = '2026-09-07'

const CAMPERS = [
  {
    full_name: 'Kirill Belyatov',
    email: 'kifbellholland@gmail.com',
    phone: '+31 6 23078564',
    arrival_date: ARRIVAL,
    arrival_method: 'car',
    departure_date: DEPARTURE,
    departure_method: 'car',
    early_arrival: false,
    shelter_type: 'tent',
    // Form left tent size blank; he shares Kirill Safonov's Kodiak 10x10x6.
    shelter_length_ft: 10,
    shelter_width_ft: 10,
    shelter_height_ft: 6,
    tent_make_model: 'Kodiak (sharing Kirill Safonov\u2019s tent)',
    bringing_vehicle: false,
    power_required: false,
    power_type: 'none',
    kitchen_participation: true,
    strike_participation: true,
    build_week_attending: false,
    volunteer_commitment: true,
    sober_shifts: true,
    background_check_consent: true,
    medical_conditions: 'No',
    medications: 'No',
    allergies: 'No',
    dietary_restrictions: 'No',
    emergency_contact: '+1 (617) 308-6799',
    emergency_contact_number: '+1 (617) 308-6799',
    what_attracted_you: 'I love NYC',
    custom_skills: 'Computer guy',
    character_references: 'Yvonne',
    first_burn_hopes: 'Yes \u2014 first Burning Man.',
    burn_count: '0',
    referral_source: 'Yvonne',
    notes:
      'Registered 2026-08-14. Tent dimensions were left blank on the form \u2014 10x10x6 assumed from Kirill Safonov\u2019s Kodiak, whom he listed as his tent-mate. Confirm before layout is finalized. Emergency contact phone given without a name.',
  },
  {
    full_name: 'Dzmitry Bartosh',
    email: 'dbartosh01@gmail.com',
    phone: '(860) 776-3946',
    arrival_date: ARRIVAL,
    arrival_method: 'car',
    departure_date: DEPARTURE,
    departure_method: 'car',
    early_arrival: false,
    shelter_type: 'tent',
    shelter_length_ft: 13,
    shelter_width_ft: 13,
    shelter_height_ft: 6.4,
    tent_make_model: 'Danchel Yurt 13x13x6.4 (2 person)',
    // Form answer was "I want to talk about bringing a vehicle" — not a yes.
    bringing_vehicle: false,
    vehicle_info: 'Wants to discuss bringing a vehicle \u2014 not yet confirmed.',
    power_required: false,
    power_type: 'none',
    kitchen_participation: true,
    strike_participation: true,
    build_week_attending: false,
    volunteer_commitment: true,
    sober_shifts: true,
    background_check_consent: true,
    medical_conditions: 'No',
    medications: 'No',
    allergies: 'No allergies',
    dietary_restrictions: 'No restrictions',
    emergency_contact: 'Alex, +1 (561) 254-4169',
    emergency_contact_name: 'Alex',
    emergency_contact_number: '+1 (561) 254-4169',
    special_requests:
      'Grace Zhao and Han (ex-roommates) recommended the camp. I\u2019m part in a group of 5, all Burning Man virgins :) Most of us are from NYC and we would love to join the deli camp. Yvonne just spoke with Brian I believe',
    what_attracted_you:
      'I live in NYC and I\u2019ve heard great things about NYC Deli from Grace and Han who I lived and did acro with. I\u2019d love to meet more adventurous people in nyc who love outdoors, music and building something unique',
    custom_skills:
      'I used to be an outdoor orientation leader at college for 4 years so I know my knots. I also speak 3 languages and can make some Belarusian dishes (draniki)',
    character_references: 'Grace Zhao +1 (631) 316-2241; Han @laughing.han',
    first_burn_hopes:
      'Yes, first Burning Man. I\u2019d love to meet new people, get into the burning man community in NYC, work on future trips or projects and perhaps get the first tattoo :)',
    burn_count: '0 (first burn; has attended Burning Man happy hours in NYC)',
    referral_source: 'Grace Zhao and Han',
    notes:
      'Registered 2026-08-15. Goes by "Dzima". Shares the Danchel yurt with Liudmila Paymukhina. Part of a group of 5 first-time burners. Wants to talk to Brian about bringing a vehicle.',
  },
  {
    full_name: 'Liudmila Paymukhina',
    email: 'milanyaxo@gmail.com',
    phone: '(585) 622-3710',
    arrival_date: ARRIVAL,
    arrival_method: 'car',
    departure_date: DEPARTURE,
    departure_method: 'car',
    early_arrival: false,
    shelter_type: 'tent',
    shelter_length_ft: 13,
    shelter_width_ft: 13,
    shelter_height_ft: 6.4,
    tent_make_model: 'Danchel Yurt 13x13x6.4 (2 person)',
    bringing_vehicle: false,
    vehicle_info: 'Wants to discuss bringing a vehicle \u2014 not yet confirmed.',
    power_required: false,
    power_type: 'none',
    kitchen_participation: true,
    strike_participation: true,
    build_week_attending: false,
    volunteer_commitment: true,
    sober_shifts: true,
    background_check_consent: true,
    medical_conditions: 'N/A',
    medications: 'N/A',
    allergies:
      'Only pollen allergies sometimes during spring (I just sneeze, nothing life-threatening), I\u2019ll grab antihistamine with me just in case',
    dietary_restrictions: 'N/A',
    emergency_contact: 'Stefanija (friend), +1 (312) 404-8632',
    emergency_contact_name: 'Stefanija',
    emergency_contact_number: '+1 (312) 404-8632',
    emergency_contact_relationship: 'Friend',
    special_requests: 'Would love to know what you are looking for in new burners joining the camp!',
    what_attracted_you:
      'Love the idea of bringing the spirit of the greatest city on the world to the desert!',
    custom_skills: 'Great at card games!',
    character_references: 'Dzima, +1 (860) 776-3946 and Stefanija, +1 (312) 404-8632',
    first_burn_hopes: 'Connect with other campers and join the community!',
    burn_count: '0',
    referral_source: 'Grace Zhao and Han',
    notes:
      'Registered 2026-08-15. Goes by "Mila". Shares the Danchel yurt with Dzmitry Bartosh. Wants to talk to Brian about bringing a vehicle.',
  },
]

// Bidirectional tent shares, keyed by email.
const TENT_SHARES = [
  ['kifbellholland@gmail.com', 'kirillsafonow@gmail.com'],
  ['dbartosh01@gmail.com', 'milanyaxo@gmail.com'],
]

async function findAuthUser(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (hit) return hit
    if (data.users.length < 1000) return null
  }
}

const camperIds = {}

for (const camper of CAMPERS) {
  const email = camper.email.toLowerCase()

  let userId
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  })

  if (createErr) {
    if (!/already/i.test(createErr.message)) throw createErr
    const existing = await findAuthUser(email)
    if (!existing) throw new Error(`${email}: reported as existing but not found`)
    userId = existing.id
    console.log(`${camper.full_name}: auth user already existed (${userId})`)
  } else {
    userId = created.user.id
    console.log(`${camper.full_name}: auth user created (${userId})`)
  }

  const { data: camperRow, error: camperErr } = await admin
    .from('campers')
    .upsert(camper, { onConflict: 'email' })
    .select('id')
    .single()
  if (camperErr) throw camperErr
  camperIds[email] = camperRow.id
  console.log(`  camper row: ${camperRow.id}`)

  const { error: profErr } = await admin
    .from('user_profiles')
    .update({
      role: 'user',
      camper_id: camperRow.id,
      approved_at: new Date().toISOString(),
      approved_by: userId,
      denied_at: null,
      denied_reason: null,
    })
    .eq('id', userId)
  if (profErr) throw profErr
  console.log(`  profile approved as 'user' and linked`)
}

for (const [aEmail, bEmail] of TENT_SHARES) {
  const { data: rows, error } = await admin
    .from('campers')
    .select('id, full_name, email')
    .in('email', [aEmail, bEmail])
  if (error) throw error
  const a = rows.find((r) => r.email.toLowerCase() === aEmail)
  const b = rows.find((r) => r.email.toLowerCase() === bEmail)
  if (!a || !b) {
    console.warn(`tent share skipped: ${aEmail} <-> ${bEmail} (missing camper row)`)
    continue
  }
  await admin.from('campers').update({ sharing_tent_with: b.id }).eq('id', a.id)
  await admin.from('campers').update({ sharing_tent_with: a.id }).eq('id', b.id)
  console.log(`tent share linked: ${a.full_name} <-> ${b.full_name}`)
}

console.log(`\nDone. Temporary password for all three: ${PASSWORD} (forced change on first login).`)
