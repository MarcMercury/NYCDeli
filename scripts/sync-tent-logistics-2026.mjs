/**
 * sync-tent-logistics-2026.mjs
 *
 * Importer for the "Burning Man Camp _ Tent & Sleeping Logistics (Responses)"
 * spreadsheet added 2026-07 (38 form responses, 37 unique people — Rishi
 * Malhotra submitted twice; the later submission wins).
 *
 * This is an UPDATE list: it only updates campers present in it, inserts any
 * missing campers, and wires up tent/RV-sharing relationships. It NEVER
 * deletes campers who are not on the list.
 *
 * Run:  node scripts/sync-tent-logistics-2026.mjs          (dry run / preview)
 *       node scripts/sync-tent-logistics-2026.mjs --apply  (write changes)
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

// ── Spreadsheet data (transcribed from the Tent & Sleeping Logistics form) ──
// shelter: tent | shiftpod | rv | vehicle | other
// opening: width | length | both | null (RV = null)
// note: substantive placement note (trivial "No/Nope/n/a/none" omitted)
const ENTRIES = [
  { name: 'Aaron Sheya', shelter: 'tent', w: 10, l: 18, h: 7, doors: 2, opening: 'width', make: 'No bake tent', note: 'Builder — should be placed with other builders for shade building purposes.', sharing: ['Tatiana Pisetta'] },
  { name: 'Marc Mercury', shelter: 'tent', w: 11, l: 14, h: 6, doors: 2, opening: 'both', make: 'Black out', note: null, sharing: ['Jessica Mercury'] },
  { name: 'Caroline Trumpff', shelter: 'tent', w: 9, l: 10, h: 6, doors: 1, opening: 'width', make: 'Coleman 6 Person Instant Camping Tent', note: 'I am on the spectrum and get overstimulated by noise (official autism diagnosis, happy to share if needed). Would love to be placed in a quiet area if possible.', sharing: [] },
  { name: 'Elvina Yau', shelter: 'tent', w: 5, l: 7, h: 4, doors: 1, opening: 'width', make: 'https://a.co/d/0cmXsUMf', note: null, sharing: [] },
  { name: 'Sundeep Ghuman', shelter: 'shiftpod', w: 13, l: 13, h: 7, doors: 2, opening: 'width', make: 'Shiftpod III', note: 'I will have a swamp cooler.', sharing: [] },
  { name: 'Mikhail Lara', shelter: 'tent', w: 10, l: 9, h: 6, doors: 1, opening: 'length', make: 'https://www.amazon.com/gp/aw/d/B0D6NQKDWJ', note: null, sharing: [] },
  { name: 'Emily MacKenzie', shelter: 'tent', w: 9, l: 10, h: 6, doors: 1, opening: 'length', make: 'Coleman Pop Up 6 person https://a.co/d/0f8MQdv8', note: 'Might like to be near Deborah Newman as it is my first time going and she is my guide.', sharing: [] },
  { name: 'Jacob Kaplan', shelter: 'tent', w: 7, l: 18, h: 7, doors: 1, opening: 'width', make: 'nobaketent', note: null, sharing: ['Yi Yang'] },
  { name: 'John Keefe', shelter: 'tent', w: 10, l: 10, h: 8, doors: 2, opening: 'length', make: 'https://kodiakcanvas.com/products/10-x-10-ft-flex-bow-deluxe-canvas-camping-tent', note: 'Since we are two, we like to keep a couple of closed yellow-tops behind or next to our tent. Otherwise we don\'t fit!', sharing: ['Marie Gilot'] },
  { name: 'Natalie Koonce', shelter: 'tent', w: 10, l: 10, h: 6, doors: 1, opening: 'width', make: 'Coleman 6 person instant tent', note: null, sharing: [] },
  { name: 'Danny Korte', shelter: 'tent', w: 11, l: 13, h: 7, doors: 1, opening: 'width', make: 'https://www.nobaketent.com/specifications/', note: null, sharing: [] },
  { name: 'Deborah Newman', shelter: 'tent', w: 10, l: 10, h: 6, doors: 1, opening: 'length', make: 'Coleman Pop Up 10 x 10', note: 'I\'d love to be on the outer edge of the shade structure, facing my door out to the sunshine. I don\'t mind the heat or light. My friend Emily McKenzie is joining this year — if we could be near each other that would be amazing.', sharing: [] },
  { name: 'Gina Montoya', shelter: 'tent', w: 9, l: 11, h: 6, doors: 1, opening: 'length', make: 'https://www.amazon.com/dp/B0BF7GDSP7', note: 'Would love to be near Tahanna Byatt and Nick & Nora (John/Marie).', sharing: [] },
  { name: 'Morgan Birman', shelter: 'tent', w: 10, l: 14, h: 7, doors: 1, opening: 'width', make: 'Coleman Skylodge 10-Person Camping Tent', note: null, sharing: ['Sophia Marchetti'] },
  { name: 'Rebekah Terry', shelter: 'tent', w: 10, l: 12, h: 7, doors: 1, opening: 'length', make: 'kodiak', note: null, sharing: ['Jack Rehmann'] },
  { name: 'Gary Pierre', shelter: 'tent', w: 10, l: 18, h: 7, doors: 2, opening: 'length', make: 'No bake tent', note: 'Same tent used in past burns; believe others also had a no bake tent.', sharing: [] },
  { name: 'Shai Olsher', shelter: 'rv', w: 9, l: 37, h: 11, doors: 1, opening: null, make: 'Meatball at Nomad Solutions (Jen Katzir) https://share.google/zmy5BWwHowdkPpjHe', note: '3 pump valve system. We are coming 6 people in one RV (not 2).', sharing: ['Dana Olsher', 'Tal Zigman', 'Eran Zigman', 'Ronny Kashai', 'Dor Sasson'] },
  { name: 'Joanna Tsai', shelter: 'tent', w: 10, l: 10, h: 6, doors: 1, opening: 'length', make: 'Pop up Coleman', note: 'Partner Danny Korte and I would like our tents a bit far apart. If possible, place near James Francisco, Aaron Muilenburg, Gina Montoya, Tahanna Byatt, and/or Sharon McCoy.', sharing: [] },
  { name: 'Erik Chan', shelter: 'tent', w: 10, l: 14, h: 10, doors: 1, opening: 'width', make: 'https://www.amazon.com/Coleman-1-Minute-Instant-Weatherproof-Pre-Attached/dp/B0D7QFR2WQ/', note: null, sharing: ['Rina Shin'] },
  { name: 'Vivian Au', shelter: 'tent', w: 7, l: 8, h: 5, doors: 1, opening: 'width', make: 'https://www.amazon.com/Coleman-4-Person-Cabin-Camping-Instant/dp/B0D7QK1N81/', note: 'Would be amazing to be placed next to Erik/Rina\'s tent.', sharing: [] },
  { name: 'Alaine Kiera Fredericksen', shelter: 'tent', w: 9, l: 13, h: 7, doors: 2, opening: 'width', make: 'REI co-op Kingdom 8 tent https://wildernesstimes.com/rei-kingdom-8-review/', note: null, sharing: [] },
  { name: 'Lauren Crudele', shelter: 'tent', w: 8, l: 7, h: 5, doors: 1, opening: 'length', make: 'https://www.walmart.com/ip/Coleman-4-Person-Cabin-Camping-Tent-with-Instant-Setup/15165457345', note: null, sharing: [] },
  { name: 'Aaron Muilenburg', shelter: 'tent', w: 10, l: 9, h: 6, doors: 1, opening: 'width', make: 'Coleman 6-Person Instant Cabin Tent', note: 'Planning on an external swamp cooler on the side or back (roughly 2.5 stacked 5-gallon buckets).', sharing: ['Graceanne Ludwig'] },
  { name: 'Grace Ludwig', shelter: 'tent', w: 10, l: 9, h: 6, doors: 2, opening: 'width', make: 'Coleman 6-Person Instant Cabin Tent', note: null, sharing: ['Aaron Muilenburg'] },
  { name: 'Alex Chojacki', shelter: 'tent', w: 10, l: 10, h: 6.6, doors: 2, opening: 'length', make: 'Kodiak Flex-Bow VX Canvas Camping Tent', note: 'Maybe sharing with Remi, otherwise solo.', sharing: [] },
  { name: 'Allie Shuldman', shelter: 'tent', w: 9, l: 14, h: 7, doors: 2, opening: 'both', make: 'https://www.amazon.com/dp/B00VFH1RQS/', note: null, sharing: ['Fahim Ferdous'] },
  { name: 'Daniel X. Bandong', shelter: 'tent', w: 10, l: 10, h: 6.5, doors: 1, opening: 'width', make: '10 x 10 ft Flex-Bow Deluxe Canvas Camping Tent (Model 6010)', note: null, sharing: [] },
  { name: 'John House', shelter: 'tent', w: 12, l: 14, h: 8, doors: 2, opening: 'width', make: 'Coleman', note: 'External skeleton frame that uses guy ropes for stabilization.', sharing: [] },
  { name: 'Rishi Malhotra', shelter: 'tent', w: 7, l: 10, h: 6, doors: 1, opening: 'length', make: 'Coleman Instant Dome 5 https://www.walmart.com/ip/Coleman-Instant-Dome-5-Person-Signature-Tent/36761589', note: 'We would like to be near or next to Danny Korte.', sharing: ['Jaclyn Holmes'] },
  { name: 'Gail Feldsherova', shelter: 'rv', w: 9, l: 37, h: 11, doors: 2, opening: null, make: 'See Shai Olsher RV (Nomad Solutions).', note: null, sharing: ['Lina Feldsherova', 'Sara He'] },
  { name: 'Tahanna Byatt', shelter: 'tent', w: 10, l: 10, h: 6, doors: 1, opening: 'both', make: 'Coleman 6 person tent', note: 'If possible, would love to be next to friends Gina Montoya and John O\'Keefe / Marie Gilot (Nick and Nora) — travelling from Australia and haven\'t seen them in months.', sharing: [] },
  { name: 'Kit Zellerbach', shelter: 'tent', w: 10, l: 9, h: 6, doors: 1, opening: 'length', make: 'Coleman 6 Person Skydome', note: null, sharing: [] },
  { name: 'Petra Kumi', shelter: 'tent', w: 9, l: 11, h: 6, doors: 1, opening: 'width', make: 'https://www.coreequipment.com/products/6-person-block-out-dome-tent-11-x-9', note: 'Would love to be near Kit Zellerbach or Jacob Kaplan please.', sharing: ['Richard Valente'] },
  { name: 'Levonah Hoffmann', shelter: 'tent', w: 10, l: 10, h: 7, doors: 1, opening: 'length', make: 'Not sure yet', note: 'Receiving tent from a friend; will confirm make/model once seen in person.', sharing: [], newCamper: true },
  { name: 'Ken Huffman', shelter: 'tent', w: 10, l: 10, h: 7, doors: 2, opening: 'width', make: 'Kodiak Deluxe 10x10', note: 'Tent has doors front and back (two parallel entrances); does not need access to both. Has an awning (aware those are not allowed).', sharing: [] },
  { name: 'Kristina Schmidt', shelter: 'tent', w: 10, l: 10, h: 6, doors: 1, opening: 'length', make: 'Coleman 6 person pop up', note: 'Would be nice to be by Kali and David.', sharing: ['Jeff Brown'] },
  { name: 'Emily Gonthier', shelter: 'tent', w: 9, l: 10, h: 9, doors: 1, opening: 'length', make: 'Coleman 6-Person Instant Cabin', note: null, sharing: [] },
];

// Manual name aliases → DB full_name (spreadsheet name : DB full_name)
const NAME_ALIASES = {
  'marc mercury': 'Marc Hamilton Mercury',
  'emily mackenzie': 'Emily Kores MacKenzie',
  'emily gonthier': 'Emily W Gonthier',
  'jacob kaplan': 'Jacob Taylor Kaplan',
  'john keefe': 'John (Nick) Francis Keefe',
  'danny korte': 'Danny Korte',
  'deborah newman': 'Deborah Frances Newman',
  'gary pierre': 'Gary Pierre',
  'joanna tsai': 'Joanna Elizabeth Tsai',
  'erik chan': 'Erik Chan Chi Hein',
  'vivian au': 'Wai Foon Vivian Au',
  'lauren crudele': 'Lauren Crudele',
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
  'alex chojacki': 'Alex Herbert Chojnacki',
  'daniel x bandong': 'Daniel Xavier Zarate Bandong',
  'john house': 'TW John House',
  'kit zellerbach': 'Karitta Christina Zellerbach - but I go by Kit',
  'ken huffman': 'Kenneth Huffman',
  'richard valente': 'Richard Correia Valente',
  'fahim ferdous': 'Fahim Ferdous',
  'jaclyn holmes': 'Jaclyn Holmes',
  'jeff brown': 'Jeffrey Louis Brown',
  'lina feldsherova': 'Lina Feldsherova',
  'sara he': 'Sara He',
  'alaine kiera fredericksen': 'Alaine Kiera Fredericksen (go by Kiera)',
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

function findCamper(name, campers) {
  const alias = NAME_ALIASES[name.toLowerCase()];
  if (alias) {
    const byAlias = campers.find(c => norm(c.full_name) === norm(alias));
    if (byAlias) return byAlias;
  }
  const target = norm(name);
  let hit = campers.find(c => norm(c.full_name) === target);
  if (hit) return hit;
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

  const notFound = [];
  const inserted = [];

  // Pass 1: ensure all entries exist (update or insert), record id map.
  const idByName = new Map();
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
      bringing_vehicle: e.shelter === 'rv' || e.shelter === 'vehicle',
    };

    if (camper) {
      const body = { ...fields, special_requests: mergeNote(camper.special_requests, e.note) };
      console.log(`UPDATE  ${camper.full_name.padEnd(42)} ${e.shelter} ${e.w}x${e.l}x${e.h} doors=${e.doors} open=${e.opening ?? '-'}`);
      if (APPLY) await patchCamper(camper.id, body);
      idByName.set(e.name.toLowerCase(), camper.id);
    } else {
      const newBody = {
        full_name: e.name,
        email: `${norm(e.name).replace(/ /g, '.')}@placeholder.local`,
        arrival_date: '2026-08-25',
        arrival_method: 'car',
        departure_date: '2026-09-01',
        ...fields,
        special_requests: e.note || null,
      };
      console.log(`INSERT  ${e.name.padEnd(42)} ${e.shelter} ${e.w}x${e.l}x${e.h} (NOT AN EXISTING CAMPER)`);
      inserted.push(e.name);
      if (APPLY) {
        const created = await insertCamper(newBody);
        idByName.set(e.name.toLowerCase(), created.id);
        campers.push(created);
      } else {
        idByName.set(e.name.toLowerCase(), `NEW:${e.name}`);
      }
    }
  }

  // Pass 2: wire up tent/RV-sharing relationships (up to 5 partner slots).
  console.log('\n── Tent / RV sharing ──');
  const slotCols = ['sharing_tent_with', 'sharing_tent_with_2', 'sharing_tent_with_3', 'sharing_tent_with_4', 'sharing_tent_with_5'];
  for (const e of ENTRIES) {
    if (!e.sharing || e.sharing.length === 0) continue;
    const selfId = idByName.get(e.name.toLowerCase());
    const partnerIds = [];
    for (const pName of e.sharing) {
      const partner = findCamper(pName, campers);
      if (!partner) {
        console.log(`  !! ${e.name}: partner "${pName}" NOT FOUND — skipped`);
        notFound.push(`${pName} (listed as sharing with ${e.name})`);
        continue;
      }
      partnerIds.push(partner.id);
    }
    if (partnerIds.length === 0) continue;
    if (partnerIds.length > 5) console.log(`  !! ${e.name}: ${partnerIds.length} partners exceeds 5 slots — truncating`);
    const body = {};
    slotCols.forEach((col, i) => { body[col] = partnerIds[i] || null; });
    console.log(`  ${e.name} → [${e.sharing.join(', ')}] (${partnerIds.length} slots)`);
    if (APPLY && typeof selfId === 'string' && !selfId.startsWith('NEW:')) {
      await patchCamper(selfId, body);
    } else if (APPLY && selfId) {
      await patchCamper(selfId, body);
    }
  }

  console.log('\n── Summary ──');
  console.log(`Responses processed: ${ENTRIES.length}`);
  console.log(`Campers NOT already in the roster (inserted / would insert): ${inserted.length ? inserted.join(', ') : 'none'}`);
  if (notFound.length) console.log(`Sharing partners not found in roster: ${notFound.join('; ')}`);
  console.log(`\nDone. ${APPLY ? 'Changes written.' : 'Dry run — re-run with --apply to write.'}`);
})();
