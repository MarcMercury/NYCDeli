import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRef = 'hjmqwueengqqubzolycn';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const migrationFile = process.argv[2] || '008_fix_rls_recursion.sql';
const sqlFile = join(__dirname, '..', 'supabase', 'migrations', migrationFile);
const sql = readFileSync(sqlFile, 'utf-8');

console.log(`Applying ${migrationFile} (${sql.length} chars)...`);

const res = await fetch(
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

if (!res.ok) {
  const text = await res.text();
  console.error(`Error ${res.status}: ${text}`);
  process.exit(1);
}

const result = await res.json();
console.log('Migration applied successfully!');
console.log(JSON.stringify(result, null, 2).slice(0, 2000));
