import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRef = 'hjmqwueengqqubzolycn';

// Read token from .env.local
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
const tokenMatch = envFile.match(/SUPABASE_ACCESS_TOKEN=(.+)/);
const accessToken = tokenMatch ? tokenMatch[1].trim() : null;

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

const sqlFile = join(__dirname, '..', 'supabase', 'migrations', '002_camp_spot_selection.sql');
const sql = readFileSync(sqlFile, 'utf-8');

console.log(`Applying migration 002_camp_spot_selection.sql (${sql.length} chars) to project ${projectRef}...`);

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
console.log(JSON.stringify(result, null, 2).slice(0, 3000));
