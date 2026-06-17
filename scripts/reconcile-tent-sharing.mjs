// Reconcile tent-sharing links from the new "Deli MM version (1)" list so the
// tent generator (src/lib/tent-needs.ts computeTentNeeds) groups campers
// correctly. Mirrors the production union-find + the existing fuzzy matcher
// in scripts/set-tent-sharing.mjs.
//
// Non-destructive: only ADDS missing links. Never overwrites or removes an
// existing link. Pairs are made consistent in both directions; 3-person
// groups use slot 2. Reports already-linked, newly-linked, and unmatched.
//
// Flags: --apply to write changes (default is dry-run analysis).
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(__dirname, '..', '.env.local'), 'utf-8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes('--apply');

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

const SKIP_PATTERNS = [
  /^no[.,!]?$/i, /^nope/i, /^n\/a/i, /^none/i, /^na$/i, /^n$/i,
  /^just me/i, /^only me/i, /^heck no/i, /^probably not/i,
  /^i may bring/i, /we are discussing/i, /party of six/i, /^me and my friend/i,
];

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

function extractCandidate(sharingText) {
  for (const pat of SKIP_PATTERNS) if (pat.test(sharingText.trim())) return null;
  let c = sharingText
    .replace(/^yes[,!.\s]*/i, '')
    .replace(/^sharing a tent with\s*/i, '')
    .replace(/^with\s*/i, '')
    .replace(/^my (wife|husband|partner|friend|spouse)[,.\s]*/i, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[-–].*$/, '')
    .replace(/[.,]?\s*(separate|individual|he |she |they |will |has |who |a friend|spouse|over \d).*$/i, '')
    .replace(/[.,!]+$/, '')
    .trim();
  if (!c || c.length < 3) return null;
  return c;
}

function findMatch(candidate, campers, selfId) {
  const nc = normalize(candidate);
  // exact
  for (const c of campers) { if (c.id === selfId) continue; if (normalize(c.full_name) === nc) return c; }
  // first+last
  for (const c of campers) {
    if (c.id === selfId) continue;
    const parts = nc.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      const cp = normalize(c.full_name).split(' ').filter(Boolean);
      const [f, l] = [parts[0], parts[parts.length - 1]];
      const [cf, cl] = [cp[0], cp[cp.length - 1]];
      if ((cf === f && cl === l) || (cf === l && cl === f)) return c;
    }
  }
  // playa name
  for (const c of campers) { if (c.id === selfId) continue; if (c.playa_name && normalize(c.playa_name) === nc) return c; }
  // partial / contains
  for (const c of campers) {
    if (c.id === selfId) continue;
    const nf = normalize(c.full_name);
    if (nf.includes(nc) || nc.includes(nf)) return c;
    const cp = nf.split(' ').filter(Boolean);
    if (cp.length >= 2) {
      const fl = `${cp[0]} ${cp[cp.length - 1]}`;
      if (fl === nc || nc.includes(fl)) return c;
    }
    if (c.playa_name && (normalize(c.playa_name).includes(nc) || nc.includes(normalize(c.playa_name)))) return c;
  }
  // unique last-name fallback
  const cparts = nc.split(' ').filter(Boolean);
  const last = cparts[cparts.length - 1];
  if (last && last.length >= 4) {
    const ms = campers.filter(c => {
      if (c.id === selfId) return false;
      const cp = normalize(c.full_name).split(' ').filter(Boolean);
      return cp[cp.length - 1] === last;
    });
    if (ms.length === 1) return ms[0];
  }
  return null;
}

// --- union-find (mirrors src/lib/union-find.ts) ---
class UnionFind {
  parent = new Map();
  add(id) { if (!this.parent.has(id)) this.parent.set(id, id); }
  has(id) { return this.parent.has(id); }
  find(id) { let c = id; while (this.parent.get(c) !== c) c = this.parent.get(c); let w = id; while (this.parent.get(w) !== c) { const n = this.parent.get(w); this.parent.set(w, c); w = n; } return c; }
  union(a, b) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.parent.set(ra, rb); }
}
function buildGroups(rows) {
  const uf = new UnionFind();
  for (const r of rows) uf.add(r.id);
  for (const r of rows) for (const p of [r.sharing_tent_with, r.sharing_tent_with_2]) if (p && uf.has(p)) uf.union(r.id, p);
  return uf;
}

async function patchCamper(id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/campers?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function main() {
  const rows = parseCSV(readFileSync(join(__dirname, '..', 'public', 'Files', 'Deli_MM_version_1.csv'), 'utf-8'));
  const dataRows = rows.slice(1).filter(r => r[1] && r[1].trim());

  const campers = await fetch(`${SUPABASE_URL}/rest/v1/campers?select=id,email,full_name,playa_name,sharing_tent_with,sharing_tent_with_2,shelter_type&order=full_name`, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
  }).then(r => r.json());
  const byId = new Map(campers.map(c => [c.id, c]));
  const byEmail = new Map(campers.map(c => [c.email.toLowerCase(), c]));
  const name = (id) => byId.get(id)?.full_name || '??';

  // mutable working copy of links
  const slot1 = new Map(campers.map(c => [c.id, c.sharing_tent_with]));
  const slot2 = new Map(campers.map(c => [c.id, c.sharing_tent_with_2]));

  const uf = buildGroups(campers);
  const sameGroup = (a, b) => uf.find(a) === uf.find(b);

  const desiredPairs = []; // {selfId, mateId, raw}
  const unmatched = [];

  for (const r of dataRows) {
    const email = (r[1] || '').trim().toLowerCase();
    const raw = (r[22] || '').trim();
    if (!raw) continue;
    const self = byEmail.get(email);
    if (!self) continue;
    const candidate = extractCandidate(raw);
    if (!candidate) continue; // skip "No"/"N/A"/etc.
    const match = findMatch(candidate, campers, self.id);
    if (match) desiredPairs.push({ selfId: self.id, mateId: match.id, raw });
    else unmatched.push({ name: self.full_name, raw, candidate });
  }

  // Dedupe symmetric pairs
  const seen = new Set();
  const uniquePairs = [];
  for (const p of desiredPairs) {
    const key = [p.selfId, p.mateId].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    uniquePairs.push(p);
  }

  const already = [];
  const toLink = [];
  for (const p of uniquePairs) {
    if (sameGroup(p.selfId, p.mateId)) already.push(p);
    else toLink.push(p);
  }

  console.log('═══════ TENT-SHARING RECONCILE ═══════');
  console.log(`Sharing answers parsed → matched pairs: ${uniquePairs.length}`);
  console.log(`  ✅ already linked (same tent group): ${already.length}`);
  console.log(`  ➕ missing links to create: ${toLink.length}`);
  console.log(`  ❓ unmatched / ambiguous: ${unmatched.length}`);

  if (toLink.length) {
    console.log('\n── Missing links to create ──');
    for (const p of toLink) console.log(`  ${name(p.selfId)} ↔ ${name(p.mateId)}   ["${p.raw}"]`);
  }
  if (unmatched.length) {
    console.log('\n── Unmatched (need manual review) ──');
    for (const u of unmatched) console.log(`  ${u.name}: "${u.raw}"  → candidate="${u.candidate}"`);
  }

  // Helper: place a link from a→b using a free slot; keep union-find updated
  function addLink(aId, bId) {
    // find free slot on a (not already pointing at b)
    if (slot1.get(aId) === bId || slot2.get(aId) === bId) return true;
    if (!slot1.get(aId)) { slot1.set(aId, bId); return 'slot1'; }
    if (!slot2.get(aId)) { slot2.set(aId, bId); return 'slot2'; }
    return false; // both slots full
  }

  if (APPLY && toLink.length) {
    console.log('\n── Applying ──');
    for (const p of toLink) {
      // Try to set link on whichever side has a free slot
      let placed = addLink(p.selfId, p.mateId);
      let writeId = p.selfId, slotKind = placed;
      if (!placed) {
        placed = addLink(p.mateId, p.selfId);
        writeId = p.mateId; slotKind = placed;
      }
      if (!placed) {
        console.log(`  ⚠️  ${name(p.selfId)} ↔ ${name(p.mateId)}: both slots full, skipped`);
        continue;
      }
      const col = slotKind === 'slot2' ? 'sharing_tent_with_2' : 'sharing_tent_with';
      const ok = await patchCamper(writeId, { [col]: writeId === p.selfId ? p.mateId : p.selfId });
      if (ok) {
        uf.union(p.selfId, p.mateId);
        console.log(`  ✓ ${name(writeId)}.${col} → ${name(writeId === p.selfId ? p.mateId : p.selfId)}`);
      } else {
        console.log(`  ✗ failed: ${name(p.selfId)} ↔ ${name(p.mateId)}`);
      }
    }
  } else if (toLink.length) {
    console.log('\n(DRY RUN — pass --apply to write these links)');
  } else {
    console.log('\n✅ All sharing answers already reflected in tent groups — nothing to apply.');
  }

  // Report resulting tent groups (what the generator will produce)
  const finalRows = campers.map(c => ({ id: c.id, sharing_tent_with: slot1.get(c.id), sharing_tent_with_2: slot2.get(c.id) }));
  const fg = buildGroups(finalRows);
  const groups = new Map();
  for (const c of campers) { const root = fg.find(c.id); (groups.get(root) || groups.set(root, []).get(root)).push(c.full_name); }
  const multi = [...groups.values()].filter(g => g.length > 1);
  console.log(`\n═══════ RESULTING TENT GROUPS ═══════`);
  console.log(`Total tents: ${groups.size}  (shared: ${multi.length}, solo: ${groups.size - multi.length})`);
  for (const g of multi.sort((a, b) => b.length - a.length)) console.log(`  [${g.length}] ${g.join(' & ')}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
