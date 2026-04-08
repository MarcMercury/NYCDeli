// Fix incorrect tent/shelter measurements parsed from CSV
// Compares CSV tent descriptions against current DB values and corrects discrepancies

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hjmqwueengqqubzolycn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function update(email, patch, reason) {
  // Look up by email
  const r = await fetch(`${SUPABASE_URL}/rest/v1/campers?email=eq.${encodeURIComponent(email)}&select=id,full_name`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  const [camper] = await r.json();
  if (!camper) {
    console.log(`  ✗ Not found: ${email}`);
    return false;
  }

  const r2 = await fetch(`${SUPABASE_URL}/rest/v1/campers?id=eq.${camper.id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });

  if (r2.ok) {
    const dims = Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', ');
    console.log(`  ✓ ${camper.full_name}: ${dims}`);
    console.log(`    Reason: ${reason}`);
    return true;
  } else {
    console.log(`  ✗ FAILED: ${camper.full_name}`);
    return false;
  }
}

async function main() {
  console.log('Fixing tent/shelter measurements...\n');
  let fixed = 0;

  // Aaron Sheya: CSV "[No Bake Tent][No Bake Tent v5][18][10][6'6"][2]"
  // DB had: L=20, W=15, H=10 → correct: L=18, W=10, H=6.5
  if (await update('aaronsheya@gmail.com',
    { shelter_length_ft: 18, shelter_width_ft: 10, shelter_height_ft: 6.5 },
    'CSV: No Bake Tent v5, 18x10x6\'6". Was L=20 W=15 H=10')) fixed++;

  // Tatiana Pisetta: CSV "No Bake Tent v5 18x10x6'6" 2"
  // DB had: L=20, W=15, H=10 → correct: L=18, W=10, H=6.5
  if (await update('tatiana.pisetta@gmail.com',
    { shelter_length_ft: 18, shelter_width_ft: 10, shelter_height_ft: 6.5 },
    'CSV: No Bake Tent v5 18x10x6\'6". Was L=20 W=15 H=10')) fixed++;

  // Glenn Zimmerman: CSV "Coleman 4-person tent. 24x9x9 1"
  // DB had: L=20 → correct: L=24
  if (await update('glenn_zimmerman@msn.com',
    { shelter_length_ft: 24 },
    'CSV: 24x9x9. Was L=20')) fixed++;

  // Jacob Taylor Kaplan: CSV "NoBake Tent(?). 10'L x 9'W x 6'8"H. 2 People"
  // DB had: L=20, W=10, H=9 → correct: L=10, W=9, H=6.7 (6'8" ≈ 6.67ft)
  if (await update('qwertey6@gmail.com',
    { shelter_length_ft: 10, shelter_width_ft: 9, shelter_height_ft: 6.7 },
    'CSV: 10\'L x 9\'W x 6\'8"H. Was L=20 W=10 H=9')) fixed++;

  // Thomas Le: CSV "Shiftpod Expedition 10.7 W x 12 L x 6.9 H"
  // DB had: H=10.7 → correct: H=6.9
  if (await update('thomasle43@gmail.com',
    { shelter_height_ft: 6.9 },
    'CSV: 10.7W x 12L x 6.9H. Was H=10.7')) fixed++;

  // Shira Gelfand: CSV "Two People tent - need to buy another"
  // DB had: L=20, W=2 → garbage parse. Use 2-person guidelines: 12.5x10x9.5
  if (await update('sgelfand91@gmail.com',
    { shelter_length_ft: 12.5, shelter_width_ft: 10, shelter_height_ft: 9.5 },
    'CSV: "Two People tent". Was L=20 W=2 (garbage parse). Set to 2-person default')) fixed++;

  // Marc Hamilton Mercury: CSV "EVER ADVANCED Camping Blackout Tent - 14ft x 10ft x 84in"
  // DB had: L=10, W=14, H=10 → L/W swapped, H wrong (84in = 7ft)
  if (await update('marc.h.mercury@gmail.com',
    { shelter_length_ft: 14, shelter_width_ft: 10, shelter_height_ft: 7 },
    'CSV: 14ft x 10ft x 84in (=7ft). Was L=10 W=14 H=10')) fixed++;

  // Sagar Tiwari: CSV "Shift pod 12.5*12.5*6'10*1.5"
  // DB had: H=6 → correct: H=6.8 (6'10" = 6.83ft)
  if (await update('sagart851@gmail.com',
    { shelter_height_ft: 6.8 },
    'CSV: 12.5*12.5*6\'10". Was H=6. 6\'10"=6.83ft')) fixed++;

  // Jessica Mercury: CSV "Same tent!" (shares with Marc → 14x10x7)
  // DB had: L=14, W=10, H=null → just needs H=7
  if (await update('jessica.r.latorre@gmail.com',
    { shelter_height_ft: 7 },
    'Shares tent with Marc Mercury (14x10x84in=7ft). Was H=null')) fixed++;

  console.log(`\nDone: ${fixed} camper records fixed`);
}

main().catch(console.error);
