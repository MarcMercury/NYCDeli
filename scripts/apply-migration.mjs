import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRef = 'hjmqwueengqqubzolycn';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN environment variable');
  process.exit(1);
}

const sqlFile = join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
const sql = readFileSync(sqlFile, 'utf-8');

console.log(`Applying migration (${sql.length} chars) to project ${projectRef}...`);

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
  console.error(`Error ${response.status}: ${text}`);
  process.exit(1);
}

const result = await response.json();
console.log('Migration applied successfully!');
console.log(JSON.stringify(result, null, 2).slice(0, 2000));
