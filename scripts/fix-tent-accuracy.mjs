// Fix tent-size accuracy issues identified by review-tent-sizes.mjs.
// 1. Correct dimension mismatches the bulk parser missed.
// 2. Populate tent_make_model with the brand/model portion of the raw form input.
// 3. Clear a stale/junk tent_make_model value.
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

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`SQL error: ${await res.text()}`);
  return res.json();
}

// --- Dimension fixes (per form CSV) ---
const dimFixes = [
  { email: 'laurencrudele43@gmail.com',  type: 'tent',     l: 10,   w: 10,   h: null,  mm: 'Coleman Easy Up' },
  { email: 'allthingsmikedean@gmail.com', type: 'tent',    l: 10,   w: 8.3,  h: 6.5,   mm: 'REI Wonderland' },
  { email: 'marc.h.mercury@gmail.com',   type: 'tent',     l: 14,   w: 10,   h: 7,     mm: 'EVER ADVANCED Blackout' },
  { email: 'aaronsheya@gmail.com',       type: 'tent',     l: 18,   w: 10,   h: 6.5,   mm: 'No Bake Tent v5' },
  { email: 'thomasle43@gmail.com',       type: 'shiftpod', l: 12,   w: 10.7, h: 6.9,   mm: 'Shiftpod Expedition' },
  { email: 'deep5231@yahoo.com',         type: 'shiftpod', l: 12,   w: 10.7, h: 6.9,   mm: 'Shiftpod Expedition' },
  { email: 'qwertey6@gmail.com',         type: 'tent',     l: 10,   w: 9,    h: 6.7,   mm: 'NoBake Tent' },
];

// --- tent_make_model only (dimensions already match) ---
const makeModelOnly = [
  { email: 'alexwritesprograms@gmail.com',        mm: 'Kodiak Flex-Bow VX' },
  { email: 'birmanmorgan@gmail.com',              mm: 'Coleman Skylodge' },
  { email: 'rebekahaterry@gmail.com',             mm: 'Kodiak' },
  { email: 'emily.gonthier@gmail.com',            mm: 'Coleman Standup' },
  { email: 'glenn_zimmerman@msn.com',             mm: 'Coleman 4-person' },
  { email: 'ey247@cornell.edu',                   mm: 'Coleman Standup' },
  { email: 'louiegilot@gmail.com',                mm: 'Kodiak Flex Bow' },
  { email: 'twbklyn@gmail.com',                   mm: 'REI Standup' },
  { email: 'john.keefe@gmail.com',                mm: 'Kodiak Flex-Bow' },
  { email: 'jcrehmann@gmail.com',                 mm: 'Kodiak' },
  { email: 'davidjgoz@gmail.com',                 mm: 'Unknown' },
  { email: 'erik.chan@gmail.com',                 mm: 'Coleman 8-Person Instant Cabin' },
  { email: 'ginamarie.montoya@gmail.com',         mm: 'Core Instant Cabin' },
  { email: 'sgelfand91@gmail.com',                mm: null },
  { email: 'kalimrosendo@gmail.com',              mm: null },
  { email: 'chweny.shin@gmail.com',               mm: 'Coleman 8-Person Instant Cabin' },
  { email: 'sundeepghuman@gmail.com',             mm: 'Shiftpod III' },
  { email: 'tleibovic3@gmail.com',                mm: 'Coleman Standup' },
  { email: 'sophiamarchetti96@gmail.com',         mm: 'Coleman' },
  { email: 'andra.salumaa1@gmail.com',            mm: 'Shiftpod III' },
  { email: 'tatiana.pisetta@gmail.com',           mm: 'No Bake Tent v5' },
  { email: 'silvacasandra@gmail.com',             mm: 'Shiftpod 2' },
  { email: 'allieshuldman@gmail.com',             mm: 'Coleman Sundome' },
  { email: 'deborahfnewman@yahoo.com',            mm: 'Coleman Standup' },
  { email: 'emilykores@gmail.com',                mm: 'Coleman Standup' },
  { email: 'garypierre@gmail.com',                mm: 'No Bake Tent' },
  { email: 'sagart851@gmail.com',                 mm: 'Shift pod' },
  { email: 'graceludwig11@gmail.com',             mm: 'Coleman Easy Up' },
  { email: 'muilenburg.aaron@gmail.com',          mm: 'Coleman Easy Up' },
  { email: 'joanna.e.tsai@gmail.com',             mm: 'Coleman pop-up' },
  { email: 'daniel@danielkorte.com',              mm: 'No Bake Tent' },
  { email: 'akfredericksen@gmail.com',            mm: 'REI Co-op Kingdom' },
  { email: 'daniel.bandong@gmail.com',            mm: 'Kodiak Canvas Flex-Bow Deluxe' },
  { email: 'brian.wagner117@gmail.com',           mm: 'REI Wonderland 6' },
  { email: 'mike.bern@gmail.com',                 mm: 'Coleman Standup' },
  { email: 'fraxenab@outlook.com',                mm: 'Kodiak Canvas' },
  { email: 'melhrubin@gmail.com',                 mm: 'Kodiak' },
  { email: 'cristobal.oltra@gmail.com',           mm: 'Coleman Instant' },
  { email: 'susanxgallo@gmail.com',               mm: 'Shiftpod Mini' },
  { email: 'mlstaples14@gmail.com',               mm: 'REI Wonderland' },
  { email: 'amir@adiburstein123@gmail.com',       mm: null }, // not certain
  { email: 'rich.valente@hey.com',                mm: 'Coleman Sundome' },
];

// --- Clear stale make/model ---
const clearMM = ['mylesinthehouse@gmail.com'];

function q(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

console.log('--- Applying dimension fixes ---');
for (const f of dimFixes) {
  const sql = `UPDATE campers SET shelter_type = ${q(f.type)}, shelter_length_ft = ${q(f.l)}, shelter_width_ft = ${q(f.w)}, shelter_height_ft = ${q(f.h)}, tent_make_model = ${q(f.mm)} WHERE email = ${q(f.email)} RETURNING email, shelter_type, shelter_length_ft, shelter_width_ft, shelter_height_ft, tent_make_model;`;
  const r = await runSQL(sql);
  console.log(' •', f.email, '→', r[0] || '(no row)');
}

console.log('\n--- Setting tent_make_model only ---');
for (const f of makeModelOnly) {
  if (!f.mm) continue;
  const sql = `UPDATE campers SET tent_make_model = ${q(f.mm)} WHERE email = ${q(f.email)} AND (tent_make_model IS NULL OR tent_make_model = '') RETURNING email, tent_make_model;`;
  const r = await runSQL(sql);
  if (r[0]) console.log(' •', r[0].email, '→', r[0].tent_make_model);
  else console.log(' •', f.email, '(no update)');
}

console.log('\n--- Clearing stale tent_make_model ---');
for (const email of clearMM) {
  const sql = `UPDATE campers SET tent_make_model = NULL WHERE email = ${q(email)} RETURNING email, tent_make_model;`;
  const r = await runSQL(sql);
  console.log(' •', email, '→ cleared');
}

console.log('\n✅ Done.');
