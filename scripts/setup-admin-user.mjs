import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRef = 'hjmqwueengqqubzolycn';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!accessToken || !serviceRoleKey || !supabaseUrl) {
  console.error('Missing environment variables. Ensure .env.local is sourced.');
  process.exit(1);
}

// Step 1: Apply migration 007
console.log('=== Step 1: Applying migration 007_auth_profiles_photos.sql ===');
const sqlFile = join(__dirname, '..', 'supabase', 'migrations', '007_auth_profiles_photos.sql');
const sql = readFileSync(sqlFile, 'utf-8');

const migrationRes = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  }
);

if (!migrationRes.ok) {
  const text = await migrationRes.text();
  // Check if it's just "already exists" errors
  if (text.includes('already exists')) {
    console.log('Migration tables already exist, continuing...');
  } else {
    console.error(`Migration error ${migrationRes.status}: ${text}`);
    process.exit(1);
  }
} else {
  console.log('Migration 007 applied successfully!');
}

// Step 2: Create auth user via Supabase Admin API
console.log('\n=== Step 2: Creating admin auth user ===');
const email = 'Marc.H.Mercury@gmail.com';
const password = 'Gold_1234!';

const createUserRes = await fetch(
  `${supabaseUrl}/auth/v1/admin/users`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true, // Skip email verification
    }),
  }
);

let userId;
if (!createUserRes.ok) {
  const errData = await createUserRes.json().catch(() => ({}));
  // If user already exists, fetch their ID
  if (errData.msg?.includes('already been registered') || errData.message?.includes('already been registered')) {
    console.log('User already exists, fetching existing user...');
    const listRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=50`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
      }
    );
    const listData = await listRes.json();
    const existingUser = listData.users?.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!existingUser) {
      console.error('Could not find existing user');
      process.exit(1);
    }
    userId = existingUser.id;
    console.log(`Found existing user: ${userId}`);
  } else {
    console.error('Failed to create user:', JSON.stringify(errData));
    process.exit(1);
  }
} else {
  const userData = await createUserRes.json();
  userId = userData.id;
  console.log(`Created user: ${userId}`);
}

// Step 3: Set user role to admin
// The trigger should have auto-created a profile with role 'pending'.
// We now promote it to 'admin'.
console.log('\n=== Step 3: Promoting user to admin ===');

// Use the database query API to update (bypasses RLS)
const updateSql = `
  UPDATE user_profiles 
  SET role = 'admin', approved_at = NOW(), approved_by = '${userId}'
  WHERE id = '${userId}';
`;

const updateRes = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: updateSql }),
  }
);

if (!updateRes.ok) {
  const text = await updateRes.text();
  console.error(`Update error: ${text}`);
  process.exit(1);
}

console.log('User promoted to admin!');

// Step 4: Verify
console.log('\n=== Step 4: Verifying setup ===');
const verifySql = `SELECT id, email, role, approved_at FROM user_profiles WHERE email = '${email}';`;
const verifyRes = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: verifySql }),
  }
);

const verifyData = await verifyRes.json();
console.log('Profile:', JSON.stringify(verifyData, null, 2));
console.log('\n✅ Admin user setup complete!');
console.log(`   Email: ${email}`);
console.log('   Role: admin');
console.log('   You can now log in at /login');
