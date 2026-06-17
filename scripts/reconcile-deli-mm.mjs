// Reconcile DB campers/users to match the new "Deli MM version (1)" list.
//   1) DELETE campers in DB but not on the new list (+ their auth users, cascades)
//   2) ADD campers on the list but not in DB (+ auth user, linked profile)
//   3) FILL only BLANK fields on existing campers (never overwrite existing data)
//
// Source file: public/Files/Deli_MM_version_1.csv (converted from the xlsx).
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
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'hjmqwueengqqubzolycn';
const DEFAULT_PASSWORD = 'NYCDeli2026!';
const DRY_RUN = process.argv.includes('--dry-run');

if (!serviceRoleKey || !supabaseUrl || !accessToken) {
  console.error('Missing env vars in .env.local'); process.exit(1);
}

// ─── CSV parsing ──────────────────────────────────────────────────
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

// ─── Tent dimension parsing (from sync-campers-from-new-csv.mjs) ───
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
    return { length: round1(Math.min(sorted[0], 20)), width: round1(Math.min(sorted[1], 15)), height: round1(Math.min(sorted[2], 12)) };
  }
  match = s.match(/(\d+\.?\d*)\s*[xX×*]\s*(\d+\.?\d*)/);
  if (match) {
    let l = parseFloat(match[1]); let w = parseFloat(match[2]);
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
    return { length: round1(Math.min(nums[0], 20)), width: round1(Math.min(nums[1], 15)), height: nums[2] != null ? round1(Math.min(nums[2], 12)) : null };
  }
  return { length: 10, width: 10, height: null };
}

function parseTentDimensions(tentStr) {
  const t = (tentStr || '').trim();
  const lower = t.toLowerCase();
  if (lower.includes('rv') || lower.includes('recreational') || lower.startsWith('we are coming in') || lower.startsWith('no tent')) {
    return { shelter_type: 'rv', length: 22, width: 8, height: 10 };
  }
  if (!t || lower === 'n/a' || lower === 'test') {
    return { shelter_type: 'tent', length: 10, width: 10, height: null };
  }
  if (!/\d+\.?\d*\s*[xX×*]\s*\d/.test(t)) {
    if (t.length > 25 || /tbd|unknown|haven|will|won|same as|need|going|figure/i.test(t)) {
      return { shelter_type: 'tent', length: 10, width: 10, height: null };
    }
  }
  if (lower.includes('shiftpod') || lower.includes('shift pod') || lower.includes('shifted')) {
    return { shelter_type: 'shiftpod', ...extractDimensions(t) };
  }
  return { shelter_type: 'tent', ...extractDimensions(t) };
}

function parseEmergencyContact(raw) {
  if (!raw || !raw.trim() || raw.toLowerCase() === 'test') return { name: null, number: null, relationship: null };
  const phoneMatch = raw.match(/[+]?[\d\s\-().]{7,}/);
  const phone = phoneMatch ? phoneMatch[0].trim().replace(/\s+/g, ' ') : null;
  let namepart = phone ? raw.replace(phone, '').replace(/[,\-–—:]+\s*$/, '').trim() : raw;
  const relKeywords = ['mom', 'mother', 'dad', 'father', 'sister', 'brother', 'wife', 'husband', 'partner', 'spouse', 'friend', 'cousin', 'aunt', 'uncle', 'son', 'daughter'];
  let relationship = null;
  const lowerName = namepart.toLowerCase();
  for (const kw of relKeywords) { if (lowerName.includes(kw)) { relationship = kw[0].toUpperCase() + kw.slice(1); break; } }
  let name = namepart.replace(/[()]/g, '').replace(/[,\-–—:]+\s*$/, '').trim();
  if (!name || name.length < 2) name = null;
  return { name, number: phone, relationship };
}

function cleanField(s) {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (['no', 'none', 'n/a', 'na', 'nope', 'test', 'no.', 'non', '-'].includes(lower)) return null;
  return t;
}

function buildCSVFields(headers, fields) {
  const get = (sub) => {
    const idx = headers.findIndex(h => h.toLowerCase().includes(sub.toLowerCase()));
    return idx >= 0 ? (fields[idx] || '').trim() : '';
  };
  const email = get('Email Address').toLowerCase();
  const fullName = get('Full Name');
  const phone = get('Phone Number');
  const tentRaw = get('Tent Size');
  const tent = parseTentDimensions(tentRaw);
  const emergencyRaw = get('Emergency Contact');
  const ec = parseEmergencyContact(emergencyRaw);
  const burnCountRaw = get('How many burns');

  return {
    email, full_name: fullName, phone: phone || null,
    shelter_type: tent.shelter_type, shelter_length_ft: tent.length, shelter_width_ft: tent.width, shelter_height_ft: tent.height,
    emergency_contact: emergencyRaw || null,
    emergency_contact_name: ec.name, emergency_contact_number: ec.number, emergency_contact_relationship: ec.relationship,
    medical_conditions: cleanField(get('medical conditions')),
    medications: cleanField(get('medication')),
    allergies: cleanField(get('allergies')),
    dietary_restrictions: cleanField(get('dietary')),
    custom_skills: cleanField(get('professional qualification')),
    what_attracted_you: cleanField(get('What attracted')),
    referral_source: cleanField(get('first time with NYC Deli please list who')),
    character_references: cleanField(get('character references')),
    first_burn_hopes: cleanField(get('first Burning Man')),
    burn_count: burnCountRaw || null,
    volunteer_commitment: get('willing to volunteer').toLowerCase().includes('yes'),
    sober_shifts: get('willing to be sober').toLowerCase().includes('yes'),
    background_check_consent: get('background-checked').toLowerCase().includes('yes'),
  };
}

// ─── Supabase helpers ─────────────────────────────────────────────
async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`SQL error: ${await res.text()}`);
  return res.json();
}

async function createAuthUser(email, password) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err.msg || err.message || '').toLowerCase();
    if (msg.includes('already') || msg.includes('exists')) {
      const list = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=2000`, {
        headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey },
      }).then(r => r.json());
      const u = list.users?.find(x => x.email?.toLowerCase() === email.toLowerCase());
      if (u) return { id: u.id, existed: true };
    }
    throw new Error(`auth user err ${email}: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return { id: data.id, existed: false };
}

async function deleteAuthUser(userId) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
  });
  if (!res.ok && res.status !== 404) throw new Error(`auth delete err ${userId}: ${await res.text()}`);
}

function sqlVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

const isBlank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  const csvPath = join(__dirname, '..', 'public', 'Files', 'Deli_MM_version_1.csv');
  const rows = parseCSV(readFileSync(csvPath, 'utf-8'));
  const headers = rows[0];
  const dataRows = rows.slice(1).filter(r => r.length > 1 && r[1] && r[1].trim());

  // Build list keyed by email
  const listByEmail = new Map();
  for (const r of dataRows) {
    const data = buildCSVFields(headers, r);
    if (data.email) listByEmail.set(data.email, data);
  }
  console.log(`📄 New list campers: ${listByEmail.size}`);

  // Fetch current campers (all relevant cols for fill-blank)
  const fillCols = [
    'full_name', 'phone', 'shelter_type', 'shelter_length_ft', 'shelter_width_ft', 'shelter_height_ft',
    'emergency_contact', 'emergency_contact_name', 'emergency_contact_number', 'emergency_contact_relationship',
    'medical_conditions', 'medications', 'allergies', 'dietary_restrictions',
    'custom_skills', 'what_attracted_you', 'referral_source', 'character_references', 'first_burn_hopes', 'burn_count',
  ];
  const selectCols = ['id', 'email', ...fillCols].join(',');
  const campers = await fetch(`${supabaseUrl}/rest/v1/campers?select=${selectCols}`, {
    headers: { apikey: serviceRoleKey, Authorization: 'Bearer ' + serviceRoleKey },
  }).then(r => r.json());
  const dbByEmail = new Map(campers.map(c => [String(c.email).toLowerCase(), c]));
  console.log(`💾 DB campers: ${campers.length}`);

  const toDelete = campers.filter(c => !listByEmail.has(String(c.email).toLowerCase()));
  const toAdd = [...listByEmail.values()].filter(d => !dbByEmail.has(d.email));
  const toFill = [...listByEmail.values()].filter(d => dbByEmail.has(d.email));

  console.log(`\n🗑️  To delete: ${toDelete.length}`);
  console.log(`🆕 To add:    ${toAdd.length}`);
  console.log(`🔧 To verify/fill: ${toFill.length}`);

  if (DRY_RUN) { console.log('\n(DRY RUN — no changes made)'); return; }

  const stats = { deleted: 0, added: 0, filled: 0, fieldsFilled: 0, errors: [] };

  // ── 1) DELETE ──
  console.log('\n══════ DELETING STALE CAMPERS ══════');
  for (const c of toDelete) {
    try {
      const prof = await runSQL(`SELECT id FROM user_profiles WHERE camper_id = '${c.id}';`);
      await runSQL(`UPDATE campers SET sharing_tent_with = NULL WHERE sharing_tent_with = '${c.id}';`);
      await runSQL(`UPDATE campers SET sharing_tent_with_2 = NULL WHERE sharing_tent_with_2 = '${c.id}';`);
      await runSQL(`DELETE FROM user_profiles WHERE camper_id = '${c.id}';`);
      for (const p of (Array.isArray(prof) ? prof : [])) {
        if (p.id) await deleteAuthUser(p.id);
      }
      await runSQL(`DELETE FROM campers WHERE id = '${c.id}';`);
      stats.deleted++;
      console.log(`  🗑️  ${c.full_name} <${c.email}>`);
    } catch (e) {
      stats.errors.push({ op: 'delete', email: c.email, error: e.message });
      console.log(`  ❌ delete ${c.email}: ${e.message}`);
    }
  }

  // ── 2) ADD ──
  console.log('\n══════ ADDING NEW CAMPERS ══════');
  const updateCols = [
    'full_name', 'phone', 'shelter_type', 'shelter_length_ft', 'shelter_width_ft', 'shelter_height_ft',
    'emergency_contact', 'emergency_contact_name', 'emergency_contact_number', 'emergency_contact_relationship',
    'medical_conditions', 'medications', 'allergies', 'dietary_restrictions',
    'custom_skills', 'what_attracted_you', 'referral_source', 'character_references', 'first_burn_hopes',
    'burn_count', 'volunteer_commitment', 'sober_shifts', 'background_check_consent',
  ];
  for (const data of toAdd) {
    try {
      const { id: userId, existed } = await createAuthUser(data.email, DEFAULT_PASSWORD);
      // Only set required cols + CSV-derived values; everything else uses table defaults.
      const insertCols = ['email', ...updateCols, 'arrival_date', 'departure_date'];
      const insertVals = insertCols.map(c => {
        if (c === 'email') return sqlVal(data.email);
        if (updateCols.includes(c)) return sqlVal(data[c]);
        if (c === 'arrival_date') return sqlVal('2026-08-30');
        if (c === 'departure_date') return sqlVal('2026-09-07');
        return 'NULL';
      });
      const result = await runSQL(`INSERT INTO campers (${insertCols.join(', ')}) VALUES (${insertVals.join(', ')}) RETURNING id;`);
      const camperId = Array.isArray(result) && result[0] ? result[0].id : null;
      if (camperId && userId) {
        await runSQL(`
          UPDATE user_profiles
          SET role = (CASE WHEN role = 'admin'::user_role THEN 'admin' ELSE 'user' END)::user_role,
              camper_id = '${camperId}',
              approved_at = COALESCE(approved_at, NOW()),
              approved_by = COALESCE(approved_by, id)
          WHERE id = '${userId}' AND (camper_id IS NULL OR camper_id != '${camperId}');`);
      }
      stats.added++;
      console.log(`  🆕 ${data.full_name} <${data.email}> (auth ${existed ? 'existed' : 'new'})`);
    } catch (e) {
      stats.errors.push({ op: 'add', email: data.email, error: e.message });
      console.log(`  ❌ add ${data.email}: ${e.message}`);
    }
  }

  // ── 3) FILL blank fields only ──
  console.log('\n══════ FILLING BLANK FIELDS (no overwrite) ══════');
  for (const data of toFill) {
    const db = dbByEmail.get(data.email);
    if (!db) continue;
    const setClauses = [];
    const filledNames = [];
    for (const col of fillCols) {
      const newVal = data[col];
      if (isBlank(db[col]) && !isBlank(newVal)) {
        setClauses.push(`${col} = ${sqlVal(newVal)}`);
        filledNames.push(col);
      }
    }
    if (setClauses.length === 0) continue;
    try {
      await runSQL(`UPDATE campers SET ${setClauses.join(', ')} WHERE id = '${db.id}';`);
      stats.filled++;
      stats.fieldsFilled += setClauses.length;
      console.log(`  🔧 ${data.full_name}: filled ${filledNames.join(', ')}`);
    } catch (e) {
      stats.errors.push({ op: 'fill', email: data.email, error: e.message });
      console.log(`  ❌ fill ${data.email}: ${e.message}`);
    }
  }

  // ── Summary ──
  const finalCount = await runSQL(`SELECT COUNT(*)::int AS n FROM campers;`);
  console.log('\n══════ SUMMARY ══════');
  console.log(`Deleted:        ${stats.deleted}`);
  console.log(`Added:          ${stats.added}`);
  console.log(`Filled (rows):  ${stats.filled}  (${stats.fieldsFilled} fields)`);
  console.log(`Errors:         ${stats.errors.length}`);
  for (const e of stats.errors) console.log(`   - [${e.op}] ${e.email}: ${e.error}`);
  console.log(`Final camper count: ${finalCount[0].n}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
