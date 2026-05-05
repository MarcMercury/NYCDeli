// Identify campers in DB but not in the new registration CSV (dry-run).
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

function parseCSV(text) {
  const rows = []; let cur = ''; let inQ = false; let row = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (inQ && text[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === ',' && !inQ) { row.push(cur); cur = ''; }
    else if ((ch === '\n' || ch === '\r') && !inQ) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.length > 1) rows.push(row);
      row = [];
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); if (row.length > 1) rows.push(row); }
  return rows;
}

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`SQL error: ${await res.text()}`);
  return res.json();
}

async function main() {
  const csvPath = join(__dirname, '..', 'public', 'Files', 'NYC Deli Camp Registration + Burning Man 26  (Responses) - Form Responses 1 (1).csv');
  const text = readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(text);
  const header = rows[0];
  const emailIdx = header.findIndex(h => /email address/i.test(h));
  const nameIdx = header.findIndex(h => /full name/i.test(h));
  const csvEmails = new Set();
  const csvNames = new Map();
  for (let i = 1; i < rows.length; i++) {
    const e = (rows[i][emailIdx] || '').trim().toLowerCase();
    if (e) {
      csvEmails.add(e);
      csvNames.set(e, (rows[i][nameIdx] || '').trim());
    }
  }
  console.log(`CSV: ${csvEmails.size} unique emails`);

  // Fetch all campers + role via SQL
  const camperRows = await runSQL(`
    SELECT c.id, c.email, c.full_name, p.role::text AS role, p.id AS user_id
    FROM campers c
    LEFT JOIN user_profiles p ON p.camper_id = c.id
    ORDER BY c.full_name;
  `);
  const campers = Array.isArray(camperRows) ? camperRows : (camperRows.result || camperRows);
  console.log(`DB: ${campers.length} campers`);

  const stale = campers.filter(c => !csvEmails.has((c.email || '').toLowerCase()));
  console.log(`\nStale (in DB, not in new CSV): ${stale.length}`);
  for (const c of stale) {
    const role = c.role || '(no profile)';
    console.log(`  - ${(c.full_name || '').padEnd(32)} <${c.email}>  [${role}]  user_id=${c.user_id || 'none'}`);
  }

  // Also check: anyone in CSV but not DB? (sanity)
  const dbEmails = new Set(campers.map(c => (c.email || '').toLowerCase()));
  const missing = [...csvEmails].filter(e => !dbEmails.has(e));
  if (missing.length) {
    console.log(`\nIn CSV but NOT in DB: ${missing.length}`);
    for (const e of missing) console.log(`  - ${csvNames.get(e)} <${e}>`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
