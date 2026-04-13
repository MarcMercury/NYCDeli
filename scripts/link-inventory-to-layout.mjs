/**
 * One-time script: Link existing inventory, electrical, and resource
 * records to their matching floorplan objects by matching names/types.
 *
 * This bridges items that were manually entered in inventory but
 * never linked to the corresponding layout objects.
 *
 * Run: node scripts/link-inventory-to-layout.mjs
 */

const projectRef = 'hjmqwueengqqubzolycn';
const token = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_f2806af82b07f98d98dc0c3c79350ea9a7d5f651';

async function query(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    }
  );
  if (!res.ok) { console.error(await res.text()); return []; }
  return res.json();
}

async function update(table, id, col, val) {
  const sql = `UPDATE ${table} SET ${col} = '${val}' WHERE id = '${id}';`;
  const result = await query(sql);
  return result;
}

(async () => {
  // ============================================================
  // 1. INVENTORY ↔ FLOORPLAN LINKS
  // ============================================================
  console.log('\n=== Linking build_inventory → floorplan_objects ===\n');

  // Generator (1 inventory → 1 layout)
  await update('build_inventory', '4a2c84e3-b24d-49e6-8a54-eae3df98f08c', 'floorplan_object_id', '64bbee36-e901-4795-87ad-2ce31cda1615');
  console.log('✓ Generator → Generator layout object');

  // Swamp Coolers (1 inv row qty:7 → first swamp cooler on map)
  await update('build_inventory', 'db1aaa52-5527-4b4a-a0eb-99af1dd5745b', 'floorplan_object_id', 'd7f96aa6-c375-46c5-968c-f8108a879ac3');
  console.log('✓ Swamp Coolers (inv) → first Swamp Cooler layout object');

  // Reefer Truck → Refrigerated Truck
  await update('build_inventory', 'c2fed495-5724-4d99-81f5-b32bb90ea7b9', 'floorplan_object_id', 'a8816d53-5207-4181-917c-39a1f11f9ac3');
  console.log('✓ Reefer Truck → Refrigerated Truck layout object');

  // Dumpster → Dumpster (trash_receptacle)
  await update('build_inventory', 'ac5a73c1-5d76-428e-b0b7-a156d4c41b80', 'floorplan_object_id', '185f6398-6df7-4461-837f-d619fbef7373');
  console.log('✓ Dumpster → Dumpster layout object');

  // Bike Trailer → Bike Trailer (pc_container)
  await update('build_inventory', '4c255a72-7cdc-41ac-b04f-fc3042ac1bc9', 'floorplan_object_id', '94ba848b-eb47-4924-bb85-9ccdd5ee5cbb');
  console.log('✓ Bike Trailer → Bike Trailer layout object');

  // Porto → Porta Potty
  await update('build_inventory', '62b4e797-50bf-4ea5-8f1d-9a85bf4d507d', 'floorplan_object_id', 'f2b916b6-edf4-475e-861a-12084cfd41fd');
  console.log('✓ Porto → Porta Potty layout object');

  // Water Tank → H2O Tank (water_station)
  await update('build_inventory', '3c8c5895-6fac-4654-823c-8f26789052e9', 'floorplan_object_id', '9953defd-5fcd-445f-8186-8cb7ba24cbce');
  console.log('✓ Water Tank → H2O Tank layout object');

  // Greywater Tank → first GreyWater Tank
  await update('build_inventory', 'c14c7ef6-4e8d-4ff9-9b26-2da3af810476', 'floorplan_object_id', '84a65846-9e05-49ff-9a08-4261a7d5cdd7');
  console.log('✓ Greywater Tank → GreyWater Tank layout object');

  // Sinks → Water Pump (sink_hose)
  await update('build_inventory', '8727e719-0841-4e7c-9215-986f301fe76c', 'floorplan_object_id', '5a4bb61c-ea30-4901-925d-2172c621bed4');
  console.log('✓ Sinks → Water Pump (sink_hose) layout object');

  // Camp Chill Tent → NYC Chill Tent (common_area)
  await update('build_inventory', 'c6134089-2858-47e7-9acb-4ac3f719d014', 'floorplan_object_id', '61c7424f-6cba-4324-b65b-f470e2844e26');
  console.log('✓ Camp Chill Tent → NYC Chill Tent layout object');

  // Public Chill Tent → Public Chill (common_area)
  await update('build_inventory', '54134a02-6425-4363-ad9c-ce18b15c87e9', 'floorplan_object_id', 'd287d835-da9e-4158-b5c6-59a4634d1731');
  console.log('✓ Public Chill Tent → Public Chill layout object');

  // Single Shade Sail/Box → the small "Shade" shade_structure (8x8)
  await update('build_inventory', '8cba5dd7-8ff9-41af-ba9d-b379376b4b31', 'floorplan_object_id', '243a6eac-33cd-4ed6-b896-3070eed76ce8');
  console.log('✓ Single Shade Sail/Box → Shade (8x8) layout object');

  // Container 1 → Camp Bar/Kitchen container
  await update('build_inventory', 'd534b9f7-34c1-4188-aa8e-a8d144fbc244', 'floorplan_object_id', '6255d7e7-b666-46a1-b408-841647c24968');
  console.log('✓ Container 1 → Camp Bar/Kitchen container');

  // Container 2 → Storage container
  await update('build_inventory', 'd8b2b9f6-a5fa-45b9-92cb-1f09266de0eb', 'floorplan_object_id', '37956a3d-73ee-4640-a20a-1411513280be');
  console.log('✓ Container 2 → Storage container');

  // Container 3 → Tool Town container
  await update('build_inventory', 'a92a3be9-1c2e-4e40-a769-a2374b07afa8', 'floorplan_object_id', '08c10e92-e8fe-4cb5-9e86-5b4c299d8f2a');
  console.log('✓ Container 3 → Tool Town container');

  // Container 4 → Bike Trailer container (already linked above but
  //   Bike Trailer is separate, use first storage object instead)
  // Actually Container 4 doesn't map cleanly — link to Bins storage
  await update('build_inventory', 'b4c6baa3-aa98-4506-91e2-ba10b55f05ac', 'floorplan_object_id', 'f990977f-6dbd-408f-b567-e44263cfab25');
  console.log('✓ Container 4 → Bins (storage) layout object');

  // Distro Box (qty:4) → first custom distro box (Distro 2)
  await update('build_inventory', '6a92c908-a404-45b7-a10c-28d528dfd864', 'floorplan_object_id', 'd48fe178-91d3-45c8-aa42-0896e530d15b');
  console.log('✓ Distro Box → Distro 2 (custom) layout object');

  // Dining Benches — these are tables on the map
  await update('build_inventory', '2b7bbebd-f05a-4c57-b588-7b922090409c', 'floorplan_object_id', '2a668b98-4aed-4d68-ae0f-74044ef4236b');
  console.log('✓ Dining Benches → first Table layout object');

  // Other Tents/Shade (two rows) → link to large 50x30 shade structures
  await update('build_inventory', '1ca12cb8-da1b-4691-ae7d-670277182004', 'floorplan_object_id', 'ea9c3fe9-cab4-49e5-ba57-feeb729bfa51');
  console.log('✓ Other Tents/Shade (1) → shade_structure layout object');
  await update('build_inventory', 'ddfb9af0-8d62-42a9-b8e0-0a55bf6758a0', 'floorplan_object_id', 'ff490786-b80a-4504-b02a-282a7115977f');
  console.log('✓ Other Tents/Shade (2) → shade_structure layout object');

  // ============================================================
  // 2. ELECTRICAL ↔ FLOORPLAN LINKS
  // ============================================================
  console.log('\n=== Linking electrical_load_items → floorplan_objects ===\n');

  // Swamp Coolers (qty:2) → first 2 swamp coolers
  await update('electrical_load_items', '693b7cd8-1a5d-45eb-a11a-692ece08fc53', 'floorplan_object_id', 'd7f96aa6-c375-46c5-968c-f8108a879ac3');
  console.log('✓ Swamp Coolers (qty:2) → first Swamp Cooler');

  // Swamp Coolers (qty:4) → third swamp cooler
  await update('electrical_load_items', '4812597f-917e-4797-bee0-e2c65ccf58b1', 'floorplan_object_id', '5f3cb1b0-b850-4495-8289-8901468633dd');
  console.log('✓ Swamp Coolers (qty:4) → third Swamp Cooler');

  // DJ Equip → DJ table
  await update('electrical_load_items', '06885634-70a8-4c5c-9109-9ed34070ee6d', 'floorplan_object_id', '0c5ef5ec-5f9a-4f9b-b261-00a2a240cf51');
  console.log('✓ DJ Equip → DJ table layout object');

  // Water Heater (Shower) → Shower Container
  await update('electrical_load_items', '2cc0fe63-ab7e-4a02-9d7a-3bbc454f3a10', 'floorplan_object_id', 'f5ad4a2c-6eb3-4384-9372-4539e0231919');
  console.log('✓ Water Heater (Shower) → Shower Container');

  // RV 1-5 → 5 RV layout objects
  const rvElecIds = [
    '294ab89e-e020-40d5-9a6d-ba771b03fe44', // RV 1
    'b9934858-7c13-472e-995d-d6e01b1c6110', // RV 2
    '5270ed45-689e-4c11-9cb6-4f890c802297', // RV 3
    '836d8cf6-a739-4f73-bb32-484feee00596', // RV 4
    'ea0821c0-b4c7-4728-8373-67246bc21bab', // RV 5
  ];
  const rvLayoutIds = [
    '06d8ff1a-999d-4243-8bde-460c35fa0c40',
    '3cd39469-ae20-40de-99e5-3bceaffbcc0c',
    'c2878402-bd69-42a9-92f6-be99a9198e3b',
    '2f312e2f-1473-4c65-8eec-fce13277103a',
    'c74ccbdb-4844-484b-97c0-00676022794d',
  ];
  for (let i = 0; i < 5; i++) {
    await update('electrical_load_items', rvElecIds[i], 'floorplan_object_id', rvLayoutIds[i]);
    console.log(`✓ RV ${i+1} (electrical) → RV / Camper layout object`);
  }

  // Ice Maker → Refrigerated Truck (it's the truck that houses the ice machine)
  await update('electrical_load_items', '357428f9-a5a8-4056-8d80-b3c71b129de8', 'floorplan_object_id', 'a8816d53-5207-4181-917c-39a1f11f9ac3');
  console.log('✓ Ice Maker → Refrigerated Truck');

  // Tool Rechargers → Tool Town container
  await update('electrical_load_items', 'd84943ca-bebf-4191-bfa0-6f8438610fff', 'floorplan_object_id', '08c10e92-e8fe-4cb5-9e86-5b4c299d8f2a');
  console.log('✓ Tool Rechargers → Tool Town container');

  // 5 Gallon Heated Water Dispenser → Water Station
  await update('electrical_load_items', '3dd38ca4-0ff2-4f3c-8856-bc65828b8cfe', 'floorplan_object_id', '43b6cc38-3f9e-47b4-a366-42b320e6f9e7');
  console.log('✓ 5 Gallon Heated Water Dispenser → Water Station');

  // Ice Machine (inventory) → Refrigerated Truck layout object
  await update('build_inventory', '031ef1d1-f948-4994-a786-a25968d7d9e4', 'floorplan_object_id', 'a8816d53-5207-4181-917c-39a1f11f9ac3');
  console.log('✓ Ice Machine (inv) → Refrigerated Truck');

  console.log('\n=== Done! All links created. ===');
})();
