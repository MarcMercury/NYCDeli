// Create Fahim Ferdous: auth login + camper profile, approved as 'user'.
// Also link his tent-share with Allie Shuldman (bidirectional UUID FK).
// Source: registration form submission (timestamp 4/29/2026 0:26:08).
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'hjmqwueengqqubzolycn';

const EMAIL = 'fahimfmf@gmail.com';
const PASSWORD = 'NYCDeli2026!';

if (!accessToken || !serviceRoleKey || !supabaseUrl) {
  console.error('Missing env vars (.env.local).');
  process.exit(1);
}

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`SQL error: ${await res.text()}`);
  return res.json();
}

function q(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return `'${String(v).replace(/'/g, "''")}'`;
}

// ── Step 1: create (or find) the auth user ──────────────────────────
console.log('Creating auth user...');
let userId;
const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
});
if (!createRes.ok) {
  const err = await createRes.json().catch(() => ({}));
  if ((err.msg || err.message || '').includes('already been registered')) {
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=200`, {
      headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
    });
    const listData = await listRes.json();
    const existing = listData.users?.find((u) => u.email.toLowerCase() === EMAIL.toLowerCase());
    if (!existing) { console.error('User exists but not found.'); process.exit(1); }
    userId = existing.id;
    console.log('Auth user already existed:', userId);
  } else {
    console.error('Failed to create auth user:', JSON.stringify(err));
    process.exit(1);
  }
} else {
  userId = (await createRes.json()).id;
  console.log('Auth user created:', userId);
}

// ── Step 2: upsert the camper record ────────────────────────────────
const camper = {
  full_name: 'Fahim Ferdous',
  email: EMAIL,
  phone: '(718) 216-6232',
  arrival_date: '2026-08-30',
  arrival_method: 'car',
  departure_date: '2026-09-07',
  departure_method: 'car',
  early_arrival: false,
  shelter_type: 'tent',
  shelter_length_ft: 7,
  shelter_width_ft: 5,
  shelter_height_ft: null,
  orientation_preference: 'any',
  power_required: false,
  power_type: 'none',
  kitchen_participation: true,
  strike_participation: true,
  build_week_attending: false,
  bringing_vehicle: false,
  volunteer_commitment: true,
  sober_shifts: true,
  background_check_consent: true,
  burn_count: '3 big burns, 0 regional',
  custom_skills: 'I write software, can DJ. Learning building physical things + hardware.',
  what_attracted_you: 'Was essentially a build leader at SnoHo alongside Alex. Would love to go to build this year too.',
  character_references: 'Allie, Nick + Nora, James (Space Cowboy)',
  first_burn_hopes:
    'Hoping to help NYC Deli operate efficiently & reliably, deepen relationships with campmates + neighbors and make the most of my time on the playa exploring.',
  referral_source: 'Allie',
  notes: 'Sharing tent with Allie Shuldman. SnoHo last year (build leader alongside Alex). Has many friends in camp; interested in build week.',
};

const cols = Object.keys(camper);
const vals = cols.map((k) => q(camper[k]));
const insertSQL = `
  INSERT INTO campers (${cols.join(', ')})
  VALUES (${vals.join(', ')})
  ON CONFLICT (email) DO UPDATE SET
    ${cols.filter((c) => c !== 'email').map((c) => `${c} = EXCLUDED.${c}`).join(',\n    ')}
  RETURNING id;`;
const camperRes = await runSQL(insertSQL);
const camperId = camperRes[0].id;
console.log('Camper record upserted:', camperId);

// ── Step 3: link & approve the profile ──────────────────────────────
await runSQL(`
  UPDATE user_profiles
  SET role = (CASE WHEN role = 'admin' THEN 'admin' ELSE 'user' END)::user_role,
      camper_id = ${q(camperId)},
      approved_at = COALESCE(approved_at, NOW()),
      approved_by = COALESCE(approved_by, id)
  WHERE id = ${q(userId)};`);
console.log('Profile linked & approved as user.');

// ── Step 4: wire the tent-share with Allie (bidirectional) ──────────
const allie = await runSQL(`SELECT id FROM campers WHERE email = 'allieshuldman@gmail.com';`);
if (allie[0]) {
  const allieId = allie[0].id;
  await runSQL(`UPDATE campers SET sharing_tent_with = ${q(allieId)}, updated_at = NOW() WHERE id = ${q(camperId)};`);
  await runSQL(`
    UPDATE campers
    SET sharing_tent_with = ${q(camperId)},
        notes = 'Sharing tent with Fahim Ferdous.',
        updated_at = NOW()
    WHERE id = ${q(allieId)};`);
  console.log('Linked tent-share: Fahim <-> Allie.');
} else {
  console.warn('Allie Shuldman not found — tent-share not linked.');
}

console.log('\nDone. Login:', EMAIL, '/', PASSWORD);
