// Set up a camper profile named "NYC Deli Admin" for the existing
// nycdelicamp@gmail.com admin account and link it to that user_profile.
// The account already exists as role=admin with no camper linked.
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'hjmqwueengqqubzolycn';
const EMAIL = 'nycdelicamp@gmail.com';

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN (.env.local).');
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

// ── Step 1: confirm the auth profile exists ─────────────────────────
const prof = await runSQL(`SELECT id, role, camper_id FROM user_profiles WHERE email = ${q(EMAIL)};`);
if (!prof[0]) {
  console.error(`No user_profile found for ${EMAIL}. Aborting.`);
  process.exit(1);
}
const userId = prof[0].id;
console.log('Found profile:', userId, '(role:', prof[0].role + ')');

// ── Step 2: upsert the camper record ────────────────────────────────
const camper = {
  full_name: 'NYC Deli Admin',
  email: EMAIL,
  arrival_date: '2026-08-30',
  arrival_method: 'car',
  departure_date: '2026-09-07',
  shelter_type: 'tent',
  shelter_length_ft: 1,
  shelter_width_ft: 1,
  is_admin: true,
  notes: 'NYC Deli camp admin account (nycdelicamp@gmail.com).',
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

// ── Step 3: link the profile to the camper (keep admin role) ────────
await runSQL(`
  UPDATE user_profiles
  SET camper_id = ${q(camperId)},
      approved_at = COALESCE(approved_at, NOW()),
      approved_by = COALESCE(approved_by, id)
  WHERE id = ${q(userId)};`);
console.log('Profile linked to camper. Done.');
