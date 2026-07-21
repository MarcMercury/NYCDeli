/**
 * propagate-shared-tent-dims.mjs
 *
 * Campers who share one tent/RV must carry identical shelter dimensions & info.
 * This script reads the "sharing_tent_with*" links and copies the canonical
 * shelter fields to everyone in each sharing group.
 *
 * Canonical source per group (priority):
 *   1. A logistics-form tent OWNER (the person who described the tent and
 *      listed who shares it — see PREFERRED_OWNERS).
 *   2. Otherwise, the member with the most complete real data.
 *
 * A member is UPDATED when it is a placeholder/incomplete record, OR when the
 * canonical is a logistics owner that explicitly listed them as a tent partner.
 * Pairs where BOTH people submitted their own real (conflicting) data and are
 * NOT part of the logistics sharing directive are LEFT ALONE and flagged.
 *
 * Run:  node scripts/propagate-shared-tent-dims.mjs          (dry run)
 *       node scripts/propagate-shared-tent-dims.mjs --apply  (write changes)
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--apply');

try {
  const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

const SLOTS = ['sharing_tent_with', 'sharing_tent_with_2', 'sharing_tent_with_3', 'sharing_tent_with_4', 'sharing_tent_with_5'];
const SHELTER_FIELDS = ['shelter_type', 'shelter_width_ft', 'shelter_length_ft', 'shelter_height_ft', 'tent_entrance_count', 'tent_opening_side', 'tent_make_model', 'bringing_vehicle'];

// Logistics-form tent owners (canonical describers of a shared shelter).
// These take precedence as the source of truth for their sharing group.
const PREFERRED_OWNERS = [
  'Aaron Sheya', 'Marc Hamilton Mercury', 'Jacob Taylor Kaplan', 'John (Nick) Francis Keefe',
  'Morgan Birman', 'Rebekah Terry', 'Shai Olsher', 'Erik Chan Chi Hein', 'Aaron Muilenburg',
  'Allie Shuldman', 'Rishi Malhotra', 'Gail Feldsherova', 'Petra Kumi', 'Kristina Schmidt',
];

function isPlaceholder(c) {
  const w = Number(c.shelter_width_ft), l = Number(c.shelter_length_ft);
  const noHeight = c.shelter_height_ft == null;
  const noMake = c.tent_make_model == null || String(c.tent_make_model).trim() === '';
  // 11x11 default footprint w/ no height, OR no make + no height at all.
  return (w === 11 && l === 11 && noHeight) || (noMake && noHeight);
}

function dataScore(c) {
  let s = 0;
  if (!isPlaceholder(c)) s += 4;
  if (c.tent_make_model && String(c.tent_make_model).trim()) s += 2;
  if (c.shelter_height_ft != null) s += 1;
  return s;
}

function shelterStr(c) {
  return `${c.shelter_type} ${c.shelter_width_ft}x${c.shelter_length_ft}x${c.shelter_height_ft ?? '-'} make=${c.tent_make_model ? String(c.tent_make_model).slice(0, 30) : 'NULL'}`;
}

async function patchCamper(id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/campers?id=eq.${id}`, {
    method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${id}: ${res.status} ${await res.text()}`);
}

(async () => {
  const c = await (await fetch(`${SUPABASE_URL}/rest/v1/campers?select=*&order=full_name`, { headers })).json();
  const byId = Object.fromEntries(c.map(x => [x.id, x]));
  console.log(`Loaded ${c.length} campers. Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);

  // Union-find over sharing links (bidirectional).
  const parent = {};
  const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a, b) => { parent[find(a)] = find(b); };
  for (const x of c) parent[x.id] = x.id;
  for (const x of c) {
    for (const s of SLOTS) {
      const pid = x[s];
      if (pid && byId[pid]) union(x.id, pid);
    }
  }

  const groups = {};
  for (const x of c) {
    const r = find(x.id);
    (groups[r] ||= []).push(x);
  }

  const updates = [];   // {id, full_name, from, to, reason}
  const flags = [];

  for (const members of Object.values(groups)) {
    if (members.length < 2) continue; // not sharing

    // Pick canonical.
    let canonical = members.find(m => PREFERRED_OWNERS.includes(m.full_name));
    if (!canonical) {
      canonical = [...members].sort((a, b) => dataScore(b) - dataScore(a))[0];
      if (isPlaceholder(canonical)) {
        flags.push(`GROUP [${members.map(m => m.full_name).join(', ')}] — all placeholder, left at 11x11.`);
        continue;
      }
    }

    const canonicalIsOwner = PREFERRED_OWNERS.includes(canonical.full_name);
    const canonPartnerIds = new Set(SLOTS.map(s => canonical[s]).filter(Boolean));

    for (const m of members) {
      if (m.id === canonical.id) continue;
      const mLinksCanon = SLOTS.some(s => m[s] === canonical.id);
      const listedByOwner = canonicalIsOwner && (canonPartnerIds.has(m.id) || mLinksCanon);

      let doUpdate = false, reason = '';
      if (isPlaceholder(m)) { doUpdate = true; reason = 'placeholder → inherit'; }
      else if (listedByOwner) { doUpdate = true; reason = 'listed tent partner → match owner'; }

      if (!doUpdate) {
        flags.push(`SKIP ${m.full_name} [${shelterStr(m)}] shares w/ ${canonical.full_name} [${shelterStr(canonical)}] — both have own real data.`);
        continue;
      }

      // Skip if already identical.
      const identical = SHELTER_FIELDS.every(f => String(m[f]) === String(canonical[f]));
      if (identical) continue;

      updates.push({ id: m.id, full_name: m.full_name, from: shelterStr(m), to: shelterStr(canonical), canonical: canonical.full_name, reason,
        body: Object.fromEntries(SHELTER_FIELDS.map(f => [f, canonical[f]])) });
    }
  }

  console.log('── Propagations ──');
  for (const u of updates) {
    console.log(`${u.full_name}\n   from: ${u.from}\n   to:   ${u.to}  (← ${u.canonical}; ${u.reason})`);
    if (APPLY) await patchCamper(u.id, u.body);
  }

  console.log(`\n── Left alone / flags (${flags.length}) ──`);
  flags.forEach(f => console.log('  ' + f));

  console.log(`\nUpdated ${updates.length} campers. ${APPLY ? 'Changes written.' : 'DRY RUN — re-run with --apply.'}`);
})();
