import { readFileSync } from 'fs';
const txt = readFileSync('src/lib/base-packing-list.ts', 'utf-8');
const entryRe = /\{\s*category:\s*'((?:[^'\\]|\\.)*)',\s*item:\s*'((?:[^'\\]|\\.)*)'/g;
const seen = {};
let m;
while ((m = entryRe.exec(txt))) {
  const cat = m[1].replace(/\\'/g, "'").trim();
  const item = m[2].replace(/\\'/g, "'").trim();
  const key = item.toLowerCase();
  (seen[key] = seen[key] || []).push(cat);
}
const dups = Object.entries(seen).filter(([, cats]) => cats.length > 1);
if (!dups.length) {
  console.log('No duplicate item names in base list.');
} else {
  console.log('Duplicate item names in base list:');
  for (const [item, cats] of dups) console.log(`  x${cats.length}  "${item}"  in ${JSON.stringify(cats)}`);
}
