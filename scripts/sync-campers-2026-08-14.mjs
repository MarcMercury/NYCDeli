// One-off sync for the 8/11–8/12 2026 registration form responses.
// Creates campers + auth accounts for new submissions; fills gaps on existing ones.
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
const DEFAULT_PASSWORD = 'NYCDeli2026!';

if (!serviceRoleKey || !supabaseUrl || !accessToken) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Submissions ─────────────────────────────────────────────────
// Fields left undefined fall back to the camper defaults below.
const NEW_CAMPERS = [
  {
    email: 'rachel@rachelslee.com',
    full_name: 'Rachel Sylvia Lee',
    phone: '(310) 499-8194',
    bringing_vehicle: false,
    shelter_type: 'tent',
    shelter_length_ft: 10,
    shelter_width_ft: 10,
    shelter_height_ft: null,
    emergency_contact: 'Mom, 949-233-9072',
    emergency_contact_name: 'Mom',
    emergency_contact_number: '(949) 233-9072',
    emergency_contact_relationship: 'Mom',
    medical_conditions: null,
    medications: null,
    allergies: 'Shellfish — triggers asthma',
    dietary_restrictions: 'Shellfish, pork, beef',
    what_attracted_you: 'Aric recommended it. Likes the air conditioning amenity. Also interested in bike rental.',
    referral_source: 'Aric Fedida',
    character_references: 'Amanda West - (301) 956-6626\nJacob Lee - (949) 230-6356',
    first_burn_hopes: 'First Burning Man. Hopes to meet cool friends and have a fun time — relax, dance, explore, network.',
    burn_count: '0',
    custom_skills: 'DJ. Happy to help with anything, including cooking.',
    skills: ['dj', 'cooking'],
    special_requests: 'Still needs to buy a ticket — can purchase in LA unless camp has a connection. Interested in bike rental.',
    volunteer_commitment: true,
    sober_shifts: true,
    background_check_consent: true,
    notes: 'Form response 8/12/2026. Tent size not final — said "thinking a 10x10 solo"; confirm before layout. No prior burns (4-night music festivals only).',
  },
  {
    email: 'ethan.a.reeder@gmail.com',
    full_name: 'Ethan Alexander Reeder',
    phone: '(347) 466-3205',
    bringing_vehicle: false,
    shelter_type: 'tent',
    shelter_length_ft: 10,
    shelter_width_ft: 10,
    shelter_height_ft: null,
    emergency_contact: 'Jenny, 312-843-9528',
    emergency_contact_name: 'Jenny',
    emergency_contact_number: '(312) 843-9528',
    emergency_contact_relationship: null,
    medical_conditions: null,
    medications: null,
    allergies: null,
    dietary_restrictions: null,
    what_attracted_you: 'Loves NYC and knows some folks in camp.',
    referral_source: 'Brian',
    character_references: null,
    first_burn_hopes: 'Hopes for a well-run camp to learn from and delight with.',
    burn_count: '1',
    custom_skills: 'Can use power tools, is tall, and is good at napkin math (has helped at the burn before).',
    skills: ['construction'],
    special_requests: null,
    volunteer_commitment: true,
    sober_shifts: true,
    background_check_consent: true,
    notes: 'Form response 8/12/2026. No tent dimensions submitted — defaulted to 10x10 solo, confirm before layout. No character references listed (referred directly by Brian).',
  },
  {
    email: 'steinbergisaac@gmail.com',
    full_name: 'Isaac Steinberg',
    phone: '(917) 912-2800',
    bringing_vehicle: false,
    shelter_type: 'tent',
    shelter_length_ft: 10,
    shelter_width_ft: 10,
    shelter_height_ft: 6,
    tent_make_model: 'Kodiak',
    emergency_contact: 'Abi, 9173555586',
    emergency_contact_name: 'Abi',
    emergency_contact_number: '(917) 355-5586',
    emergency_contact_relationship: null,
    medical_conditions: null,
    medications: null,
    allergies: null,
    dietary_restrictions: null,
    what_attracted_you: 'New Yorker who loves to burn, build, and meet new people.',
    referral_source: 'Andrew Watrous',
    character_references: null,
    first_burn_hopes: null,
    burn_count: '5',
    custom_skills: 'Yoga, coder. Has worked on 2 art installations and 1 art car.',
    skills: ['art', 'construction'],
    special_requests: null,
    volunteer_commitment: true,
    sober_shifts: true,
    background_check_consent: true,
    notes: 'Form response 8/12/2026. Kodiak 10x10x6 solo. Returning burner (5 burns) — possible build-week candidate given art install / art car experience.',
  },
];

// Gap-fill only: existing richer values are preserved, blanks/placeholders replaced.
const UPDATES = [
  {
    email: 'deanprestons@gmail.com',
    set: {
      full_name: 'Dean Preston Shtainhorn',
      phone: '(973) 495-9832',
      allergies: 'Poison ivy',
      dietary_restrictions: null,
      emergency_contact: 'Ryan, my brother, 9737528646',
      emergency_contact_name: 'Ryan Shtainhorn',
      emergency_contact_number: '(973) 752-8646',
      emergency_contact_relationship: 'Brother',
      referral_source: 'Peter Atkins (met Brian at Shabbat at BM)',
      first_burn_hopes: 'First Burning Man. Hoping to make new friends and help out however he can.',
      custom_skills: 'Emmy-nominated TV producer and writer. Amateur paleontologist/geologist and physics nerd. Excellent barista (brings his own coffee to make for everyone). Great at finding lost things. Cooks, neat and organized, loves adding aesthetics to a space. Knicks in 5.',
      volunteer_commitment: true,
      sober_shifts: true,
      background_check_consent: true,
      notes: 'Updated from form response 8/11/2026. Wants to talk about bringing a vehicle (previously rented an RV). Unsure what to bring that would be helpful — wants orientation from the group. Graves disease under control.',
    },
  },
];

// ─── Supabase helpers ────────────────────────────────────────────
async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`SQL error: ${await res.text()}`);
  return res.json();
}

async function createAuthUser(email, password) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err.msg || err.message || '').toLowerCase();
    if (msg.includes('already') || msg.includes('exists')) {
      const list = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=2000`, {
        headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
      }).then(r => r.json());
      const u = list.users?.find(x => x.email?.toLowerCase() === email.toLowerCase());
      if (u) return { id: u.id, existed: true };
    }
    throw new Error(`auth user err ${email}: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return { id: data.id, existed: false };
}

function sqlVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return `ARRAY[${v.map(x => `'${String(x).replace(/'/g, "''")}'`).join(', ')}]`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

const CAMPER_DEFAULTS = {
  arrival_date: '2026-08-30',
  arrival_method: 'car',
  departure_date: '2026-09-07',
  departure_method: 'car',
  early_arrival: false,
  orientation_preference: 'any',
  power_required: false,
  power_type: 'none',
  kitchen_participation: true,
  strike_participation: true,
  build_week_attending: false,
};

const ARRAY_CASTS = { skills: 'skill_tag[]', preferred_shift_types: 'shift_type[]', tools_bringing: 'text[]' };
const ENUM_CASTS = {
  arrival_method: 'arrival_method',
  departure_method: 'arrival_method',
  orientation_preference: 'orientation_preference',
  power_type: 'power_type',
  shelter_type: 'shelter_type',
};

function castedVal(col, val) {
  const raw = sqlVal(val);
  if (ARRAY_CASTS[col]) return `${Array.isArray(val) ? raw : `'{}'`}::${ARRAY_CASTS[col]}`;
  if (ENUM_CASTS[col] && val !== null && val !== undefined) return `${raw}::${ENUM_CASTS[col]}`;
  return raw;
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  const emails = [...NEW_CAMPERS.map(c => c.email), ...UPDATES.map(u => u.email)];
  const existing = await fetch(
    `${supabaseUrl}/rest/v1/campers?select=id,email,full_name&email=in.(${emails.join(',')})`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  ).then(r => r.json());
  const byEmail = new Map(existing.map(c => [c.email.toLowerCase(), c]));

  console.log(`Found ${existing.length} of ${emails.length} emails already in campers.\n`);

  for (const u of UPDATES) {
    if (!byEmail.has(u.email)) {
      console.log(`⚠️  ${u.email} expected to exist but was not found — skipping update.`);
      continue;
    }
    const setClauses = Object.entries(u.set).map(([c, v]) => `${c} = ${castedVal(c, v)}`).join(', ');
    const sql = `UPDATE campers SET ${setClauses}, updated_at = NOW() WHERE email = ${sqlVal(u.email)};`;
    if (DRY_RUN) { console.log(`[dry-run] ${sql}\n`); continue; }
    await runSQL(sql);
    console.log(`✅ updated ${u.email}`);
  }

  for (const c of NEW_CAMPERS) {
    if (byEmail.has(c.email)) {
      console.log(`⏭️  ${c.email} already has a camper profile — skipping create.`);
      continue;
    }
    const row = {
      ...CAMPER_DEFAULTS,
      preferred_shift_types: ['any'],
      tools_bringing: [],
      skills: [],
      ...c,
    };
    const cols = Object.keys(row);
    const vals = cols.map(col => castedVal(col, row[col]));
    const sql = `INSERT INTO campers (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING id;`;

    if (DRY_RUN) { console.log(`[dry-run] ${sql}\n`); continue; }

    const { id: userId, existed } = await createAuthUser(c.email, DEFAULT_PASSWORD);
    const result = await runSQL(sql);
    const camperId = Array.isArray(result) && result[0] ? result[0].id : null;

    if (camperId && userId) {
      await runSQL(`
        UPDATE user_profiles
        SET role = (CASE WHEN role = 'admin'::user_role THEN 'admin' ELSE 'user' END)::user_role,
            camper_id = '${camperId}',
            approved_at = COALESCE(approved_at, NOW()),
            approved_by = COALESCE(approved_by, id)
        WHERE id = '${userId}';
      `);
    }
    console.log(`🆕 created ${c.full_name} <${c.email}> (auth ${existed ? 'existed' : 'new'}) camper=${camperId}`);
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
