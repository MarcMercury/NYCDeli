// One-off sync for the 8/14–8/15 2026 registration form responses.
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

const NEW_CAMPERS = [
  {
    email: 'yvonnehong0520@gmail.com',
    full_name: 'Yuyang Hong',
    playa_name: 'Yvonne',
    phone: '(650) 420-8578',
    bringing_vehicle: false,
    shelter_type: 'tent',
    shelter_length_ft: 10,
    shelter_width_ft: 10,
    shelter_height_ft: 6,
    tent_make_model: 'Coleman Standup',
    emergency_contact: 'Liz (best friend), 9146894066',
    emergency_contact_name: 'Liz Sinyavin',
    emergency_contact_number: '(914) 689-4066',
    emergency_contact_relationship: 'Friend',
    medical_conditions: null,
    medications: null,
    allergies: 'Shrimp — causes a slight rash',
    dietary_restrictions: null,
    referral_source: 'Grace Zhao and Han',
    what_attracted_you:
      "My burner friends all tell the same story about their first Burn, and it's always about the people they still see years later. That's the thing I actually want, and it's why I'm applying to a camp instead of just figuring out how to survive the week with a few friends. I found your Instagram through Grace, and the aesthetic and the music got me: it reads like a camp of people with genuine taste who are also having a very good time. A 70-person camp drawing from all over, doing something as specific and silly as running a deli in the desert, seems like it collects interesting people from wildly different backgrounds — which is exactly who I want to be handing bagels to strangers with at 11am.\n\nThe deli itself is the other half. I live in New York and one of my most delightful moments in New York was deliriously getting ready at 4:30am before the Knicks parade and finding out that my local deli opened early just that day for the parade!! I brought back some confetti to the deli guy after the parade haha. Serving that on playa for two hours a day is a very funny and very generous thing to do, and I'd like to be one of the people doing it.\n\nThe practical side sealed it. I'd spent weeks pricing out ways to solve the heat myself — a generator and AC shipped in a NYC community container, or renting a cargo van in SF and sleeping in it with the engine running — and every version was expensive, fragile, and fundamentally about enduring the week rather than being in it. Shade over every tent, 700lb of ice a day, a quiet block because camp chooses its neighbors: that's infrastructure I couldn't build alone and didn't want to spend my first Burn babysitting. I'd much rather put that energy into camp.",
    custom_skills:
      "Studied product design in college with a focus on physical design — mostly laser cutting and 3D printing. Comfortable with hand tools; habits transfer: designing for real constraints, working to tolerance, prototyping, and finishing what she starts.\n\nOffered to fabricate things for camp (laser-cut menu boards, deli signage, camp/kitchen labels, camper name badges) — realistically for future years given how close we are to the burn, but happy to take direction and try something small this year.\n\nProfessionally a product manager at Google: useful on prioritization and logistics — schedules, shift rosters, tracking who owes what, and figuring out what actually matters within constraints. Genuinely fine doing the boring jobs too.",
    skills: ['construction', 'art', 'logistics'],
    character_references: 'Liz Sinyavin — best friend, backpacked Patagonia together, (914) 689-4066\nJiahui Chen — ex-roommate, (650) 420-8566',
    first_burn_hopes:
      "Yes — first Burn ever. The honest reason I'm going is that I want to find out who I am outside my usual context. My life in New York is pretty structured, and I've always learned the most about myself when I'm in unexpected situations, when I'm backpacking or traveling. I love exploring new experiences and I'm confident Burning Man will help me understand new aspects of myself.\n\nWhat I want from camp specifically is a balance I don't think I could build on my own: a home base and a wide-open week at the same time. I want a camp where I'm cooking or serving alongside the same faces enough times that we actually become friends — and where the same people will say go, see you at 6am haha. Community I return to, not a group I have to stay with. That balance is hard to find and, from what I can tell, is what a well-run camp gives a first-timer.\n\nPractically: I want to arrive prepared enough to be useful rather than managed — self-sufficient in the dust and heat, reliable on the shifts I sign up for. And as someone with a design and building background, I'd love to be around to understand how a block of Black Rock City actually gets stood up.",
    burn_count: '0',
    special_requests: null,
    volunteer_commitment: true,
    sober_shifts: true,
    background_check_consent: true,
    notes: 'Form response 8/14/2026. Goes by Yvonne (set as playa name). Found camp via Instagram through Grace Zhao. Google PM — strong candidate for shift roster / logistics help. Product design background (laser cutting, 3D printing) — offered fabricated signage and name badges, mainly for future years. Tent-sharing question left blank; assumed solo.',
  },
  {
    email: 'tara.rittle@gmail.com',
    full_name: 'Tara Lynn Rittle',
    phone: '(404) 909-4610',
    bringing_vehicle: false,
    shelter_type: 'tent',
    shelter_length_ft: 7,
    shelter_width_ft: 7,
    shelter_height_ft: null,
    tent_make_model: 'TomorrowWorld teepee',
    emergency_contact: 'Luis Mendoza (404-202-7757)',
    emergency_contact_name: 'Luis Mendoza',
    emergency_contact_number: '(404) 202-7757',
    emergency_contact_relationship: null,
    medical_conditions: null,
    medications: null,
    allergies: null,
    dietary_restrictions: "Vegetarian-leaning / pescatarian, but will eat what's available",
    referral_source: 'Saw the registration link in a Facebook post',
    what_attracted_you: 'Wanted a new vibe after her previous bar-themed camp, and was looking for good camp infrastructure.',
    custom_skills:
      "Problem solver by trade with medical knowledge and skills (veterinarian). \"People can be animals, so I've got you covered.\" Decent sense of humor, positive outlook, strong MacGyver tendencies.",
    skills: ['medical', 'construction'],
    character_references: 'Destiny Baez - (404) 791-8540\nDave Slodki - (323) 896-2965',
    first_burn_hopes:
      "First time with NYC Deli (not her first Burn). Loves meeting new people in camp — has great friends from previous burns and likes the idea of \"friends I haven't met yet.\"",
    burn_count: '2 (BRC 2016, BRC 2017)',
    special_requests: null,
    volunteer_commitment: true,
    sober_shifts: true,
    background_check_consent: true,
    notes: 'Form response 8/14/2026. Solo traveler, not sharing a tent. Veterinarian — real medical skill on the roster. No personal referrer: found the link in a Facebook post, so the two character references are the only vouching. Tent is an old TomorrowWorld teepee, "~6-7ft square base" — recorded as 7x7, height unknown, confirm before layout.',
  },
  {
    email: 'zhcchz@gmail.com',
    full_name: 'Christopher David Arthur Stevenson',
    phone: '(415) 609-0646',
    bringing_vehicle: true,
    vehicle_info: 'Wants to bring vehicle. RV - Roadrunner "Family Freedom". Coming in with the RV for build week.',
    shelter_type: 'rv',
    shelter_length_ft: 31,
    shelter_width_ft: 10,
    shelter_height_ft: 10,
    arrival_date: '2026-08-22',
    early_arrival: true,
    build_week_attending: true,
    power_required: true,
    power_type: 'high',
    emergency_contact: 'Michael Malinowski (friend) +1 (415) 806-6947',
    emergency_contact_name: 'Michael Malinowski',
    emergency_contact_number: '(415) 806-6947',
    emergency_contact_relationship: 'Friend',
    medical_conditions: 'Heart valve replacement 5 years ago — no current issues',
    medications: 'Lamotrigine (prescription) — does not require refrigeration',
    allergies: null,
    dietary_restrictions: null,
    referral_source: 'Jnaneshwar Das ("JD") — Swing City + artist',
    what_attracted_you: "JD's recommendation, and DuckPond is taking a year off. Knows NYC Deli from previous years.",
    custom_skills: 'Former BRC Green Dot Ranger. Camped 10+ years with DuckPond and Rangered at the Burn.',
    skills: ['logistics', 'construction'],
    character_references: 'Robin Guido ("Mama Duck") - (415) 710-7781',
    first_burn_hopes: 'Not a first Burn. Wants to give back to the playa and help JD with his art.',
    burn_count: '12ish (including 1 AfrikaBurn)',
    special_requests: "Friend of JD (Swing City, artist this year). Coming in with an RV for build week. Would be sharing with Alex Bien (friend, second-time burner) — Alex is not on the roster and has not registered.",
    volunteer_commitment: true,
    sober_shifts: true,
    background_check_consent: true,
    notes: 'Form response 8/15/2026. NOT a firm yes — answered "Hoping to camp with you" rather than "Yes!". Wants to talk about the vehicle. RV dimensions estimated at 31x10x10 (Roadrunner "Family Freedom") — confirm actual length and whether an EA pass is secured for the 8/22 build-week arrival. Dietary answer was "Nine" — read as "None", confirm. Listed Alex Bien as a tent/RV share; Alex has no registration on file.',
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
      if (u) {
        // Force the shared starter password so the camper can sign in.
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${u.id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ password, email_confirm: true }),
        });
        return { id: u.id, existed: true };
      }
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
  const emails = NEW_CAMPERS.map(c => c.email);
  const existing = await fetch(
    `${supabaseUrl}/rest/v1/campers?select=id,email,full_name&email=in.(${emails.join(',')})`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  ).then(r => r.json());
  const byEmail = new Map(existing.map(c => [c.email.toLowerCase(), c]));

  console.log(`${existing.length} of ${emails.length} emails already in campers.\n`);

  for (const c of NEW_CAMPERS) {
    if (byEmail.has(c.email)) {
      console.log(`⏭️  ${c.email} already has a camper profile — skipping.`);
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
    console.log(`🆕 created ${c.full_name} <${c.email}> (auth ${existed ? 'existed → password reset' : 'new'}) camper=${camperId}`);
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
