// Apply new tent-detail submissions (June 2026) for four campers.
// Source: camper form responses (timestamps 6/23–6/24/2026).
// Each update is keyed by email and only touches fields that changed.
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
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`SQL error: ${await res.text()}`);
  return res.json();
}

function q(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

// email -> { field: value } of ONLY the columns to change.
const updates = [
  {
    email: 'alexwritesprograms@gmail.com', // Alex Chojnacki — square 10x10, Kodiak Flex-Bow VX
    set: { shelter_height_ft: 6.6, tent_opening_side: 'length' },
  },
  {
    email: 'allieshuldman@gmail.com', // Allie Shuldman — rectangle 9x14x6 (72in), opens both
    // NOTE: wants to share with Fahim Ferdous, who is not a registered camper,
    // so sharing_tent_with (a UUID FK) cannot be linked. Recorded in notes instead.
    set: {
      shelter_length_ft: 9,
      shelter_height_ft: 6,
      tent_opening_side: 'both',
      tent_make_model: 'https://www.amazon.com/dp/B00VFH1RQS',
      notes: 'Sharing tent with Fahim Ferdous (not yet registered as a camper).',
    },
  },
  {
    email: 'daniel.bandong@gmail.com', // Daniel Bandong — square 10x10x6.5, opens width
    set: { tent_opening_side: 'width' },
  },
  {
    email: 'twbklyn@gmail.com', // John House — rectangle 12x14x8, 2 entrances, Coleman, external frame
    set: {
      shelter_length_ft: 12,
      shelter_height_ft: 8,
      tent_entrance_count: 2,
      tent_make_model: 'Coleman',
      notes: 'Tent: external skeleton frame, uses guy ropes for stabilization.',
    },
  },
];

for (const u of updates) {
  const assignments = Object.entries(u.set)
    .map(([k, v]) => `${k} = ${q(v)}`)
    .join(', ');
  const sql = `UPDATE campers SET ${assignments}, updated_at = NOW() WHERE email = ${q(u.email)} RETURNING full_name, shelter_length_ft, shelter_width_ft, shelter_height_ft, tent_entrance_count, tent_opening_side, tent_make_model, sharing_tent_with;`;
  const r = await runSQL(sql);
  console.log('•', u.email, '→', JSON.stringify(r[0] || '(no row)'));
}

console.log('Done.');
