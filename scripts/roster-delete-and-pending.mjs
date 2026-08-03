// One-off: fully delete listed people (camper + auth user + profile) and move
// others to `pending` role. Mirrors deleteUserEntityAction (src/app/actions/admin.ts).
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TENT_COLS = [
  'sharing_tent_with', 'sharing_tent_with_2', 'sharing_tent_with_3',
  'sharing_tent_with_4', 'sharing_tent_with_5',
];

const toDelete = [
  { name: 'Tori Lynn Leibovic', camperId: '16cfd804-4999-45ef-ab97-7a427204a1bf', profileId: '7bbe717a-c17b-43db-8391-120050c41177' },
  { name: 'Matthew Jon Furlow', camperId: 'e46ca499-1381-48e8-b5bb-ce220a393ed8', profileId: 'a2becd08-b133-4667-a11c-6d18904fce10' },
  { name: 'Sharon Renee McCoy', camperId: 'd41f9ca7-a29d-4b31-8ae4-6c918458412b', profileId: '3fa85c1b-ada9-415a-becd-5494b1f5d5b2' },
];

const toPending = [
  { name: 'Allison (Allie) Vaeth', profileId: 'fb99f0ba-5899-4cc0-853e-568dcae88764' },
  { name: 'Andra Salumaa', profileId: 'a434f5b8-b42d-4214-9b76-f6eeed60a713' },
  { name: 'Casandra Silva', profileId: '4d285b53-7f51-46fb-b4f8-531f896e699a' },
  { name: 'Jessica Markowitz', profileId: '4b439a8b-44ee-4871-87f1-a6cf0e8f8e2b' },
  { name: 'Joshua Wade Munzenrider', profileId: '6ffee4cb-c4d4-409d-8cee-8363728499bb' },
  { name: 'Richard Correia Valente', profileId: 'bf8c5ab6-fe53-4c45-9b51-c544df5e3c9d' },
  { name: 'Richard Shalom Mizrahi', profileId: '007b8423-a0e0-4acb-b64a-8b007bf72fe5' },
  { name: 'Sagar Tiwari', profileId: '748e1701-f386-4426-99aa-687444592a61' },
];

async function main() {
  console.log('=== DELETING ===');
  for (const p of toDelete) {
    for (const col of TENT_COLS) {
      await supabase.from('campers').update({ [col]: null }).eq(col, p.camperId);
    }
    const { error: cErr } = await supabase.from('campers').delete().eq('id', p.camperId);
    if (cErr) { console.error(`  ✗ ${p.name} camper delete: ${cErr.message}`); continue; }
    const { error: aErr } = await supabase.auth.admin.deleteUser(p.profileId);
    if (aErr) { console.error(`  ✗ ${p.name} auth delete: ${aErr.message}`); continue; }
    console.log(`  ✓ deleted ${p.name}`);
  }

  console.log('=== MOVING TO PENDING ===');
  for (const p of toPending) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: 'pending' })
      .eq('id', p.profileId);
    if (error) { console.error(`  ✗ ${p.name}: ${error.message}`); continue; }
    console.log(`  ✓ pending ${p.name}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
