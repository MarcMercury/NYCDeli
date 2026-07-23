// Diagnostic: find duplicate packing_list_items per camper (same normalized item name).
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
const projectRef = 'hjmqwueengqqubzolycn';

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

// Duplicate = same camper + same lower(trim(item)) appearing more than once
const query = `
  SELECT c.full_name, c.email,
         lower(btrim(p.item)) AS norm_item,
         count(*) AS copies,
         array_agg(DISTINCT p.category) AS categories
  FROM packing_list_items p
  JOIN campers c ON c.id = p.camper_id
  GROUP BY c.full_name, c.email, lower(btrim(p.item))
  HAVING count(*) > 1
  ORDER BY c.full_name, copies DESC;
`;

const rows = await runSQL(query);
if (!rows.length) {
  console.log('No duplicate packing items found.');
} else {
  const byCamper = {};
  for (const r of rows) {
    const key = `${r.full_name} <${r.email}>`;
    byCamper[key] = byCamper[key] || [];
    byCamper[key].push(r);
  }
  let total = 0;
  for (const [camper, items] of Object.entries(byCamper)) {
    console.log(`\n${camper}`);
    for (const it of items) {
      const extra = Number(it.copies) - 1;
      total += extra;
      console.log(`  x${it.copies}  "${it.norm_item}"  categories: ${JSON.stringify(it.categories)}`);
    }
  }
  console.log(`\n${Object.keys(byCamper).length} campers with duplicates. ${total} redundant rows to remove.`);
}
