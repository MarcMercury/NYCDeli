/**
 * sync-tent-sleeping-pdf.mjs
 *
 * One-off importer for the "Burning Man Camp _ Tent & Sleeping Logistics"
 * PDF responses (24 entries). This is an INCOMPLETE list — it only updates
 * campers present in it, adds any missing campers, and wires up tent-sharing
 * relationships. It NEVER deletes campers not on the list.
 *
 * Run:  node scripts/sync-tent-sleeping-pdf.mjs          (dry run / preview)
 *       node scripts/sync-tent-sleeping-pdf.mjs --apply  (write changes)
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--apply');

// Load .env.local
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

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// ── PDF data (transcribed from the Tent & Sleeping Logistics form) ──────────
// shelter: tent | shiftpod | rv
// opening: width | length | both | null
// note: substantive placement note (trivial "No/Nope/n/a" omitted)
// New campers (not yet in DB) carry `email` for insert.
const ENTRIES = [
  { name: 'Aaron Sheya', shelter: 'tent', w: 10, l: 18, h: 7, doors: 2, opening: 'width', make: 'No bake tent', note: 'Builder, so should be placed with other builders for shade building purposes.', sharing: ['Tatiana Pisetta'] },
  { name: 'Marc Mercury', shelter: 'tent', w: 11, l: 14, h: 6, doors: 2, opening: 'both', make: 'Black out', note: null, sharing: ['Jessica Mercury'] },
  { name: 'Caroline Trumpff', shelter: 'tent', w: 9, l: 10, h: 6, doors: 1, opening: 'width', make: 'Coleman 6 Person Instant Camping Tent', note: 'I am on the spectrum and I get overstimulated by noise (official autism diagnosis, happy to share if needed). I would love to be placed in a quiet area if possible.', sharing: [] },
  { name: 'Elvina Yau', shelter: 'tent', w: 5, l: 7, h: 4, doors: 1, opening: 'width', make: 'https://a.co/d/0cmXsUMf', note: null, sharing: [] },
  { name: 'Sundeep Ghuman', shelter: 'shiftpod', w: 13, l: 13, h: 7, doors: 2, opening: 'width', make: 'Shiftpod III', note: 'I will have a swamp cooler.', sharing: [] },
  { name: 'Mikhail Lara', email: 'mikhail.lara.pdf@placeholder.local', shelter: 'tent', w: 10, l: 9, h: 6, doors: 1, opening: 'length', make: 'https://www.amazon.com/gp/aw/d/B0D6NQKDWJ', note: null, sharing: [] },
  { name: 'Emily MacKenzie', shelter: 'tent', w: 9, l: 10, h: 6, doors: 1, opening: 'length', make: 'Coleman Pop Up 6 person https://a.co/d/0f8MQdv8', note: 'Might like to be near Deborah Newman as it is my first time going and she is my guide.', sharing: [] },
  { name: 'Jacob Kaplan', shelter: 'tent', w: 7, l: 18, h: 7, doors: 1, opening: 'width', make: 'nobaketent', note: null, sharing: ['Yi Yang'] },
  { name: 'John Keefe', shelter: 'tent', w: 10, l: 10, h: 8, doors: 2, opening: 'length', make: 'https://kodiakcanvas.com/products/10-x-10-ft-flex-bow-deluxe-canvas-camping-tent', note: 'Since we are two, we like to keep a couple of closed yellow-tops behind or next to our tent. Otherwise we don\'t fit!', sharing: ['Marie Gilot'] },
  { name: 'Natalie Koonce', shelter: 'tent', w: 10, l: 10, h: 6, doors: 1, opening: 'width', make: 'Coleman 6 person instant tent', note: null, sharing: [] },
  { name: 'Danny Korte', shelter: 'tent', w: 11, l: 13, h: 7, doors: 1, opening: 'width', make: 'https://www.nobaketent.com/specifications/', note: null, sharing: [] },
  { name: 'Deborah Newman', shelter: 'tent', w: 10, l: 10, h: 6, doors: 1, opening: 'length', make: 'Coleman Pop Up 10 x 10', note: 'I\'d love to be on the outer edge of the shade structure, facing my door out to the sunshine. I don\'t mind the heat or light. Most years placed along the back edge. My friend Emily McKenzie is joining this year - if we could be near each other that would be amazing.', sharing: [] },
  { name: 'Gina Montoya', shelter: 'tent', w: 9, l: 11, h: 6, doors: 1, opening: 'length', make: 'https://www.amazon.com/dp/B0BF7GDSP7', note: null, sharing: [] },
  { name: 'Morgan Birman', shelter: 'tent', w: 10, l: 14, h: 7, doors: 1, opening: 'width', make: 'Coleman Skylodge 10-Person Camping Tent', note: null, sharing: ['Sophia Marchetti'] },
  { name: 'Rebekah Terry', shelter: 'tent', w: 10, l: 12, h: 7, doors: 1, opening: 'length', make: 'kodiak', note: null, sharing: ['Jack Rehmann'] },
  { name: 'Gary Pierre', shelter: 'tent', w: 10, l: 18, h: 7, doors: 2, opening: 'length', make: 'No bake tent', note: 'Same tent used in past burns; believe others also had a no bake tent.', sharing: [] },
  { name: 'Shai Olsher', shelter: 'rv', w: 9, l: 37, h: 11, doors: 1, opening: null, make: 'Meatball at Nomad Solutions (Jen Katzir) https://share.google/zmy5BWwHowdkPpjHe', note: '3 pump valve system. We are coming 6 people in one RV (not 2).', sharing: ['Dana Olsher', 'Tal Zigman', 'Eran Zigman', 'Ronny Kashai', 'Dor Sasson'] },
  { name: 'Joanna Tsai', shelter: 'tent', w: 10, l: 10, h: 6, doors: 1, opening: 'length', make: 'Pop up Coleman', note: 'Partner Danny Korte and I would like our tents a bit far away from each other. If possible I\'d love to be placed next to/near James Francisco, Aaron Muilenburg, Gina Montoya, Tahanna Byatt, and/or Sharon McCoy.', sharing: [] },
  { name: 'Erik Chan', shelter: 'tent', w: 10, l: 14, h: 10, doors: 1, opening: 'width', make: 'https://www.amazon.com/Coleman-1-Minute-Instant-Weatherproof-Pre-Attached/dp/B0D7QFR2WQ/', note: null, sharing: ['Rina Shin'] },
  { name: 'Vivian Au', shelter: 'tent', w: 7, l: 8, h: 5, doors: 1, opening: 'width', make: 'https://www.amazon.com/Coleman-4-Person-Cabin-Camping-Instant/dp/B0D7QK1N81/', note: 'Would be amazing if I can be placed next to Erik/Rina\'s tent.', sharing: [] },
  { name: 'Alaine Kiera Fredericksen', shelter: 'tent', w: 9, l: 13, h: 7, doors: 2, opening: 'width', make: 'REI co-op kingdom 8 tent https://wildernesstimes.com/rei-kingdom-8-review/', note: null, sharing: [] },
  { name: 'Lauren Crudele', shelter: 'tent', w: 8, l: 7, h: 5, doors: 1, opening: 'length', make: 'https://www.walmart.com/ip/Coleman-4-Person-Cabin-Camping-Tent-with-Instant-Setup/15165457345', note: null, sharing: [] },
  { name: 'Aaron Muilenburg', shelter: 'tent', w: 10, l: 9, h: 6, doors: 1, opening: 'width', make: 'Coleman 6-Person Instant Cabin Tent', note: 'Planning on putting an external swamp cooler on either the side or back of it, depending on where there is room. Consists of roughly 2.5 5-gallon buckets stacked on top of each other.', sharing: ['Graceanne Ludwig'] },
  { name: 'Grace Ludwig', shelter: 'tent', w: 10, l: 9, h: 6, doors: 2, opening: 'width', make: 'Coleman 6-Person Instant Cabin Tent', note: null, sharing: ['Aaron Muilenburg'] },
];

// Manual name aliases → DB full_name (PDF name : DB full_name)
const NAME_ALIASES = {
  'marc mercury': 'Marc Hamilton Mercury',
  'emily mackenzie': 'Emily Kores MacKenzie',
  'jacob kaplan': 'Jacob Taylor Kaplan',
  'john keefe': 'John (Nick) Francis Keefe',
  'danny korte': 'Daniel Scott Korte',
  'deborah newman': 'Deborah Frances Newman',
  'gary pierre': 'Gary Pierre',
  'joanna tsai': 'Joanna Elizabeth Tsai',
  'erik chan': 'Erik Chan Chi Hein',
  'vivian au': 'Wai Foon Vivian Au',
  'lauren crudeld': 'Lauren Crudele',
  'grace ludwig': 'Graceanne Ludwig',
  'graceanne ludwig': 'Graceanne Ludwig',
  'jessica mercury': 'Jessica Mercury',
  'yi yang': 'YI YANG',
  'marie gilot': 'Marie Gilot',
  'sophia marcherti': 'Sophia Marchetti',
  'sophia marchetti': 'Sophia Marchetti',
  'jack rehmann': 'Jack Campbell Rehmann',
  'rina shin': 'Christina Shin (Rina)',
  'dana olsher': 'Dana Olsher',
  'tal zigman': 'Tal Zigman',
  'eran zigman': 'Eran Zigman',
  'ronny kashai': 'Haim Ronny Kashai',
  'dor sasson': 'Dor Sasson',
  'tatiana pisetta': 'Tatiana Pisetta',
  'aaron muilenburg': 'Aaron Muilenburg',
};

function norm(s) {
  return (s || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchCampers() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/campers?select=*&order=full_name`, { headers });
  return res.json();
}

async function patchCamper(id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/campers?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${id}: ${res.status} ${await res.text()}`);
}

async function insertCamper(body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/campers`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`INSERT: ${res.status} ${await res.text()}`);
  return (await res.json())[0];
}

function findCamper(pdfName, campers) {
  const alias = NAME_ALIASES[pdfName.toLowerCase()];
  if (alias) {
    const byAlias = campers.find(c => norm(c.full_name) === norm(alias));
    if (byAlias) return byAlias;
  }
  const target = norm(pdfName);
  let hit = campers.find(c => norm(c.full_name) === target);
  if (hit) return hit;
  // last-name + first-name containment
  hit = campers.find(c => {
    const n = norm(c.full_name);
    return n.includes(target) || target.split(' ').every(p => n.includes(p));
  });
  return hit || null;
}

function mergeNote(existing, incoming) {
  if (!incoming) return existing ?? null;
  const cur = (existing || '').trim();
  if (!cur) return incoming;
  if (cur.includes(incoming)) return cur;
  return `${cur} | ${incoming}`;
}

(async () => {
  const campers = await fetchCampers();
  console.log(`Loaded ${campers.length} campers from DB. Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);

  // Pass 1: ensure all entries exist (update or insert), record id map.
  const idByPdfName = new Map();
  for (const e of ENTRIES) {
    let camper = findCamper(e.name, campers);
    const fields = {
      shelter_type: e.shelter,
      shelter_width_ft: e.w,
      shelter_length_ft: e.l,
      shelter_height_ft: e.h,
      tent_entrance_count: e.doors,
      tent_opening_side: e.opening,
      tent_make_model: e.make,
    };

    if (camper) {
      const body = { ...fields, special_requests: mergeNote(camper.special_requests, e.note) };
      if (camper.shelter_type === 'rv' || camper.shelter_type === 'vehicle') {
        // keep existing rv/vehicle distinction unless PDF explicitly says rv
        if (e.shelter !== 'rv') body.shelter_type = camper.shelter_type;
      }
      console.log(`UPDATE  ${camper.full_name}  ${e.shelter} ${e.w}x${e.l}x${e.h} doors=${e.doors} open=${e.opening}`);
      if (APPLY) await patchCamper(camper.id, body);
      idByPdfName.set(e.name.toLowerCase(), camper.id);
    } else {
      // New camper — insert with sensible defaults from schema.
      const newBody = {
        full_name: e.name,
        email: e.email || `${norm(e.name).replace(/ /g, '.')}@placeholder.local`,
        arrival_date: '2026-08-25',
        arrival_method: 'car',
        departure_date: '2026-09-01',
        ...fields,
        special_requests: e.note || null,
      };
      console.log(`INSERT  ${e.name}  ${e.shelter} ${e.w}x${e.l}x${e.h} (NEW)`);
      if (APPLY) {
        const created = await insertCamper(newBody);
        idByPdfName.set(e.name.toLowerCase(), created.id);
        campers.push(created);
      } else {
        idByPdfName.set(e.name.toLowerCase(), `NEW:${e.name}`);
      }
    }
  }

  // Pass 2: wire up tent-sharing relationships (up to 5 partner slots).
  console.log('\n── Tent sharing ──');
  const slotCols = ['sharing_tent_with', 'sharing_tent_with_2', 'sharing_tent_with_3', 'sharing_tent_with_4', 'sharing_tent_with_5'];
  for (const e of ENTRIES) {
    if (!e.sharing || e.sharing.length === 0) continue;
    const selfId = idByPdfName.get(e.name.toLowerCase());
    const partnerIds = [];
    for (const pName of e.sharing) {
      const partner = findCamper(pName, campers);
      if (!partner) {
        console.log(`  !! ${e.name}: partner "${pName}" NOT FOUND — skipped`);
        continue;
      }
      partnerIds.push(partner.id);
    }
    if (partnerIds.length === 0) continue;
    if (partnerIds.length > 5) {
      console.log(`  !! ${e.name}: ${partnerIds.length} partners exceeds 5 slots — truncating`);
    }
    const body = {};
    slotCols.forEach((col, i) => { body[col] = partnerIds[i] || null; });
    console.log(`  ${e.name} → [${e.sharing.join(', ')}] (${partnerIds.length} slots)`);
    if (APPLY && typeof selfId === 'string' && !selfId.startsWith('NEW:')) {
      await patchCamper(selfId, body);
    }
  }

  console.log(`\nDone. ${APPLY ? 'Changes written.' : 'Dry run — re-run with --apply to write.'}`);
})();
