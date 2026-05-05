// Delete campers no longer listed in the new registration CSV.
// Removes: any sharing_tent_with FKs pointing to them, user_profiles row,
// auth.users row, then the campers row.
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
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = 'hjmqwueengqqubzolycn';

const TARGETS = [
  'berg.kaplangallery@gmail.com',
  'tyjroush@gmail.com',
];

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`SQL error: ${await res.text()}`);
  return res.json();
}

async function deleteAuthUser(userId) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`auth delete err ${userId}: ${await res.text()}`);
  }
}

async function main() {
  const list = TARGETS.map(e => `'${e.replace(/'/g, "''")}'`).join(',');
  const rows = await runSQL(`
    SELECT c.id AS camper_id, c.email, c.full_name, p.id AS auth_user_id
    FROM campers c
    LEFT JOIN user_profiles p ON p.camper_id = c.id
    WHERE lower(c.email) IN (${list});
  `);
  console.log(`Targets resolved: ${rows.length}`);
  for (const r of rows) console.log(`  ${r.full_name} <${r.email}> camper=${r.camper_id} auth=${r.auth_user_id}`);

  for (const r of rows) {
    console.log(`\nDeleting ${r.full_name}...`);
    // 1) Clear sharing_tent_with references pointing to this camper
    await runSQL(`UPDATE campers SET sharing_tent_with = NULL WHERE sharing_tent_with = '${r.camper_id}';`);
    // 2) Delete profile (camper FK cleared too)
    await runSQL(`DELETE FROM user_profiles WHERE camper_id = '${r.camper_id}';`);
    // 3) Delete auth user (cascades any leftover profile on auth.users.id)
    if (r.auth_user_id) {
      await deleteAuthUser(r.auth_user_id);
      console.log(`  auth user deleted`);
    }
    // 4) Delete camper row
    await runSQL(`DELETE FROM campers WHERE id = '${r.camper_id}';`);
    console.log(`  camper deleted`);
  }

  // Final stats
  const stats = await runSQL(`SELECT COUNT(*)::int AS n FROM campers;`);
  console.log(`\nRemaining campers: ${stats[0].n}`);
}

main().catch(e => { console.error(e); process.exit(1); });
