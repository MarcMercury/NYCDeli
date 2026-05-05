import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env.local manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'hjmqwueengqqubzolycn';
const DEFAULT_PASSWORD = 'NYCDeli2026!';

if (!serviceRoleKey || !supabaseUrl || !accessToken) {
  console.error('Missing environment variables. Ensure .env.local has SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ACCESS_TOKEN.');
  process.exit(1);
}

// ─── CSV Parsing ──────────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  const lines = [];

  // Split into lines respecting quoted newlines
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else if (ch === '\r' && !inQuotes) {
      // skip CR
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  // Parse each line into fields
  for (const line of lines) {
    const fields = [];
    let field = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { field += '"'; i++; }
        else { q = !q; }
      } else if (ch === ',' && !q) {
        fields.push(field);
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field);
    rows.push(fields);
  }
  return rows;
}

// ─── Tent Dimension Parser ───────────────────────────────────────
function parseTentDimensions(tentStr) {
  if (!tentStr || tentStr.trim() === '' || tentStr.toLowerCase() === 'n/a' || tentStr.toLowerCase() === 'test') {
    return { shelter_type: 'tent', length: 10, width: 10, height: null };
  }

  const lower = tentStr.toLowerCase();

  // RV detection
  if (lower.includes('rv') || lower.includes('recreational') || lower.includes('n/a')) {
    if (lower.includes('rv')) return { shelter_type: 'rv', length: 20, width: 8, height: 10 };
  }
  // Shiftpod detection
  if (lower.includes('shiftpod') || lower.includes('shift pod') || lower.includes('shifted')) {
    const dims = extractDimensions(tentStr);
    return { shelter_type: 'shiftpod', ...dims };
  }
  // No Bake Tent detection
  if (lower.includes('no bake') || lower.includes('nobake') || lower.includes('no-bake')) {
    const dims = extractDimensions(tentStr);
    return { shelter_type: 'tent', ...dims };
  }

  const dims = extractDimensions(tentStr);
  return { shelter_type: 'tent', ...dims };
}

function extractDimensions(str) {
  // Convert "6'6\"" → 6.5ft, "84in"/"84\"" → 7ft, etc.
  // First convert feet'inches" notation: 6'6" -> 6.5
  let s = str.replace(/(\d+)\s*'\s*(\d+)\s*"/g, (_m, ft, inch) => `${parseInt(ft) + parseInt(inch) / 12}`);
  // Convert standalone inches markers: "84in" or 84" -> feet (only when value >= 24, treat as inches)
  s = s.replace(/(\d+\.?\d*)\s*(?:in|inch|inches|")\b/gi, (_m, n) => {
    const v = parseFloat(n);
    return v >= 24 ? `${(v / 12).toFixed(2)}` : `${v}`;
  });
  // Strip remaining feet markers
  s = s.replace(/'/g, '').replace(/ft\b/gi, '').replace(/feet\b/gi, '');

  // Extract all numbers with their positions to detect a trailing "population" digit
  const numTokens = [...s.matchAll(/\d+\.?\d*/g)].map(m => parseFloat(m[0]));

  // Try LxWxH pattern first
  let match = s.match(/(\d+\.?\d*)\s*[xX×*]\s*(\d+\.?\d*)\s*[xX×*]\s*(\d+\.?\d*)/);
  if (match) {
    let nums = [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
    // If any value > 20 it's likely inches → convert
    nums = nums.map(n => n > 20 ? +(n / 12).toFixed(2) : n);
    // Sort: largest two = length/width, smallest = height (unless smallest is wider than tallest)
    const sorted = [...nums].sort((a, b) => b - a);
    const length = Math.min(sorted[0], 20);
    const width = Math.min(sorted[1], 15);
    const height = Math.min(sorted[2], 12);
    return { length, width, height };
  }

  // Try LxW pattern (no height)
  match = s.match(/(\d+\.?\d*)\s*[xX×*]\s*(\d+\.?\d*)/);
  if (match) {
    let l = parseFloat(match[1]);
    let w = parseFloat(match[2]);
    if (l > 20) l = +(l / 12).toFixed(2);
    if (w > 20) w = +(w / 12).toFixed(2);
    if (w > l) [l, w] = [w, l];
    return { length: Math.min(l, 20), width: Math.min(w, 15), height: null };
  }

  // Fallback: extract numbers, drop trailing single-digit "population" (1-6)
  if (numTokens.length >= 2) {
    let nums = [...numTokens];
    // If last number is small (1-6) and integer-ish and more than 2 nums, assume population
    const last = nums[nums.length - 1];
    if (nums.length > 2 && Number.isInteger(last) && last >= 1 && last <= 6) {
      nums.pop();
    }
    nums = nums.map(n => n > 20 ? +(n / 12).toFixed(2) : n).sort((a, b) => b - a);
    return {
      length: Math.min(nums[0], 20),
      width: Math.min(nums[1], 15),
      height: nums[2] != null ? Math.min(nums[2], 12) : null,
    };
  }

  // Default fallback
  return { length: 10, width: 10, height: null };
}

// ─── Emergency Contact Parser ────────────────────────────────────
function parseEmergencyContact(raw) {
  if (!raw || raw.trim() === '' || raw.toLowerCase() === 'test') {
    return { name: null, number: null, relationship: null };
  }
  // Common formats: "Mom, 212-555-5555", "Name (relationship), number", "Name - number"
  // Try to extract a name and number
  const phoneMatch = raw.match(/[\+]?[\d\s\-\(\)]{7,}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : null;

  // Try to separate name/relationship from phone
  let namepart = raw;
  if (phone) {
    namepart = raw.replace(phone, '').replace(/[,\-–—:]+\s*$/, '').trim();
  }

  // Try to detect relationship keywords
  const relKeywords = ['mom', 'mother', 'dad', 'father', 'sister', 'brother', 'wife', 'husband', 'partner', 'spouse', 'friend', 'cousin', 'aunt', 'uncle'];
  let relationship = null;
  let name = namepart;

  const lowerName = namepart.toLowerCase();
  for (const kw of relKeywords) {
    if (lowerName.includes(kw)) {
      relationship = kw.charAt(0).toUpperCase() + kw.slice(1);
      // If the field is just a relationship + number, the relationship IS the name label
      break;
    }
  }

  // Clean up parentheses and extra punctuation
  name = name.replace(/[\(\)]/g, '').replace(/[,\-–—:]+\s*$/, '').trim();
  if (!name || name.length < 2) name = null;

  return { name, number: phone, relationship };
}

// ─── Tent Sharing Parser ─────────────────────────────────────────
function parseTentSharing(raw) {
  if (!raw || raw.trim() === '') return null;
  const lower = raw.toLowerCase().trim();
  if (lower === 'no' || lower === 'n/a' || lower === 'heck no' || lower === 'only me!' || lower === 'me and my friend ally') return null;
  // Return the name of who they're sharing with
  return raw.trim();
}

// ─── Vehicle Intent Parser ───────────────────────────────────────
function parseVehicleInfo(vehicleField, tentField) {
  if (!vehicleField) return null;
  const lower = vehicleField.toLowerCase();
  if (lower.includes('not bringing') || lower.includes('i am not')) return null;
  if (lower.includes('want to talk') || lower.includes('bringing a vehicle')) {
    // They want to bring a vehicle
    return `Wants to bring vehicle. Tent info: ${tentField || 'N/A'}`;
  }
  return null;
}

// ─── Build Camper Record from CSV Row ────────────────────────────
function buildCamperRecord(headers, fields) {
  const get = (colSubstring) => {
    const idx = headers.findIndex(h => h.toLowerCase().includes(colSubstring.toLowerCase()));
    return idx >= 0 ? (fields[idx] || '').trim() : '';
  };

  const email = get('Email Address').toLowerCase();
  const fullName = get('Full Name');
  const phone = get('Phone Number');
  const tentRaw = get('Tent Size');
  const medicalRaw = get('medical conditions');
  const medicationsRaw = get('medication');
  const emergencyRaw = get('Emergency Contact');
  const allergiesRaw = get('allergies');
  const dietaryRaw = get('dietary');
  const attractedRaw = get('What attracted');
  const skillsRaw = get('professional qualification');
  const refsRaw = get('character references');
  const firstBurnRaw = get('first Burning Man');
  const burnCountRaw = get('How many burns');
  const referralRaw = get('first time with NYC Deli please list who');
  const volunteerRaw = get('willing to volunteer');
  const soberRaw = get('willing to be sober');
  const bgCheckRaw = get('background-checked');
  const sharingRaw = get('sharing your tent');
  const vehicleRaw = get('bring a vehicle');
  const tellBrianRaw = get('like to ask or tell Brian');

  // Parse tent dimensions
  const tent = parseTentDimensions(tentRaw);

  // Parse emergency contact
  const ec = parseEmergencyContact(emergencyRaw);

  // Parse vehicle info
  const vehicleInfo = parseVehicleInfo(vehicleRaw, tentRaw);

  // Parse burn count
  let burnCount = burnCountRaw;
  if (burnCountRaw) {
    const numMatch = burnCountRaw.match(/\d+/);
    burnCount = numMatch ? numMatch[0] : burnCountRaw;
  }

  // Tent sharing note
  const sharing = parseTentSharing(sharingRaw);
  let notes = '';
  if (sharing) notes += `Tent sharing with: ${sharing}. `;
  if (vehicleInfo) notes += vehicleInfo + '. ';
  if (tellBrianRaw && tellBrianRaw.toLowerCase() !== 'test' && tellBrianRaw.toLowerCase() !== 'n/a' && tellBrianRaw.toLowerCase() !== 'no') {
    notes += `Note to Brian: ${tellBrianRaw}`;
  }

  // Determine shelter type
  let shelterType = tent.shelter_type;
  if (vehicleRaw && vehicleRaw.toLowerCase().includes('rv') || tentRaw.toLowerCase().includes('rv')) {
    shelterType = 'rv';
  }

  const record = {
    full_name: fullName,
    email: email,
    phone: phone || null,
    arrival_date: '2026-08-30', // Default BM arrival
    arrival_method: 'car',
    departure_date: '2026-09-07', // Default BM departure
    early_arrival: false,
    shelter_type: shelterType,
    shelter_length_ft: tent.length,
    shelter_width_ft: tent.width,
    shelter_height_ft: tent.height,
    orientation_preference: 'any',
    power_required: false,
    power_type: 'none',
    shade_required: false,
    special_requests: null,
    kitchen_participation: true,
    preferred_shift_types: ['any'],
    strike_participation: true,
    build_week_attending: false,
    build_week_arrival_date: null,
    tools_bringing: [],
    vehicle_info: vehicleInfo,
    skills: [],
    custom_skills: skillsRaw || null,
    emergency_contact: emergencyRaw || null,
    emergency_contact_name: ec.name,
    emergency_contact_number: ec.number,
    emergency_contact_relationship: ec.relationship,
    medical_conditions: (medicalRaw && medicalRaw.toLowerCase() !== 'no' && medicalRaw.toLowerCase() !== 'test' && medicalRaw.toLowerCase() !== 'n/a') ? medicalRaw : null,
    medications: (medicationsRaw && medicationsRaw.toLowerCase() !== 'no' && medicationsRaw.toLowerCase() !== 'test' && medicationsRaw.toLowerCase() !== 'n/a') ? medicationsRaw : null,
    allergies: (allergiesRaw && allergiesRaw.toLowerCase() !== 'no' && allergiesRaw.toLowerCase() !== 'test' && allergiesRaw.toLowerCase() !== 'n/a' && allergiesRaw.toLowerCase() !== 'none') ? allergiesRaw : null,
    dietary_restrictions: (dietaryRaw && dietaryRaw.toLowerCase() !== 'no' && dietaryRaw.toLowerCase() !== 'test' && dietaryRaw.toLowerCase() !== 'n/a' && dietaryRaw.toLowerCase() !== 'none') ? dietaryRaw : null,
    burn_count: burnCount || null,
    what_attracted_you: (attractedRaw && attractedRaw.toLowerCase() !== 'test') ? attractedRaw : null,
    referral_source: (referralRaw && referralRaw.toLowerCase() !== 'test') ? referralRaw : null,
    character_references: (refsRaw && refsRaw.toLowerCase() !== 'test') ? refsRaw : null,
    first_burn_hopes: (firstBurnRaw && firstBurnRaw.toLowerCase() !== 'test') ? firstBurnRaw : null,
    volunteer_commitment: volunteerRaw.includes('Yes'),
    sober_shifts: soberRaw.includes('Yes'),
    background_check_consent: bgCheckRaw.includes('Yes'),
    notes: notes.trim() || null,
  };

  return record;
}

// ─── Supabase API Helpers ────────────────────────────────────────
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
    const msg = err.msg || err.message || '';
    if (msg.includes('already been registered') || msg.includes('already exists')) {
      // Fetch the existing user
      const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
        headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey },
      });
      const listData = await listRes.json();
      const existing = listData.users?.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) return { id: existing.id, existed: true };
      throw new Error(`User supposedly exists but not found: ${email}`);
    }
    throw new Error(`Failed to create auth user ${email}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return { id: data.id, existed: false };
}

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL error: ${text}`);
  }
  return res.json();
}

// Columns that need special PostgreSQL type casts
const COLUMN_CASTS = {
  preferred_shift_types: '::shift_type[]',
  skills: '::skill_tag[]',
  tools_bringing: '::text[]',
};

function escapeSQL(val, colName) {
  const cast = COLUMN_CASTS[colName] || '';
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return `'{}'${cast}`;
    return `ARRAY[${val.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]${cast}`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

// ─── Main Import ─────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       NYC DELI CAMP - CAMPER IMPORT SCRIPT          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // Read CSV
  const csvPath = join(__dirname, '..', 'public', 'Files', 'NYC Deli Camp Registration + Burning Man 26  (Responses) - Form Responses 1 (1).csv');
  const csvText = readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvText);

  const headers = rows[0];
  const dataRows = rows.slice(1).filter(r => r.length > 1 && r[1]); // Skip empty rows
  console.log(`Found ${dataRows.length} camper registrations\n`);

  const results = { created: 0, existed: 0, errors: [] };

  for (let i = 0; i < dataRows.length; i++) {
    const fields = dataRows[i];
    const camperData = buildCamperRecord(headers, fields);
    const email = camperData.email;
    const name = camperData.full_name;

    process.stdout.write(`[${i + 1}/${dataRows.length}] ${name} (${email})... `);

    try {
      // Step 1: Create auth user with default password
      const { id: userId, existed } = await createAuthUser(email, DEFAULT_PASSWORD);
      if (existed) {
        console.log(`auth user exists (${userId.slice(0, 8)}...)`);
      } else {
        console.log(`auth user created (${userId.slice(0, 8)}...)`);
      }

      // Step 2: Upsert camper record
      const camperColumns = Object.keys(camperData);
      const camperValues = camperColumns.map(k => escapeSQL(camperData[k], k));

      // Build upsert: INSERT ... ON CONFLICT (email) DO UPDATE
      const insertSQL = `
        INSERT INTO campers (${camperColumns.join(', ')})
        VALUES (${camperValues.join(', ')})
        ON CONFLICT (email) DO UPDATE SET
          ${camperColumns.filter(c => c !== 'email').map(c => `${c} = EXCLUDED.${c}`).join(',\n          ')}
        RETURNING id;
      `;

      const camperResult = await runSQL(insertSQL);
      let camperId;
      if (Array.isArray(camperResult) && camperResult.length > 0) {
        camperId = camperResult[0].id;
      }
      console.log(`         ↳ camper record upserted${camperId ? ` (${camperId.slice(0, 8)}...)` : ''}`);

      // Step 3: Update user_profile → link camper_id, approve (preserve existing admin role)
      if (camperId) {
        const profileSQL = `
          UPDATE user_profiles
          SET role = CASE WHEN role = 'admin' THEN 'admin' ELSE 'user' END,
              camper_id = '${camperId}',
              approved_at = COALESCE(approved_at, NOW()),
              approved_by = COALESCE(approved_by, id)
          WHERE id = '${userId}'
            AND (camper_id IS NULL OR camper_id != '${camperId}');
        `;
        await runSQL(profileSQL);
        console.log(`         ↳ profile linked & approved as 'user'`);
      }

      results.created++;
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.errors.push({ email, name, error: err.message });
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                    IMPORT SUMMARY                    ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  ✅ Successfully processed: ${results.created}`);
  console.log(`  ❌ Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n  Errors:');
    for (const e of results.errors) {
      console.log(`    - ${e.name} (${e.email}): ${e.error}`);
    }
  }

  console.log('\n  Default password for all users: NYCDeli2026!');
  console.log('  All users approved with role: user');
  console.log('  Camper details saved with tent sizes, emergency contacts,');
  console.log('  medical info, dietary restrictions, skills, and more.');
  console.log('  Users are connected to shift draft system via camper records.');
  console.log('  Tent sizes are stored for camp spot reservation matching.\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
