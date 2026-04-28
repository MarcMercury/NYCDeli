/**
 * Background test of the auto-draft pipeline.
 *
 * SAFETY:
 *   - Creates a TEST draft with a unique name; cleans it up at the end (DELETE
 *     cascades through all draft-scoped tables).
 *   - Does NOT modify campers, profiles, kitchen_shifts, or schedule_assignments.
 *   - Reads `arrival_date` / `departure_date` / `id` from existing campers
 *     (read-only).
 *
 * Pipeline tested:
 *   1. create draft  →  2. seed offerings (default catalog)
 *   3. populate draft order for ALL existing campers
 *   4. generate up to 50 random rankings per camper
 *   5. freeze rankings  →  6. run_auto_draft (real run, but inside test draft)
 *   7. inspect assignments + diagnose schedule-page rendering
 *   8. DELETE test draft (cascades)
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
try {
  const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"\n\r]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* ok */ }

const projectRef = 'hjmqwueengqqubzolycn';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

async function sql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SQL ${res.status}: ${text}\n--- query ---\n${query.slice(0, 500)}`);
  }
  try { return JSON.parse(text); } catch { return text; }
}

const TEST_NAME = `__autotest_${Date.now()}`;

// Wrap everything in one big SQL block so it runs in a single tx and we get
// stable cleanup. We use set_config to impersonate an existing admin so the
// SECURITY DEFINER functions (_is_admin) accept us.
async function run() {
  console.log('🧪 Auto-draft sandbox test starting...');

  // 1. Find an admin
  const adminRows = await sql(
    `SELECT id, email FROM user_profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1;`
  );
  if (!Array.isArray(adminRows) || adminRows.length === 0) {
    throw new Error('No admin user found in user_profiles');
  }
  const admin = adminRows[0];
  console.log(`   admin context: ${admin.email} (${admin.id})`);

  // 2. Headcount
  const camperRows = await sql(
    `SELECT id, full_name, arrival_date, departure_date FROM campers
       WHERE arrival_date IS NOT NULL AND departure_date IS NOT NULL
       ORDER BY full_name;`
  );
  console.log(`   campers eligible: ${camperRows.length}`);
  if (camperRows.length === 0) {
    throw new Error('No campers with arrival_date/departure_date set; cannot run draft.');
  }

  // 3. Run the whole sandbox in one tx
  const camperIds = camperRows.map((c) => `'${c.id}'`).join(',');
  const block = `
DO $$
DECLARE
  v_admin UUID := '${admin.id}';
  v_draft_id UUID;
  v_offering_count INTEGER;
  v_rank_count INTEGER;
BEGIN
  -- Impersonate admin for the duration of this tx
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin::text)::text, true);

  -- 1. Create test draft
  INSERT INTO shift_drafts (name, status, created_by, deli_quota, special_quota, strike_quota, snake_start_round)
  VALUES ('${TEST_NAME}', 'open', v_admin, 4, 0, 1, 3)
  RETURNING id INTO v_draft_id;
  RAISE NOTICE 'draft_id=%', v_draft_id;

  -- 2. Seed default offerings (canonical catalog)
  PERFORM seed_default_shift_offerings(v_draft_id);
  SELECT COUNT(*) INTO v_offering_count FROM shift_offerings WHERE draft_id = v_draft_id;
  RAISE NOTICE 'offerings_seeded=%', v_offering_count;

  -- 3. Draft order: all eligible campers in random order
  INSERT INTO shift_draft_order (draft_id, camper_id, draft_position)
  SELECT v_draft_id, c.id,
         ROW_NUMBER() OVER (ORDER BY random())
    FROM campers c
   WHERE c.id IN (${camperIds});

  -- 4. Generate up to 50 rankings per camper.
  --    Pick offerings whose day_date falls within camper.arrival..departure.
  WITH eligible AS (
    SELECT o.draft_id, c.id AS camper_id, o.id AS offering_id,
           ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY random()) AS rk
      FROM campers c
      JOIN shift_offerings o ON o.draft_id = v_draft_id
       AND (o.day_date IS NULL OR (o.day_date >= c.arrival_date AND o.day_date <= c.departure_date))
     WHERE c.id IN (${camperIds})
  )
  INSERT INTO shift_draft_rankings (draft_id, camper_id, offering_id, rank)
  SELECT v_draft_id, camper_id, offering_id, rk
    FROM eligible
   WHERE rk <= 50;
  SELECT COUNT(*) INTO v_rank_count FROM shift_draft_rankings WHERE draft_id = v_draft_id;
  RAISE NOTICE 'rankings_inserted=%', v_rank_count;

  -- 5. Freeze
  PERFORM freeze_draft_rankings(v_draft_id);

  -- 6. Run the draft (real; assignments persist in TEST draft only)
  PERFORM run_auto_draft(v_draft_id, 12345, FALSE);

  -- Stash for inspection
  CREATE TEMP TABLE _last_test_draft (id UUID) ON COMMIT DROP;
  INSERT INTO _last_test_draft VALUES (v_draft_id);

  -- Persist id in a settings row so the next round-trip query can find it
  INSERT INTO system_settings (key, value)
  VALUES ('__autotest_draft_id', v_draft_id::text)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
END $$;
SELECT value AS draft_id FROM system_settings WHERE key = '__autotest_draft_id';
  `;

  const result = await sql(block);
  const draftId = Array.isArray(result) && result[0]?.draft_id;
  if (!draftId) throw new Error('Could not retrieve test draft id');
  console.log(`   test draft id: ${draftId}`);

  // 4. Inspect — assignments per camper
  const assignmentSummary = await sql(`
    SELECT a.camper_id, c.full_name, COUNT(*) AS shift_count,
           SUM(CASE WHEN o.pool = 'deli' THEN 1 ELSE 0 END) AS deli,
           SUM(CASE WHEN o.pool = 'special' THEN 1 ELSE 0 END) AS special,
           SUM(CASE WHEN o.pool = 'strike' THEN 1 ELSE 0 END) AS strike
      FROM shift_draft_assignments a
      JOIN campers c ON c.id = a.camper_id
      JOIN shift_offerings o ON o.id = a.offering_id
     WHERE a.draft_id = '${draftId}'
     GROUP BY a.camper_id, c.full_name
     ORDER BY shift_count DESC, c.full_name;
  `);

  const totalAssignments = await sql(
    `SELECT COUNT(*) AS n FROM shift_draft_assignments WHERE draft_id = '${draftId}';`
  );
  console.log(`\n📊 RESULTS`);
  console.log(`   total assignments: ${totalAssignments[0].n}`);
  console.log(`   campers with at least 1 assignment: ${assignmentSummary.length}`);
  if (assignmentSummary.length > 0) {
    console.log(`   sample (top 8):`);
    for (const r of assignmentSummary.slice(0, 8)) {
      console.log(
        `     ${r.full_name.padEnd(25)} → ${r.shift_count} shifts (deli=${r.deli} special=${r.special} strike=${r.strike})`
      );
    }
  }

  // Pool fill check
  const poolFill = await sql(`
    SELECT o.pool, COUNT(*) AS filled, SUM(o.capacity) FILTER (
      WHERE o.id NOT IN (SELECT offering_id FROM shift_draft_assignments WHERE draft_id='${draftId}')
    ) AS unfilled_capacity
      FROM shift_draft_assignments a
      JOIN shift_offerings o ON o.id = a.offering_id
     WHERE a.draft_id = '${draftId}'
     GROUP BY o.pool;
  `);
  console.log(`   pool fill:`);
  for (const r of poolFill) {
    console.log(`     ${r.pool}: ${r.filled} slots filled`);
  }

  // 5. THE BIG QUESTION — do these assignments show up on profile/schedule pages?
  console.log(`\n🔎 SCHEDULE-PAGE BRIDGE CHECK (pre-publish)`);
  const preBridge = await sql(`
    SELECT COUNT(*) AS n FROM schedule_assignments sa
     WHERE sa.camper_id IN (SELECT camper_id FROM shift_draft_assignments WHERE draft_id='${draftId}')
       AND sa.shift_id IN (
         SELECT ks.id FROM kitchen_shifts ks
          WHERE ks.date IN (SELECT day_date FROM shift_offerings WHERE draft_id='${draftId}' AND day_date IS NOT NULL)
       );
  `);
  console.log(`   schedule_assignments rows for these campers on draft dates: ${preBridge[0].n}`);

  // 5b. Snapshot schedule_assignments BEFORE publish (so we can clean up exactly what we added)
  const beforeIds = await sql(`SELECT id FROM schedule_assignments;`);
  const beforeIdSet = new Set(beforeIds.map((r) => r.id));
  const beforeShiftIds = await sql(`SELECT id FROM kitchen_shifts;`);
  const beforeShiftSet = new Set(beforeShiftIds.map((r) => r.id));
  const beforeRoleIds = await sql(`SELECT id FROM kitchen_roles;`);
  const beforeRoleSet = new Set(beforeRoleIds.map((r) => r.id));

  // 5c. PUBLISH (still impersonating admin)
  console.log(`\n🚀 Publishing test draft (materializing kitchen_shifts + schedule_assignments)...`);
  await sql(`
    DO $$
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub','${admin.id}')::text, true);
      PERFORM publish_draft('${draftId}'::uuid);
    END $$;
  `);

  // 5d. Re-check the bridge
  const postBridge = await sql(`
    SELECT COUNT(*) AS n FROM schedule_assignments sa
     WHERE sa.camper_id IN (SELECT DISTINCT camper_id FROM shift_draft_assignments WHERE draft_id='${draftId}')
       AND sa.shift_id IN (
         SELECT ks.id FROM kitchen_shifts ks
          JOIN shift_offerings o ON o.published_shift_id = ks.id
          WHERE o.draft_id='${draftId}'
       );
  `);
  console.log(`   schedule_assignments rows now backing this draft: ${postBridge[0].n}`);

  // Per-camper sample showing how profile page would render
  const sampleCamper = await sql(`
    SELECT c.full_name,
           (SELECT COUNT(*) FROM schedule_assignments sa
              JOIN kitchen_shifts ks ON ks.id = sa.shift_id
              JOIN shift_offerings o ON o.published_shift_id = ks.id
             WHERE sa.camper_id = c.id AND o.draft_id = '${draftId}') AS shifts_visible
      FROM campers c
     WHERE c.id IN (SELECT DISTINCT camper_id FROM shift_draft_assignments WHERE draft_id='${draftId}')
     ORDER BY c.full_name
     LIMIT 6;
  `);
  console.log(`   profile page shifts_visible per camper (sample):`);
  for (const r of sampleCamper) {
    console.log(`     ${r.full_name.padEnd(28)} ${r.shifts_visible}`);
  }

  // Show one camper's actual rendered rows (what their /profile #my-schedule will see)
  const oneCamper = sampleCamper[0]?.full_name;
  if (oneCamper) {
    const rendered = await sql(`
      SELECT kr.name AS role, ks.date, ks.start_time, ks.end_time, sa.status
        FROM schedule_assignments sa
        JOIN kitchen_shifts ks ON ks.id = sa.shift_id
        JOIN kitchen_roles kr ON kr.id = ks.role_id
        JOIN campers c ON c.id = sa.camper_id
       WHERE c.full_name = '${oneCamper.replace(/'/g, "''")}'
         AND ks.id IN (SELECT published_shift_id FROM shift_offerings WHERE draft_id='${draftId}' AND published_shift_id IS NOT NULL)
       ORDER BY ks.date, ks.start_time;
    `);
    console.log(`\n   📅 Rendered schedule for "${oneCamper}":`);
    for (const r of rendered) {
      console.log(`     ${r.date}  ${r.start_time}–${r.end_time}  ${r.role}  [${r.status}]`);
    }
  }

  // 6. Cleanup — delete schedule_assignments + kitchen_shifts + kitchen_roles created by this test,
  //    then delete the test draft (cascades through draft tables).
  const sinceCleanup = await sql(`
    WITH new_shift_ids AS (
      SELECT DISTINCT ks.id FROM kitchen_shifts ks
       WHERE ks.id IN (SELECT published_shift_id FROM shift_offerings WHERE draft_id='${draftId}' AND published_shift_id IS NOT NULL)
    )
    SELECT
      (SELECT COUNT(*) FROM schedule_assignments WHERE shift_id IN (SELECT id FROM new_shift_ids)) AS sched_to_remove,
      (SELECT COUNT(*) FROM new_shift_ids) AS shifts_to_remove;
  `);
  console.log(
    `\n🧹 Cleanup will remove: ${sinceCleanup[0].sched_to_remove} schedule_assignments, ${sinceCleanup[0].shifts_to_remove} kitchen_shifts.`
  );

  // Delete in reverse dependency order. Roles created by us are any rolescurrentcount minus snapshot.
  await sql(`
    DELETE FROM schedule_assignments
     WHERE shift_id IN (
       SELECT published_shift_id FROM shift_offerings WHERE draft_id='${draftId}' AND published_shift_id IS NOT NULL
     );
    DELETE FROM kitchen_shifts
     WHERE id IN (
       SELECT published_shift_id FROM shift_offerings WHERE draft_id='${draftId}' AND published_shift_id IS NOT NULL
     );
  `);

  // Remove kitchen_roles that didn't exist before AND have no remaining shifts.
  const roleIdList = [...beforeRoleSet].map((id) => `'${id}'`).join(',') || `'00000000-0000-0000-0000-000000000000'`;
  await sql(`
    DELETE FROM kitchen_roles
     WHERE id NOT IN (${roleIdList})
       AND NOT EXISTS (SELECT 1 FROM kitchen_shifts ks WHERE ks.role_id = kitchen_roles.id);
  `);

  // Finally delete the draft (cascades shift_offerings, draft_order, rankings, draft_assignments)
  await sql(`
    DELETE FROM shift_drafts WHERE name = '${TEST_NAME}';
    DELETE FROM system_settings WHERE key IN ('__autotest_draft_id','last_published_draft_id');
  `);
  console.log(`   ✓ test draft "${TEST_NAME}" and all derived rows removed.`);

  // Sanity: verify no leakage
  const leak = await sql(`
    SELECT
      (SELECT COUNT(*) FROM schedule_assignments) AS sched,
      (SELECT COUNT(*) FROM kitchen_shifts) AS shifts,
      (SELECT COUNT(*) FROM kitchen_roles) AS roles;
  `);
  console.log(
    `   post-cleanup totals: schedule_assignments=${leak[0].sched}, kitchen_shifts=${leak[0].shifts}, kitchen_roles=${leak[0].roles}`
  );

  console.log(`\n✅ Test complete.`);
}

run().catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  // Attempt cleanup even on failure
  sql(
    `DELETE FROM shift_drafts WHERE name = '${TEST_NAME}';
     DELETE FROM system_settings WHERE key = '__autotest_draft_id';`
  ).catch(() => {});
  process.exit(1);
});
