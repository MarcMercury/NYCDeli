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

const email = 'nycdelicamp@gmail.com';
const password = 'CowboyHatsForever';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'hjmqwueengqqubzolycn';

if (!accessToken || !serviceRoleKey || !supabaseUrl) {
  console.error('Missing environment variables. Ensure .env.local is sourced.');
  process.exit(1);
}

// Step 1: Create auth user
console.log('Creating auth user...');
const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password, email_confirm: true }),
});

let userId;
if (!createRes.ok) {
  const errData = await createRes.json().catch(() => ({}));
  if ((errData.msg || errData.message || '').includes('already been registered')) {
    console.log('User already exists, fetching...');
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=50`, {
      headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey },
    });
    const listData = await listRes.json();
    const existing = listData.users?.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!existing) { console.error('Could not find user'); process.exit(1); }
    userId = existing.id;
    console.log('Found existing user:', userId);
  } else {
    console.error('Failed to create user:', JSON.stringify(errData));
    process.exit(1);
  }
} else {
  const userData = await createRes.json();
  userId = userData.id;
  console.log('Created user:', userId);
}

// Step 2: Promote to admin
console.log('Promoting to admin...');
const updateSql = `UPDATE user_profiles SET role = 'admin', approved_at = NOW(), approved_by = '${userId}' WHERE id = '${userId}';`;
const updateRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: updateSql }),
});
if (!updateRes.ok) {
  const text = await updateRes.text();
  console.error('Update error:', text);
  process.exit(1);
}
console.log('User promoted to admin!');

// Step 3: Verify
const verifySql = `SELECT id, email, role, approved_at FROM user_profiles WHERE email = '${email}';`;
const verifyRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: verifySql }),
});
const verifyData = await verifyRes.json();
console.log('Profile:', JSON.stringify(verifyData, null, 2));
console.log('\n✅ Admin user setup complete!');
console.log(`   Email: ${email}`);
console.log('   Role: admin');
