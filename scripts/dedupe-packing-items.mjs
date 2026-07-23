// Remove duplicate packing_list_items per camper (same normalized item name).
// Keeps the row with the most-progressed status; deletes the rest.
// Usage: node scripts/dedupe-packing-items.mjs          (dry run)
//        node scripts/dedupe-packing-items.mjs --apply  (perform deletes)
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
const APPLY = process.argv.includes('--apply');

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

// Status precedence: higher = keep
const RANK = { packed: 5, camp_provided: 4, have: 3, ordered: 2, need: 1, na: 0 };

const rows = await runSQL(`
  SELECT id, camper_id, item, category, status, sort_order
  FROM packing_list_items
  ORDER BY camper_id, lower(btrim(item)), sort_order;
`);

// Group by camper_id + normalized item
const groups = {};
for (const r of rows) {
  const key = `${r.camper_id}|${r.item.trim().toLowerCase()}`;
  (groups[key] = groups[key] || []).push(r);
}

const toDelete = [];
for (const list of Object.values(groups)) {
  if (list.length < 2) continue;
  // Pick keeper: highest status rank, then lowest sort_order
  const keeper = [...list].sort((a, b) => {
    const d = (RANK[b.status] ?? 0) - (RANK[a.status] ?? 0);
    if (d !== 0) return d;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  })[0];
  for (const r of list) if (r.id !== keeper.id) toDelete.push({ ...r, keptStatus: keeper.status, keptCategory: keeper.category });
}

if (!toDelete.length) {
  console.log('No duplicate rows to remove.');
  process.exit(0);
}

console.log(`${toDelete.length} duplicate rows${APPLY ? '' : ' (dry run)'}:`);
for (const r of toDelete) {
  console.log(`  DELETE "${r.item}" [${r.category}/${r.status}] — keeping [${r.keptCategory}/${r.keptStatus}]`);
}

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply to delete.');
  process.exit(0);
}

const ids = toDelete.map(r => `'${r.id}'`).join(',');
await runSQL(`DELETE FROM packing_list_items WHERE id IN (${ids});`);
console.log(`\nDeleted ${toDelete.length} duplicate rows.`);
