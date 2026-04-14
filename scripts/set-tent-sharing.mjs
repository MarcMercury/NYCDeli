import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Read CSV
const csvPath = join(__dirname, '..', 'public', 'Campers', 'NYC Deli Camp Registration + Burning Man 26  (Responses) - Form Responses 1.csv');
const csvContent = readFileSync(csvPath, 'utf-8');

// Manual CSV parse (no extra deps needed)
function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  let row = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(current);
      current = '';
      if (row.length > 1) rows.push(row);
      row = [];
    } else {
      current += ch;
    }
  }
  if (current || row.length) {
    row.push(current);
    if (row.length > 1) rows.push(row);
  }
  return rows;
}

const rows = parseCSV(csvContent);
const dataRows = rows.slice(1);

// Extract sharing info from CSV
const sharingInfo = [];
for (const row of dataRows) {
  const email = (row[1] || '').trim().toLowerCase();
  const fullName = (row[2] || '').trim();
  const sharingRaw = (row[22] || '').trim();
  if (sharingRaw) {
    sharingInfo.push({ email, fullName, sharingRaw });
  }
}

// Fetch all campers from Supabase
async function fetchCampers() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/campers?select=id,email,full_name,playa_name,sharing_tent_with&order=full_name`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  return await res.json();
}

async function updateCamper(id, sharingTentWith) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/campers?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ sharing_tent_with: sharingTentWith }),
  });
  return res.ok;
}

// Normalize name for fuzzy matching
function normalize(s) {
  return s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

// Try to find a camper match for a sharing text
function findMatch(sharingText, campers, selfEmail) {
  // Skip non-sharing answers
  const skipPatterns = [
    /^no[.,!]?$/i, /^nope/i, /^n\/a/i, /^none/i, /^na$/i, /^n$/i,
    /^just me/i, /^only me/i, /^heck no/i, /^probably not/i,
    /^i may bring/i, /we are discussing/i, /party of six/i,
    /we will be staying in an rv/i,
  ];
  
  for (const pat of skipPatterns) {
    if (pat.test(sharingText.trim())) return null;
  }

  // Try to extract a name from common patterns
  let candidateName = sharingText
    .replace(/^yes[,!.\s]*/i, '')
    .replace(/^sharing a tent with\s*/i, '')
    .replace(/^with\s*/i, '')
    .replace(/^my (wife|husband|partner|friend|spouse)[,.\s]*/i, '')
    .replace(/\(.*?\)/g, '')  // remove parentheticals
    .replace(/[-–].*$/, '')   // remove dash suffixes like "- will be in RV"
    .replace(/[.,]?\s*(separate|individual|he |she |they |will |has |who |a friend|spouse|over \d).*$/i, '')
    .replace(/[.,!]+$/, '')
    .trim();

  if (!candidateName || candidateName.length < 3) return null;

  const normCandidate = normalize(candidateName);

  // Exact full name match
  for (const c of campers) {
    if (c.email.toLowerCase() === selfEmail) continue;
    if (normalize(c.full_name) === normCandidate) return c;
  }

  // Match by last name + first name substring
  for (const c of campers) {
    if (c.email.toLowerCase() === selfEmail) continue;
    const normFull = normalize(c.full_name);
    const parts = normCandidate.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      // Check if first and last name match
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      const camperParts = normFull.split(' ').filter(Boolean);
      const camperFirst = camperParts[0];
      const camperLast = camperParts[camperParts.length - 1];
      if (camperFirst === firstName && camperLast === lastName) return c;
      // Also check reversed
      if (camperFirst === lastName && camperLast === firstName) return c;
    }
  }

  // Playa name match
  for (const c of campers) {
    if (c.email.toLowerCase() === selfEmail) continue;
    if (c.playa_name && normalize(c.playa_name) === normCandidate) return c;
  }

  // Partial match: candidate contains or is contained in camper name
  for (const c of campers) {
    if (c.email.toLowerCase() === selfEmail) continue;
    const normFull = normalize(c.full_name);
    if (normFull.includes(normCandidate) || normCandidate.includes(normFull)) return c;
    // Check first + last name combo
    const camperParts = normFull.split(' ').filter(Boolean);
    if (camperParts.length >= 2) {
      const firstLast = `${camperParts[0]} ${camperParts[camperParts.length - 1]}`;
      if (firstLast === normCandidate || normCandidate.includes(firstLast)) return c;
    }
    // Check playa name partial
    if (c.playa_name && normalize(c.playa_name).includes(normCandidate)) return c;
    if (c.playa_name && normCandidate.includes(normalize(c.playa_name))) return c;
  }

  // Last resort: match any camper whose last name appears in candidate
  const candidateParts = normCandidate.split(' ').filter(Boolean);
  if (candidateParts.length >= 1) {
    const candidateLast = candidateParts[candidateParts.length - 1];
    if (candidateLast.length >= 4) { // avoid short name false matches
      const matches = campers.filter(c => {
        if (c.email.toLowerCase() === selfEmail) return false;
        const cParts = normalize(c.full_name).split(' ').filter(Boolean);
        return cParts[cParts.length - 1] === candidateLast;
      });
      if (matches.length === 1) return matches[0];
    }
  }

  return null;
}

async function main() {
  const campers = await fetchCampers();
  console.log(`Fetched ${campers.length} campers from database\n`);

  const updates = [];
  const unmatched = [];

  for (const info of sharingInfo) {
    const match = findMatch(info.sharingRaw, campers, info.email);
    if (match) {
      updates.push({
        email: info.email,
        fullName: info.fullName,
        sharingRaw: info.sharingRaw,
        matchId: match.id,
        matchName: match.full_name,
      });
    } else {
      // Check if it's a skip pattern
      const skipPatterns = [
        /^no[.,!]?$/i, /^nope/i, /^n\/a/i, /^none/i, /^na$/i, /^n$/i,
        /^just me/i, /^only me/i, /^heck no/i, /^probably not/i,
        /^i may bring/i, /we are discussing/i, /party of six/i,
        /we will be staying in an rv/i, /^me and my friend/i,
      ];
      const isSkip = skipPatterns.some(p => p.test(info.sharingRaw.trim()));
      if (!isSkip) {
        unmatched.push(info);
      }
    }
  }

  console.log('=== MATCHES FOUND ===');
  for (const u of updates) {
    console.log(`  ${u.fullName} (${u.email}) => ${u.matchName} [${u.matchId}]`);
    console.log(`    CSV: "${u.sharingRaw}"`);
  }

  console.log(`\n=== UNMATCHED (${unmatched.length}) ===`);
  for (const u of unmatched) {
    console.log(`  ${u.fullName} (${u.email}) => "${u.sharingRaw}"`);
  }

  console.log(`\nApplying ${updates.length} updates...\n`);

  // Find camper IDs by email
  const camperByEmail = new Map();
  for (const c of campers) {
    camperByEmail.set(c.email.toLowerCase(), c);
  }

  let success = 0;
  let fail = 0;
  for (const u of updates) {
    const self = camperByEmail.get(u.email);
    if (!self) {
      console.log(`  SKIP: No camper record for ${u.email}`);
      fail++;
      continue;
    }
    const ok = await updateCamper(self.id, u.matchId);
    if (ok) {
      console.log(`  ✓ ${u.fullName} => sharing with ${u.matchName}`);
      success++;
    } else {
      console.log(`  ✗ FAILED: ${u.fullName}`);
      fail++;
    }
  }

  console.log(`\nDone: ${success} updated, ${fail} failed`);
}

main().catch(console.error);
