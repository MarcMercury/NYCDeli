// Set password = NYCDeli2026! for every camper who has NEVER logged in.
// "Camper" = user_profiles row whose role is not 'admin' (pending/user/builder),
// "never logged in" = Supabase auth last_sign_in_at IS NULL.
//
// Dry-run by default. Pass --apply to actually change passwords.
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const NEW_PASSWORD = 'NYCDeli2026!';
const APPLY = process.argv.includes('--apply');

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!serviceRoleKey || !supabaseUrl) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

// 1. Page through all auth users (authoritative last_sign_in_at).
const allUsers = [];
let page = 1;
while (true) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, {
    headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
  });
  if (!res.ok) {
    console.error('Failed to list users:', await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const users = data.users ?? [];
  allUsers.push(...users);
  if (users.length < 200) break;
  page += 1;
}
console.log(`Found ${allUsers.length} total auth users.`);

// 2. Fetch profile roles so we only touch campers (role != 'admin').
const profRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=id,role,camper_id`, {
  headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
});
if (!profRes.ok) {
  console.error('Failed to fetch user_profiles:', await profRes.text());
  process.exit(1);
}
const profiles = await profRes.json();
const roleById = new Map(profiles.map((p) => [p.id, p.role]));

// 3. Select campers who never logged in.
const targets = allUsers.filter((u) => {
  if (u.last_sign_in_at) return false;          // has logged in -> skip
  const role = roleById.get(u.id);
  if (role === 'admin') return false;            // not a camper -> skip
  if (!u.email) return false;
  return true;
});

console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — campers who never logged in: ${targets.length}`);
for (const u of targets) {
  console.log(`  - ${(u.email ?? '').padEnd(40)} [${roleById.get(u.id) ?? 'no profile'}]`);
}

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply to set passwords.');
  process.exit(0);
}

let updated = 0;
let failed = 0;
for (const u of targets) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${u.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: NEW_PASSWORD }),
  });
  if (!res.ok) {
    failed += 1;
    console.error(`✗ ${u.email}: ${await res.text()}`);
  } else {
    updated += 1;
    console.log(`✓ ${u.email}`);
  }
}

console.log(`\nDone. Updated: ${updated}  Failed: ${failed}`);
