// Surgical camper sync: updates only CSV-derived fields for existing campers,
// inserts full record for new campers. Reads new responses CSV.
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

// Reuse parsing helpers by dynamically importing the existing import script's logic.
// To keep this file self-contained, copy the minimal parsing helpers here.

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

  // RV / vehicle scenarios
  if (lower.includes('rv') || lower.includes('recreational') || lower.startsWith('we are coming in') || lower.startsWith('no tent')) {
    return { shelter_type: 'rv', length: 22, width: 8, height: 10 };
  }
  if (!t || t.toLowerCase() === 'n/a' || t.toLowerCase() === 'test') {
    return { shelter_type: 'tent', length: 10, width: 10, height: null };
  }
  // If no dimension-like "NxN" pattern AND text is long/wordy, treat as TBD (default)
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
  for (const kw of relKeywords) {
    if (lowerName.includes(kw)) { relationship = kw[0].toUpperCase() + kw.slice(1); break; }
  }
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
  const vehicleRaw = get('bring a vehicle');
  const tellBrianRaw = get('like to ask or tell Brian');
  const sharingRaw = get('sharing your tent');
  const tent = parseTentDimensions(tentRaw, vehicleRaw);
  const emergencyRaw = get('Emergency Contact');
  const ec = parseEmergencyContact(emergencyRaw);

  const burnCountRaw = get('How many burns');
  let burn_count = burnCountRaw || null;

  return {
    email,
    full_name: fullName,
    phone: phone || null,
    raw_tent: tentRaw,
    raw_vehicle: vehicleRaw,
    raw_sharing: sharingRaw,
    raw_tell_brian: tellBrianRaw,
    shelter_type: tent.shelter_type,
    shelter_length_ft: tent.length,
    shelter_width_ft: tent.width,
    shelter_height_ft: tent.height,
    emergency_contact: emergencyRaw || null,
    emergency_contact_name: ec.name,
    emergency_contact_number: ec.number,
    emergency_contact_relationship: ec.relationship,
    medical_conditions: cleanField(get('medical conditions')),
    medications: cleanField(get('medication')),
    allergies: cleanField(get('allergies')),
    dietary_restrictions: cleanField(get('dietary')),
    custom_skills: cleanField(get('professional qualification')),
    what_attracted_you: cleanField(get('What attracted')),
    referral_source: cleanField(get('first time with NYC Deli please list who')),
    character_references: cleanField(get('character references')),
    first_burn_hopes: cleanField(get('first Burning Man')),
    burn_count,
    volunteer_commitment: get('willing to volunteer').toLowerCase().includes('yes'),
    sober_shifts: get('willing to be sober').toLowerCase().includes('yes'),
    background_check_consent: get('background-checked').toLowerCase().includes('yes'),
  };
}

// --- Supabase helpers ---
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
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json',
    },
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

function sqlVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

// --- Main ---
async function main() {
  const csvPath = join(__dirname, '..', 'public', 'Files', 'NYC Deli Camp Registration + Burning Man 26  (Responses) - Form Responses 1 (1).csv');
  const csvText = readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvText);
  const headers = rows[0];
  const dataRows = rows.slice(1).filter(r => r.length > 1 && r[1]);

  console.log(`📄 CSV rows: ${dataRows.length}`);

  // Get current campers from DB
  const existing = await fetch(`${supabaseUrl}/rest/v1/campers?select=id,email,full_name`, {
    headers: { apikey: serviceRoleKey, Authorization: 'Bearer ' + serviceRoleKey },
  }).then(r => r.json());
  const byEmail = new Map(existing.map(c => [c.email.toLowerCase(), c]));
  console.log(`💾 DB campers: ${existing.length}`);

  const stats = { updated: 0, created: 0, errors: [], tentReview: [] };

  for (let i = 0; i < dataRows.length; i++) {
    const data = buildCSVFields(headers, dataRows[i]);
    const tag = `[${i + 1}/${dataRows.length}] ${data.full_name} <${data.email}>`;

    if (!data.email) { console.log(`${tag} SKIP (no email)`); continue; }

    try {
      const existingCamper = byEmail.get(data.email);

      // Fields to update from CSV (preserve other DB fields)
      const updateCols = [
        'full_name', 'phone',
        'shelter_type', 'shelter_length_ft', 'shelter_width_ft', 'shelter_height_ft',
        'emergency_contact', 'emergency_contact_name', 'emergency_contact_number', 'emergency_contact_relationship',
        'medical_conditions', 'medications', 'allergies', 'dietary_restrictions',
        'custom_skills', 'what_attracted_you', 'referral_source', 'character_references', 'first_burn_hopes',
        'burn_count', 'volunteer_commitment', 'sober_shifts', 'background_check_consent',
      ];

      if (existingCamper) {
        // UPDATE only CSV fields - keep arrival_date, build_week, etc.
        const setClauses = updateCols.map(c => `${c} = ${sqlVal(data[c])}`).join(', ');
        await runSQL(`UPDATE campers SET ${setClauses} WHERE email = ${sqlVal(data.email)};`);
        stats.updated++;
        console.log(`${tag} ✅ updated`);
      } else {
        // INSERT new camper + auth user
        const { id: userId, existed } = await createAuthUser(data.email, DEFAULT_PASSWORD);
        const insertCols = [
          'email', ...updateCols,
          'arrival_date', 'arrival_method', 'departure_date', 'early_arrival',
          'orientation_preference', 'power_required', 'power_type', 'shade_required',
          'kitchen_participation', 'preferred_shift_types', 'strike_participation',
          'build_week_attending', 'tools_bringing', 'skills',
        ];
        const insertVals = insertCols.map(c => {
          if (c === 'email') return sqlVal(data.email);
          if (updateCols.includes(c)) return sqlVal(data[c]);
          if (c === 'arrival_date') return sqlVal('2026-08-30');
          if (c === 'arrival_method') return sqlVal('car');
          if (c === 'departure_date') return sqlVal('2026-09-07');
          if (c === 'early_arrival') return 'false';
          if (c === 'orientation_preference') return sqlVal('any');
          if (c === 'power_required') return 'false';
          if (c === 'power_type') return sqlVal('none');
          if (c === 'shade_required') return 'false';
          if (c === 'kitchen_participation') return 'true';
          if (c === 'preferred_shift_types') return `'{}'::shift_type[]`;
          if (c === 'strike_participation') return 'true';
          if (c === 'build_week_attending') return 'false';
          if (c === 'tools_bringing') return `'{}'::text[]`;
          if (c === 'skills') return `'{}'::skill_tag[]`;
          return 'NULL';
        });
        const result = await runSQL(`
          INSERT INTO campers (${insertCols.join(', ')})
          VALUES (${insertVals.join(', ')})
          RETURNING id;
        `);
        const camperId = Array.isArray(result) && result[0] ? result[0].id : null;

        if (camperId && userId) {
          await runSQL(`
            UPDATE user_profiles
            SET role = (CASE WHEN role = 'admin'::user_role THEN 'admin' ELSE 'user' END)::user_role,
                camper_id = '${camperId}',
                approved_at = COALESCE(approved_at, NOW()),
                approved_by = COALESCE(approved_by, id)
            WHERE id = '${userId}'
              AND (camper_id IS NULL OR camper_id != '${camperId}');
          `);
        }
        stats.created++;
        console.log(`${tag} 🆕 created (auth ${existed ? 'existed' : 'new'})`);
      }

      // Tent review note
      stats.tentReview.push({
        email: data.email,
        name: data.full_name,
        type: data.shelter_type,
        dims: `${data.shelter_length_ft}x${data.shelter_width_ft}${data.shelter_height_ft ? 'x' + data.shelter_height_ft : ''}`,
        sharing: data.raw_sharing || '',
        rawTent: data.raw_tent,
      });
    } catch (err) {
      console.log(`${tag} ❌ ${err.message}`);
      stats.errors.push({ email: data.email, name: data.full_name, error: err.message });
    }
  }

  console.log('\n══════ SUMMARY ══════');
  console.log(`Updated: ${stats.updated}`);
  console.log(`Created: ${stats.created}`);
  console.log(`Errors: ${stats.errors.length}`);
  for (const e of stats.errors) console.log(`  - ${e.name} (${e.email}): ${e.error}`);

  console.log('\n══════ TENT/SHELTER REVIEW ══════');
  for (const t of stats.tentReview) {
    console.log(`${t.name.padEnd(35)} ${t.type.padEnd(9)} ${t.dims.padEnd(15)} ${t.sharing ? '↔ ' + t.sharing : ''}`);
    if (t.rawTent && !/^\d/.test(t.rawTent.trim()) && !t.rawTent.toLowerCase().includes('tent')) {
      console.log(`    raw: "${t.rawTent}"`);
    }
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
