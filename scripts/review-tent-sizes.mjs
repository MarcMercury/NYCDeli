// Review tent sizes from the registration CSV vs. the current campers table.
// Prints a table of discrepancies and tents that look out-of-spec.
//
// Camp guideline maxima (per the form):
//   Solo:  10 x 10   x 9.5
//   Two:   10 x 12.5 x 9.5
//   Three: 10 x 15   x 9.5
//   Four:  10 x 17.5 x 9.5
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// --- CSV parsing (copied from sync-campers-from-new-csv.mjs) ---
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

function extractDimensions(str) {
  let s = str.replace(/(\d+)\s*'\s*(\d+)\s*"/g, (_m, ft, inch) => `${(parseInt(ft) + parseInt(inch) / 12).toFixed(2)}`);
  s = s.replace(/(\d+\.?\d*)\s*(?:in|inch|inches|")\b/gi, (_m, n) => {
    const v = parseFloat(n);
    return v >= 24 ? `${(v / 12).toFixed(2)}` : `${v}`;
  });
  s = s.replace(/'/g, '').replace(/ft\b/gi, '').replace(/feet\b/gi, '');

  const round1 = (n) => Math.round(n * 10) / 10;
  const numTokens = [...s.matchAll(/\d+\.?\d*/g)].map(m => parseFloat(m[0]));

  let match = s.match(/(\d+\.?\d*)\s*[xX×*]\s*(\d+\.?\d*)\s*[xX×*]\s*(\d+\.?\d*)/);
  if (match) {
    let nums = [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
    nums = nums.map(n => n > 20 ? +(n / 12).toFixed(2) : n);
    const sorted = [...nums].sort((a, b) => b - a);
    return {
      length: round1(Math.min(sorted[0], 20)),
      width: round1(Math.min(sorted[1], 15)),
      height: round1(Math.min(sorted[2], 12)),
    };
  }
  match = s.match(/(\d+\.?\d*)\s*[xX×*]\s*(\d+\.?\d*)/);
  if (match) {
    let l = parseFloat(match[1]);
    let w = parseFloat(match[2]);
    if (l > 20) l = +(l / 12).toFixed(2);
    if (w > 20) w = +(w / 12).toFixed(2);
    if (w > l) [l, w] = [w, l];
    return { length: round1(Math.min(l, 20)), width: round1(Math.min(w, 15)), height: null };
  }
  if (numTokens.length >= 2) {
    let nums = [...numTokens];
    const last = nums[nums.length - 1];
    if (nums.length > 2 && Number.isInteger(last) && last >= 1 && last <= 6) nums.pop();
    nums = nums.map(n => n > 20 ? +(n / 12).toFixed(2) : n).sort((a, b) => b - a);
    return {
      length: round1(Math.min(nums[0], 20)),
      width: round1(Math.min(nums[1], 15)),
      height: nums[2] != null ? round1(Math.min(nums[2], 12)) : null,
    };
  }
  return { length: 10, width: 10, height: null };
}

function parseTentDimensions(tentStr, vehicleField) {
  const t = (tentStr || '').trim();
  const v = (vehicleField || '').toLowerCase();
  const lower = t.toLowerCase();
  if (lower.includes('rv') || lower.includes('recreational') || lower.startsWith('we are coming in') || lower.startsWith('no tent')) {
    return { shelter_type: 'rv', length: 22, width: 8, height: 10, kind: 'rv' };
  }
  if (!t || t.toLowerCase() === 'n/a' || t.toLowerCase() === 'test') {
    return { shelter_type: 'tent', length: 10, width: 10, height: null, kind: 'empty' };
  }
  if (!/\d+\.?\d*\s*[xX×*]\s*\d/.test(t)) {
    if (t.length > 25 || /tbd|unknown|haven|will|won|same as|need|going|figure/i.test(t)) {
      return { shelter_type: 'tent', length: 10, width: 10, height: null, kind: 'tbd' };
    }
  }
  if (lower.includes('shiftpod') || lower.includes('shift pod') || lower.includes('shifted')) {
    return { shelter_type: 'shiftpod', ...extractDimensions(t), kind: 'parsed' };
  }
  return { shelter_type: 'tent', ...extractDimensions(t), kind: 'parsed' };
}

// --- Read CSV ---
const csvPath = join(__dirname, '..', 'public', 'Files', 'NYC Deli Camp Registration + Burning Man 26  (Responses) - Form Responses 1 (1).csv');
const rows = parseCSV(readFileSync(csvPath, 'utf-8'));
const headers = rows[0];
const dataRows = rows.slice(1).filter(r => r.length > 1 && r[1]);

const headerIdx = (sub) => headers.findIndex(h => h.toLowerCase().includes(sub.toLowerCase()));
const iEmail = headerIdx('Email Address');
const iName = headerIdx('Full Name');
const iTent = headerIdx('Tent Size');
const iVeh  = headerIdx('bring a vehicle');

const csvByEmail = new Map();
for (const r of dataRows) {
  const email = (r[iEmail] || '').trim().toLowerCase();
  if (!email) continue;
  const rawTent = (r[iTent] || '').trim();
  const rawVeh = (r[iVeh] || '').trim();
  const parsed = parseTentDimensions(rawTent, rawVeh);
  csvByEmail.set(email, {
    name: (r[iName] || '').trim(),
    rawTent,
    rawVeh,
    ...parsed,
  });
}

// --- Fetch DB campers ---
const res = await fetch(`${supabaseUrl}/rest/v1/campers?select=email,full_name,shelter_type,shelter_length_ft,shelter_width_ft,shelter_height_ft,tent_make_model,tent_entrance_count,tent_opening_side&order=full_name.asc`, {
  headers: { apikey: serviceRoleKey, Authorization: 'Bearer ' + serviceRoleKey },
});
if (!res.ok) { console.error('DB fetch failed', res.status, await res.text()); process.exit(1); }
const campers = await res.json();
const dbByEmail = new Map(campers.map(c => [c.email.toLowerCase(), c]));

// --- Guideline limits ---
function inferPopulation(rawTent) {
  // Look for "1", "2", "3", "4" person markers
  const m = rawTent.match(/\b(\d)\s*(?:person|people|pop|ppl)?\b/i);
  if (rawTent.match(/\bsolo\b|\b1\b/i) && !rawTent.match(/\b2\b/)) return 1;
  if (rawTent.match(/\btwo\s*people\b|\b2\b/i)) return 2;
  if (rawTent.match(/\bthree\s*people\b|\b3\b/i)) return 3;
  if (rawTent.match(/\bfour\s*people\b|\b4\b/i)) return 4;
  return null;
}

const limits = {
  1: { w: 10, l: 10,   h: 9.5 },
  2: { w: 10, l: 12.5, h: 9.5 },
  3: { w: 10, l: 15,   h: 9.5 },
  4: { w: 10, l: 17.5, h: 9.5 },
};

// --- Compare and report ---
const mismatches = [];
const oversize = [];
const tbds = [];
const missingInDb = [];
const fmt = (n) => n === null || n === undefined ? '—' : n;

for (const [email, csv] of csvByEmail) {
  const db = dbByEmail.get(email);
  if (!db) { missingInDb.push({ email, ...csv }); continue; }
  const dl = db.shelter_length_ft, dw = db.shelter_width_ft, dh = db.shelter_height_ft;
  const cl = csv.length, cw = csv.width, ch = csv.height;
  const typeDiff = csv.shelter_type !== db.shelter_type;
  const dimDiff = Math.abs((dl || 0) - (cl || 0)) > 0.1 || Math.abs((dw || 0) - (cw || 0)) > 0.1 || (ch !== null && Math.abs((dh || 0) - (ch || 0)) > 0.1);
  if (csv.kind === 'tbd' || csv.kind === 'empty') {
    tbds.push({ email, name: csv.name, rawTent: csv.rawTent, db: `${dl}x${dw}x${fmt(dh)} (${db.shelter_type})` });
  }
  if (typeDiff || dimDiff) {
    mismatches.push({ email, name: csv.name, rawTent: csv.rawTent, csv: `${cl}x${cw}x${fmt(ch)} (${csv.shelter_type})`, db: `${dl}x${dw}x${fmt(dh)} (${db.shelter_type})`, typeDiff, dimDiff });
  }
  // Check oversize
  if (csv.shelter_type === 'tent' || csv.shelter_type === 'shiftpod') {
    const pop = inferPopulation(csv.rawTent);
    const lim = pop ? limits[pop] : limits[2]; // default to 2-person allowance
    const exceedsW = cw > lim.w + 0.1;
    const exceedsL = cl > lim.l + 0.1;
    const exceedsH = ch != null && ch > lim.h + 0.1;
    if (exceedsW || exceedsL || exceedsH) {
      oversize.push({
        email, name: csv.name, rawTent: csv.rawTent, pop: pop ?? '?',
        size: `${cl}x${cw}x${fmt(ch)}`,
        limit: `${lim.l}x${lim.w}x${lim.h}`,
        exceeds: [exceedsL && 'L', exceedsW && 'W', exceedsH && 'H'].filter(Boolean).join('+'),
      });
    }
  }
}

console.log(`\n=== Tent Review Report ===`);
console.log(`CSV entries: ${csvByEmail.size}`);
console.log(`DB campers : ${dbByEmail.size}`);
console.log(`Matched    : ${csvByEmail.size - missingInDb.length}`);
console.log(`Missing in DB: ${missingInDb.length}`);

console.log(`\n--- Dimension / Type Mismatches (DB vs CSV) — ${mismatches.length} ---`);
for (const m of mismatches) {
  console.log(`• ${m.name} <${m.email}>`);
  console.log(`    raw : "${m.rawTent}"`);
  console.log(`    csv : ${m.csv}`);
  console.log(`    db  : ${m.db}   [${m.typeDiff ? 'TYPE' : ''}${m.typeDiff && m.dimDiff ? '+' : ''}${m.dimDiff ? 'DIM' : ''}]`);
}

console.log(`\n--- Oversize vs Guidelines — ${oversize.length} ---`);
for (const o of oversize) {
  console.log(`• ${o.name} pop=${o.pop} ${o.size} > limit ${o.limit} [over ${o.exceeds}]`);
  console.log(`    raw: "${o.rawTent}"`);
}

console.log(`\n--- TBD / Empty / Vague — ${tbds.length} ---`);
for (const t of tbds) {
  console.log(`• ${t.name}: raw="${t.rawTent || '(empty)'}" → DB ${t.db}`);
}

console.log(`\n--- In CSV but missing from DB — ${missingInDb.length} ---`);
for (const m of missingInDb) {
  console.log(`• ${m.name} <${m.email}>  raw="${m.rawTent}"`);
}

// Campers in DB but not in CSV (e.g., admins, manual adds)
console.log(`\n--- In DB but not in CSV (informational) ---`);
let dbOnly = 0;
for (const c of campers) {
  if (!csvByEmail.has(c.email.toLowerCase())) {
    console.log(`• ${c.full_name} <${c.email}>  ${c.shelter_length_ft}x${c.shelter_width_ft}x${fmt(c.shelter_height_ft)} (${c.shelter_type})`);
    dbOnly++;
  }
}
console.log(`(total ${dbOnly})`);
