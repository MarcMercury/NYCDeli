// Create login accounts (auth.users -> user_profiles) for two roster-only campers.
//  - Lauren Hoffmann (goes by "Levonah"): real email + full registration details
//    (Registration form submission 5/21/2026 17:00:27).
//  - Mikhail Lara: existing placeholder email (no real email available yet).
// Both already have campers rows + generated tents; this adds the account layer.
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

async function ensureAuthUser(email) {
  const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  if (createRes.ok) {
    const id = (await createRes.json()).id;
    console.log(`  auth user created: ${email} -> ${id}`);
    return id;
  }
  const err = await createRes.json().catch(() => ({}));
  if (!(err.msg || err.message || '').includes('already been registered')) {
    throw new Error(`Failed to create auth user ${email}: ${JSON.stringify(err)}`);
  }
  const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=500`, {
    headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
  });
  const listData = await listRes.json();
  const existing = listData.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw new Error(`Auth user ${email} exists but not found in list.`);
  console.log(`  auth user already existed: ${email} -> ${existing.id}`);
  return existing.id;
}

async function linkAndApprove(userId, camperId) {
  await runSQL(`
    UPDATE user_profiles
    SET role = (CASE WHEN role = 'admin' THEN 'admin' ELSE 'user' END)::user_role,
        camper_id = ${q(camperId)},
        approved_at = COALESCE(approved_at, NOW()),
        approved_by = COALESCE(approved_by, id)
    WHERE id = ${q(userId)};`);
  console.log('  profile linked & approved as user.');
}

// ─────────────────────────────────────────────────────────────────────
// 1) Lauren Hoffmann ("Levonah") — real email + full details
// ─────────────────────────────────────────────────────────────────────
console.log('\n[Lauren Hoffmann / Levonah]');
const LAUREN_ID = '7b7cc0be-2731-4066-9290-cdc1e4a47778'; // existing campers.id
const LAUREN_EMAIL = 'levonahhoffmann@gmail.com';

const laurenFields = {
  full_name: 'Lauren Hoffmann',
  playa_name: 'Levonah',
  email: LAUREN_EMAIL,
  phone: '(503) 707-2958',
  bringing_vehicle: false,
  referral_source:
    'First big burn — Love Burn neighbors; considers Deli her burn extended family. Brian gave her the link (could equally have been Brittany, Gepetto, Mendel, Miles, Abbey).',
  special_requests:
    'Solo; not sure of tent model yet, will consider sharing if it makes logistical sense. Receiving tent from a friend; will confirm make/model once seen in person.',
  emergency_contact: 'Dad, (503) 939-7068',
  emergency_contact_name: 'Dad',
  emergency_contact_number: '(503) 939-7068',
  emergency_contact_relationship: 'Father',
  dietary_restrictions: 'Gluten and dairy',
  what_attracted_you:
    '#1, I trust Brian as an amazing leader — this is my most important criteria. Second, I am already familiar with the Deli fam from Love Burn. Third, I appreciate the robust array of resources. Lastly, fun!!',
  custom_skills:
    'Sewing, high-end craft, decor, elite communication and de-escalation skills, and being fun AF! Also an amazing cook, used to high volume.',
  first_burn_hopes:
    'Community to both support and be supported by, entertain the people, and have a smooth landing for my first Big Burn.',
  burn_count: '5x Love Burn (first Big Burn)',
  volunteer_commitment: true,
  sober_shifts: true,
  background_check_consent: true,
  kitchen_participation: true,
};

const setClause = Object.entries(laurenFields)
  .map(([k, v]) => `${k} = ${q(v)}`)
  .join(',\n      ');
await runSQL(`UPDATE campers SET ${setClause}, updated_at = NOW() WHERE id = ${q(LAUREN_ID)};`);
console.log('  camper record updated (renamed Levonah -> Lauren Hoffmann, full details).');

// keep the generated tent label in sync with the roster full_name
await runSQL(`
  UPDATE floorplan_objects
  SET label = 'Lauren Hoffmann', updated_at = NOW()
  WHERE object_type = 'tent' AND label = 'Levonah Hoffmann';`);
console.log('  tent label synced to "Lauren Hoffmann".');

const laurenAuthId = await ensureAuthUser(LAUREN_EMAIL);
await linkAndApprove(laurenAuthId, LAUREN_ID);

// ─────────────────────────────────────────────────────────────────────
// 2) Mikhail Lara — placeholder email (no real email available)
// ─────────────────────────────────────────────────────────────────────
console.log('\n[Mikhail Lara]');
const MIKHAIL_ID = 'ae1f90f0-f4ba-4771-9b97-65c587af0de5';
const MIKHAIL_EMAIL = 'mikhail.lara.pdf@placeholder.local';
const mikhailAuthId = await ensureAuthUser(MIKHAIL_EMAIL);
await linkAndApprove(mikhailAuthId, MIKHAIL_ID);

console.log('\nDone.');
console.log(`  Lauren Hoffmann  -> ${LAUREN_EMAIL} / ${PASSWORD}`);
console.log(`  Mikhail Lara     -> ${MIKHAIL_EMAIL} / ${PASSWORD}  (placeholder — swap when real email known)`);
