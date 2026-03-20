import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRef = 'hjmqwueengqqubzolycn';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN environment variable');
  console.error('Set it with: export SUPABASE_ACCESS_TOKEN=your_token_here');
  process.exit(1);
}

// Migrations to apply in order
const migrations = [
  '005_build_week_stages.sql',
  '006_camper_extended_fields.sql',
];

for (const migration of migrations) {
  const sqlFile = join(__dirname, '..', 'supabase', 'migrations', migration);
  const sql = readFileSync(sqlFile, 'utf-8');

  console.log(`\nApplying ${migration} (${sql.length} chars) to project ${projectRef}...`);

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

  if (!response.ok) {
    const text = await response.text();
    // If objects already exist, that's okay for idempotent runs
    if (text.includes('already exists')) {
      console.log(`⚠ ${migration}: Some objects already exist (safe to ignore)`);
      continue;
    }
    console.error(`✗ Error applying ${migration} (${response.status}): ${text}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log(`✓ ${migration} applied successfully`);
  console.log(JSON.stringify(result, null, 2).slice(0, 500));
}

console.log('\nAll migrations applied!');
