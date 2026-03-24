import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env.local manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const email = 'jessica.r.latorre@gmail.com';
const password = 'NYC2026!';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!serviceRoleKey || !supabaseUrl) {
  console.error('Missing environment variables. Ensure .env.local has SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.');
  process.exit(1);
}

// Step 1: Find the user by email
console.log(`Looking up user: ${email}`);
const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=100`, {
  headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey },
});

if (!listRes.ok) {
  console.error('Failed to list users:', await listRes.text());
  process.exit(1);
}

const listData = await listRes.json();
const user = listData.users?.find(u => u.email.toLowerCase() === email.toLowerCase());

if (!user) {
  console.error(`User not found: ${email}`);
  console.log('Available users:', listData.users?.map(u => u.email).join(', '));
  process.exit(1);
}

console.log(`Found user: ${user.id} (${user.email})`);

// Step 2: Update the password
console.log('Setting password...');
const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ password }),
});

if (!updateRes.ok) {
  const errData = await updateRes.text();
  console.error('Failed to update password:', errData);
  process.exit(1);
}

console.log(`✅ Password set successfully for ${email}`);
