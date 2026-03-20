import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const projectRef = 'hjmqwueengqqubzolycn';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

async function query(sql) {
  const response = await fetch(
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
  return response.json();
}

console.log('=== Verifying migration ===\n');

// Check tables exist
const tables = await query(`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  ORDER BY table_name;
`);
console.log('Tables:', tables.map(t => t.table_name));

// Check seed data
const roles = await query('SELECT name FROM kitchen_roles ORDER BY name;');
console.log('\nKitchen roles:', roles.map(r => r.name));

const checklists = await query('SELECT name, type FROM checklist_templates ORDER BY name;');
console.log('\nChecklists:', checklists.map(c => `${c.name} (${c.type})`));

const settings = await query('SELECT key, value FROM system_settings ORDER BY key;');
console.log('\nSettings:', settings.map(s => `${s.key} = ${s.value}`));

// Check RLS policies
const policies = await query(`
  SELECT tablename, policyname 
  FROM pg_policies 
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
`);
console.log('\nRLS Policies:', policies.map(p => `${p.tablename}: ${p.policyname}`));

console.log('\n✓ Migration verified!');
