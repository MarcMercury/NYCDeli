import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const SKIP_EMAIL = 'marc.h.mercury@gmail.com';
const NEW_PASSWORD = 'NYCDELI2026!';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!serviceRoleKey || !supabaseUrl) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

// Page through all users
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

console.log(`Found ${allUsers.length} total users.`);

let updated = 0;
let skipped = 0;
let failed = 0;

for (const user of allUsers) {
  const email = (user.email ?? '').toLowerCase();
  if (!email) {
    skipped += 1;
    console.log(`- skip (no email): ${user.id}`);
    continue;
  }
  if (email === SKIP_EMAIL.toLowerCase()) {
    skipped += 1;
    console.log(`- skip (excluded): ${email}`);
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

console.log(`\nDone. Updated: ${updated}  Skipped: ${skipped}  Failed: ${failed}`);
