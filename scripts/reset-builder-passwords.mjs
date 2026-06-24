import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const NEW_PASSWORD = 'NYCDeli2026!';

const TARGET_EMAILS = [
  'akfredericksen@gmail.com',
  'alexwritesprograms@gmail.com',
  'daniel.bandong@gmail.com',
  'daniel@danielkorte.com',
  'galinka@aol.com',
  'kit.zeller@gmail.com',
  'laurencrudele43@gmail.com',
  'muilenburg.aaron@gmail.com',
  'qwertey6@gmail.com',
].map((e) => e.toLowerCase());

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!serviceRoleKey || !supabaseUrl) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

// Page through all users to build an email -> user map
const usersByEmail = new Map();
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
  for (const u of users) {
    if (u.email) usersByEmail.set(u.email.toLowerCase(), u);
  }
  if (users.length < 200) break;
  page += 1;
}

let updated = 0;
let notFound = 0;
let failed = 0;

for (const email of TARGET_EMAILS) {
  const user = usersByEmail.get(email);
  if (!user) {
    notFound += 1;
    console.warn(`? not found: ${email}`);
    continue;
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
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
    console.error(`✗ ${email}: ${await res.text()}`);
  } else {
    updated += 1;
    console.log(`✓ ${email}`);
  }
}

console.log(`\nDone. Updated: ${updated}  Not found: ${notFound}  Failed: ${failed}`);
